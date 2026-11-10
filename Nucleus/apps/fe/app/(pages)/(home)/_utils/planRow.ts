import type { JsonValue, ListRow } from '@/app/_utils/readAllPages'
import type { AuditPlanRow } from '../page'
import { dayKey } from './doneDayPlacement'

/**
 * A plan row as the home list keeps it, with its three date columns as calendar
 * days (R43).
 *
 * The columns come as `YYYY-AA-GG` or as an ISO timestamp, and the day is the
 * first ten characters either way (`dayKey`, the string rule of the server's
 * `toDateKey`). Building a `Date` out of an ISO value reads it in the browser's
 * zone: `2026-10-08T23:30:00.000Z` became the 9th in Turkey and the 8th is what
 * the server stores. The done-day placement compares days by the string rule, so
 * a planned day read any other way can disagree with the done day of the same
 * audit and list it twice, or not at all.
 */

/** The date columns of a plan as a read returns them. */
export type PlanDateFields = {
  planned_date?: string | null
  date_range_start?: string | null
  date_range_end?: string | null
}

export type PlanDays = {
  planned_date: string
  date_range_start: string | null
  date_range_end: string | null
}

/** The plan's days: '' for a planned day that is not readable, null for a range end that is not set. */
export function planDates(plan: PlanDateFields | null | undefined): PlanDays {
  return {
    planned_date: dayKey(plan?.planned_date),
    date_range_start: dayKey(plan?.date_range_start) || null,
    date_range_end: dayKey(plan?.date_range_end) || null,
  }
}

const text = (value: JsonValue): string => (typeof value === 'string' ? value : '')
const textOrNull = (value: JsonValue): string | null => (typeof value === 'string' && value !== '' ? value : null)

/** A plan row out of a generic list read, typed field by field, with its days read by `planDates`. */
export function toPlanRow(row: ListRow): AuditPlanRow {
  const days = planDates({
    planned_date: text(row.planned_date),
    date_range_start: text(row.date_range_start),
    date_range_end: text(row.date_range_end),
  })
  return {
    id: text(row.id),
    is_active: row.is_active !== false,
    created_at: text(row.created_at),
    updated_at: text(row.updated_at),
    ...days,
    location_id: text(row.location_id),
    assigned_team_id: text(row.assigned_team_id),
    status: text(row.status),
    audit_id: textOrNull(row.audit_id),
    date_change_count: typeof row.date_change_count === 'number' ? row.date_change_count : 0,
    parent_plan_id: textOrNull(row.parent_plan_id),
    quarter: textOrNull(row.quarter),
    title: textOrNull(row.title),
    rejection_reason: textOrNull(row.rejection_reason),
    rejected_at: textOrNull(row.rejected_at),
  }
}
