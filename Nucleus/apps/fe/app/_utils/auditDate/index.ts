/**
 * The two date decisions the audit form makes, in one place.
 *
 * Both were wrong in ways that only showed up in the database.
 */

/**
 * The day an audit is recorded as having happened.
 *
 * Picking a planned audit copied the PLAN's date straight into the form. A
 * plan is scheduled ahead of time, so an audit carried out today against a
 * plan dated 5 December was filed as 5 December — measured, five of the eight
 * audits in the database sat in the future, and the reports endpoint averaging
 * (completed_at - detected_date) came out at **-88 days** because the findings
 * inherited it.
 *
 * The planned date stays the default once it has arrived: the auditor is
 * recording the audit they were scheduled to do. It just cannot run ahead of
 * today, and the field remains editable either way.
 */
export function auditDateFor(
  plannedDate: string | undefined | null,
  fallback: string,
  today: string = new Date().toISOString().slice(0, 10),
): string {
  const planned = (plannedDate ?? '').slice(0, 10)
  if (!planned) return fallback
  return planned > today ? today : planned
}

/**
 * A calendar day, as the instant the server should store for it.
 *
 * `audit_date` is `timestamp without time zone` and the pool runs in UTC, so
 * what goes in is what comes out. The two save paths disagreed:
 *
 *   online  new Date('2026-09-08')             -> 2026-09-08T00:00:00Z  ✓
 *   offline new Date('2026-09-08T00:00:00')    -> 2026-09-07T21:00:00Z  ✗
 *
 * The second form is read in the browser's own zone, and Turkey is UTC+3, so
 * every audit synced from the offline queue was filed on the PREVIOUS day.
 * Measured on a form completed on 8 September: stored as 2026-09-07 21:00.
 * Offline is the field case — an auditor walking the plant is the reason the
 * queue exists — so this was the common path, not the rare one.
 */
export function atUtcMidnight(ymd: string): Date {
  return new Date(`${(ymd ?? '').slice(0, 10)}T00:00:00Z`)
}
