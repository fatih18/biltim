import { PHOTO_COLUMNS } from './photoReport'

/**
 * A finding's place for a report: its own `location_name`, and when that is
 * empty or blank (R47 c) the department of the audit it came out of (alias
 * `a`, the LEFT JOIN of five_s_audits on f.audit_id). A cell that prints the
 * place must never be empty when the finding's audit knows it.
 */
export const FINDING_PLACE = `coalesce(nullif(trim(f.location_name), ''), a.department_name)`

/**
 * "Termini Geçmiş Aksiyonlar": open findings past their termin, oldest first.
 *
 * `where` is the finding filter (alias `f`), `todayParam` the number of the
 * placeholder that carries the plant's today. The photo columns are selected
 * only for the Excel, which draws them: the dashboard's JSON has no use for up
 * to 500 rows of photo arrays.
 */
export function overdueActionsSql(where: string, todayParam: number, withPhotos: boolean): string {
  const photos = withPhotos ? `, ${PHOTO_COLUMNS}` : ''
  return `SELECT f.id, f.finding_no, ${FINDING_PLACE} AS location_name, f.finding_type, f.description,
                f.action_to_take, f.due_date, f.responsible_name, f.detected_date,
                ($${todayParam}::date - f.due_date)::int AS overdue_days${photos}
         FROM five_s_findings f
         LEFT JOIN five_s_audits a ON a.id = f.audit_id
         WHERE ${where} AND f.status = 'open'
           AND f.due_date IS NOT NULL AND f.due_date < $${todayParam}::date
         ORDER BY f.due_date ASC LIMIT 500`
}
