import { type Row, query } from '../db'
import { toDateKey } from '../guards/businessRules'
import { type Caller, isCentral } from '../guards/caller'

/**
 * The report of ONE audit, for the field manager of its location (customer
 * notes, row 75: "Bölge sorumlusu tamamlanan denetimin raporunu görebilsin").
 *
 * What "the report of an audit" is, here: the plant's own form for it, the one
 * `/reports/location-form.xlsx` writes for a location and a year — the question
 * sheet of the audit (KYS.180, every question's rating, explanation and
 * points, the step totals and the score) and the findings sheet. With
 * `audit_id` the same workbook is narrowed to that single audit and the
 * findings raised in it. Nothing new is stored: the audit's location, day and
 * approval are all read from rows that already exist.
 *
 * Which rows a field manager may open is decided by the scoping the location
 * form already applies (their own locations, matched by name); this file adds
 * the one rule that is specific to a single audit's report — it is for an
 * audit Merkez Ekip has approved, not for one still waiting for approval.
 */

type Read = (text: string, params: unknown[]) => Promise<Row[]>

export type AuditReportTarget = {
  auditId: string
  /** The audited place; `department_name` carries the location's name. */
  locationName: string
  /** The day the audit was carried out, `YYYY-MM-DD`. */
  auditDay: string
  /** Every plan the audit belongs to is `completed` (approved). */
  completed: boolean
}

/**
 * A field manager and nothing above: the caller whose reports are narrowed to
 * the locations they manage. The same condition `location-form.xlsx` and the
 * dashboard use; Merkez Ekip, Super Admin, Müdür and the godmin see everything.
 */
export function isScopedFieldManager(caller: Caller | null): boolean {
  return !!caller && !isCentral(caller) && caller.roles.includes('field manager')
}

/**
 * The audit a report is asked for, with what the access rule needs.
 *
 * `null` for an unknown id, a deactivated audit, a single finding's carrier row
 * (it is not an audit, every report leaves it out) and an audit with no place
 * on it. Plans are joined on either side of the link — the plan's `audit_id`
 * or the audit's own `plan_id`, as the other audit rules read it — and it is
 * `completed` only when every plan found is: an audit with no plan at all is
 * not approved.
 */
export async function loadAuditReportTarget(auditId: string, read: Read = query): Promise<AuditReportTarget | null> {
  const rows = await read(
    `select a.id::text as id, a.department_name, a.audit_date,
            coalesce(bool_and(p.status = 'completed'), false) as completed
       from main.five_s_audits a
       left join main.five_s_audit_plans p
         on p.audit_id::text = a.id::text or p.id::text = a.plan_id::text
      where a.id::text = $1
        and a.is_active is not false
        and a.source is distinct from 'single_finding'
        and coalesce(trim(a.department_name), '') <> ''
      group by a.id, a.department_name, a.audit_date`,
    [auditId]
  )
  const row = rows[0]
  if (!row) return null
  return {
    auditId: String(row.id),
    locationName: String(row.department_name).trim(),
    auditDay: toDateKey(row.audit_date),
    completed: row.completed === true,
  }
}

export type ReportRefusal = { status: 403; message: string }

/**
 * The rule that belongs to a single audit's report, on top of the location
 * scoping: a field manager is shown it once the audit is approved. Everyone
 * else is unchanged — the roles that already open any audit of a location keep
 * doing so.
 */
export function auditReportRefusal(caller: Caller | null, target: AuditReportTarget): ReportRefusal | null {
  if (!isScopedFieldManager(caller) || target.completed) return null
  return {
    status: 403,
    message:
      'Bu denetimin raporu henüz açılamaz: denetim Merkez Ekip onayını bekliyor. Onaylandıktan sonra Tamamlanan sekmesinden raporu açabilirsiniz.',
  }
}

/** `2026-11-03` as the plant writes it, `03.11.2026`. */
export function dayTr(day: string): string {
  return day.split('-').reverse().join('.')
}
