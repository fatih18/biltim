/**
 * Where an audit stands on the home list when it was done on another day than
 * it was planned (R43).
 *
 * The list is a flat run of plans in planned-date order. A plan planned for
 * day A and carried out on day B used to appear once, under A, with a small
 * "Yapıldı: B". Our promise to the customer is that B shows it too, so
 * whoever looks for what happened on B finds it. This module decides that
 * placement; the rows only draw what it returns.
 *
 * Two kinds of entry come out:
 *  - `planned`: the plan itself, in the order the server sent it. It carries
 *    `doneDay` when the audit was done on another day.
 *  - `done`: a read-only repeat of the same audit, placed at the day it was
 *    done. It exists only when that day differs from the planned one.
 *
 * Only the `planned` entries are audits. `countAudits` is the one way to count
 * a list, so a tab total or a "N denetim" line never counts the repeat twice.
 *
 * A plan planned long before it was done lies outside the loaded page. Those
 * plans are handed in separately as repeat sources: they can produce a repeat
 * under their done day and nothing else, so they are never an audit of the list.
 */

export type SortDirection = 'asc' | 'desc'

/** The three fields of a plan the placement needs. */
export type PlannedAudit = {
  id: string
  planned_date: string
  audit_id: string | null
}

export type PlannedEntry<P> = {
  kind: 'planned'
  key: string
  plan: P
  /** The day the entry is placed under: the planned day. */
  day: string
  /** The day the audit was done, only when it is not the planned day. */
  doneDay: string | null
}

export type DoneEntry<P> = {
  kind: 'done'
  key: string
  plan: P
  /** The day the entry is placed under: the day the audit was done. */
  day: string
  plannedDay: string
}

export type DayEntry<P> = PlannedEntry<P> | DoneEntry<P>

/**
 * A calendar day, `YYYY-AA-GG`, out of a date or a timestamp string.
 *
 * Both date columns are `timestamp without time zone` read in UTC, so the first
 * ten characters ARE the day. This is the string rule of the server's
 * `toDateKey`; building a `Date` here would read the day in the browser's zone
 * and move it.
 */
export function dayKey(value: string | null | undefined): string {
  const text = (value ?? '').trim()
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : ''
}

/** The day this plan's audit was done, or '' when there is no audit or its day is not known. */
export function doneDayOf(plan: PlannedAudit, doneDays: Readonly<Record<string, string>>): string {
  return plan.audit_id ? dayKey(doneDays[plan.audit_id]) : ''
}

/** `a` comes before `b` in a list sorted this way. */
function comesBefore(a: string, b: string, direction: SortDirection): boolean {
  return direction === 'asc' ? a < b : a > b
}

/**
 * The plans as list entries, repeats included.
 *
 * The plans keep the order they came in (the server sorted them; a date edited
 * on screen keeps its row where it was). Each repeat is slotted in before the
 * first plan that lies after its day, so a repeat never jumps ahead of plans
 * of its own day and several repeats of one day keep the server's order.
 *
 * `repeatSources` are plans the page does not hold, read only to be repeated.
 * A source gives a repeat when its audit was done on another day than it was
 * planned, and never a `planned` entry; one the list holds already is skipped.
 */
export function placeByDay<P extends PlannedAudit>(
  plans: readonly P[],
  doneDays: Readonly<Record<string, string>>,
  direction: SortDirection,
  repeatSources: readonly P[] = []
): DayEntry<P>[] {
  const planned: PlannedEntry<P>[] = []
  const repeats: DoneEntry<P>[] = []

  for (const plan of plans) {
    const plannedDay = dayKey(plan.planned_date)
    const done = doneDayOf(plan, doneDays)
    const elsewhere = done !== '' && done !== plannedDay
    planned.push({ kind: 'planned', key: plan.id, plan, day: plannedDay, doneDay: elsewhere ? done : null })
    // A plan with no readable planned day has nothing to say "Plan:" about.
    if (elsewhere && plannedDay !== '') {
      repeats.push({ kind: 'done', key: `${plan.id}:done`, plan, day: done, plannedDay })
    }
  }

  const listed = new Set(plans.map((plan) => plan.id))
  for (const plan of repeatSources) {
    if (listed.has(plan.id)) continue
    listed.add(plan.id)
    const plannedDay = dayKey(plan.planned_date)
    const done = doneDayOf(plan, doneDays)
    if (done !== '' && done !== plannedDay && plannedDay !== '') {
      repeats.push({ kind: 'done', key: `${plan.id}:done`, plan, day: done, plannedDay })
    }
  }

  const waiting = repeats
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      if (a.entry.day === b.entry.day) return a.index - b.index
      return comesBefore(a.entry.day, b.entry.day, direction) ? -1 : 1
    })
    .map((item) => item.entry)

  const placed: DayEntry<P>[] = []
  const queue = [...waiting]
  for (const entry of planned) {
    for (let head = queue[0]; head && comesBefore(head.day, entry.day, direction); head = queue[0]) {
      placed.push(head)
      queue.shift()
    }
    placed.push(entry)
  }
  return [...placed, ...queue]
}

/** How many audits the entries hold: a repeat is the same audit, not another one. */
export function countAudits<P>(entries: readonly DayEntry<P>[]): number {
  return entries.filter((entry) => entry.kind === 'planned').length
}

/** How many audits are listed a second time under the day they were done. */
export function countRepeats<P>(entries: readonly DayEntry<P>[]): number {
  return entries.length - countAudits(entries)
}

/**
 * How many repeats belong to a plan the list does not hold: that audit is on
 * the list only under the day it was done, because its plan lies outside the page.
 */
export function countOutsideRepeats<P extends PlannedAudit>(entries: readonly DayEntry<P>[]): number {
  const held = new Set<string>()
  for (const entry of entries) {
    if (entry.kind === 'planned') held.add(entry.plan.id)
  }
  return entries.filter((entry) => entry.kind === 'done' && !held.has(entry.plan.id)).length
}
