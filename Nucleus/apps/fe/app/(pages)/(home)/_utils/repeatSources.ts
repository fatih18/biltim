import {
  BY_ID,
  readAllPages,
  readByIds,
  type Condition,
  type ListRow,
  type PageRequest,
  type PageStarter,
} from '@/app/_utils/readAllPages'
import { dayKey } from './doneDayPlacement'

/**
 * The plans that are read only to be repeated under the day they were done (R43).
 *
 * A tab holds one page of plans (fifty, by planned date). An audit planned long
 * before it was done has its plan outside that page, so the page alone can never
 * list it under its done day. The days of the page are known, though: read the
 * audits whose `audit_date` falls inside them, and fetch the plans of the ones
 * the page does not hold. Those plans are repeat sources only (`placeByDay`):
 * they are never rows of the tab, and never part of its counts.
 *
 * Scope stays the tab's own. The plans are read with the very conditions the
 * tab's query carries (status of the tab, whose plans this person may see), so
 * an audit that is somebody else's, or belongs to another tab, brings nothing.
 * The audits are read for their id and day only.
 */

export type DayRange = { from: string; to: string }

/**
 * A condition of the tab's plan query: a plain one, or an `or` / `and` group of
 * them. The scope of an auditor is such a group (their teams OR their locations).
 */
export type TabCondition = Condition | { operator: 'or' | 'and'; value: readonly TabCondition[] }

/** The plan list action, which takes the tab's conditions with their groups. */
export type PlanStarter = (
  request: Omit<PageRequest, 'payload'> & {
    payload: Omit<PageRequest['payload'], 'filters'> & { filters?: readonly TabCondition[] }
  }
) => void

/**
 * The plan action with the tab's conditions put in front of every request, so
 * the shared readers (paging, ids in groups) work on top of the tab's scope
 * without knowing it.
 */
function withinTab(start: PlanStarter, tabFilters: readonly TabCondition[]): PageStarter {
  return (request) =>
    start({
      ...request,
      payload: { ...request.payload, filters: [...tabFilters, ...(request.payload.filters ?? [])] },
    })
}

/** The first and the last day among these dates; null when none of them is a day. */
export function dayRangeOf(dates: readonly (string | null | undefined)[]): DayRange | null {
  const days = dates.map((date) => dayKey(date)).filter((day) => day !== '')
  days.sort()
  const from = days[0]
  const to = days[days.length - 1]
  return from === undefined || to === undefined ? null : { from, to }
}

/** The day after `day`, as `YYYY-AA-GG`. Calendar arithmetic in UTC, so no zone moves it. */
export function nextDay(day: string): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!parts) return ''
  return new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]) + 1)).toISOString().slice(0, 10)
}

/**
 * The range to read repeat sources for, or null when there is nothing to find.
 *
 * Nothing when the page holds every plan of the tab (`total` is the tab's own
 * count): no plan can be outside it. An unknown total reads, to be safe.
 */
export function repeatReadRange(plans: readonly { planned_date: string }[], total: number | null): DayRange | null {
  if (total !== null && total <= plans.length) return null
  return dayRangeOf(plans.map((plan) => plan.planned_date))
}

/**
 * The audits done inside the range. `audit_date` is a timestamp, so the last day
 * is "before the day after it": a finding at 14:00 on the last day is inside.
 */
export function auditRangeFilters(range: DayRange): Condition[] {
  return [
    { field: 'audit_date', operator: 'gte', value: range.from },
    { field: 'audit_date', operator: 'lt', value: nextDay(range.to) },
  ]
}

/** Audit id to the day it was done, for the audits whose day is readable. */
export function auditDaysOf(audits: readonly ListRow[]): Record<string, string> {
  const days: Record<string, string> = {}
  for (const audit of audits) {
    const id = typeof audit.id === 'string' ? audit.id : ''
    const day = typeof audit.audit_date === 'string' ? dayKey(audit.audit_date) : ''
    if (id && day) days[id] = day
  }
  return days
}

export type RepeatFound = {
  /** The plans of the audits done inside the range that the page does not hold. */
  plans: ListRow[]
  /** The done day of each of those audits. */
  auditDays: Record<string, string>
}

export type RepeatRead = {
  startAudits: PageStarter
  startPlans: PlanStarter
  /** The tab's own plan conditions: status of the tab and the person's scope included. */
  tabFilters: readonly TabCondition[]
  range: DayRange
  /** Audits of the plans the page holds already. */
  knownAuditIds: readonly string[]
  onDone: (found: RepeatFound) => void
  /** Called once; what was read before the failure is not handed on. */
  onError: (error: object) => void
}

/** Reads the audits of the range, then the tab's plans of the audits the page lacks. */
export function readRepeatSources(read: RepeatRead): void {
  const { startAudits, startPlans, tabFilters, range, knownAuditIds, onDone, onError } = read
  readAllPages({
    start: startAudits,
    payload: { sort: BY_ID, filters: auditRangeFilters(range) },
    onError,
    onDone: (audits) => {
      const known = new Set(knownAuditIds)
      const days = auditDaysOf(audits)
      readByIds({
        start: withinTab(startPlans, tabFilters),
        field: 'audit_id',
        ids: Object.keys(days).filter((id) => !known.has(id)),
        onError,
        onDone: (plans) => {
          const auditDays: Record<string, string> = {}
          for (const plan of plans) {
            const id = typeof plan.audit_id === 'string' ? plan.audit_id : ''
            const day = days[id]
            if (day) auditDays[id] = day
          }
          onDone({ plans, auditDays })
        },
      })
    },
  })
}
