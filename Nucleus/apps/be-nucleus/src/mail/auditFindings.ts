import type { Sql } from '../db'
import { countOf } from './rows'

/**
 * Findings of one audit, counted the way the one-audit report lists them
 * (`FORM_FINDINGS_SQL` in `routes/locationFormFindings.ts`), so the number in
 * the completion mail is the number on the report the field manager opens.
 *
 * That is the findings that name the audit (`audit_id`) and the single
 * findings raised inside it (R74), which hang under a carrier row
 * (`source = 'single_finding'`) of the plan the audit belongs to. The carrier
 * clause is the report's own, with `$1` where it has `$5`; a test holds the two
 * texts together. Findings that are switched off (`is_active` not true) are out.
 */
export const AUDIT_FINDINGS_SQL = `select count(*)::int as n from main.five_s_findings f
      where f.is_active = true
        and (f.audit_id::text = $1
             or f.audit_id in (select c.id from main.five_s_audits c
                                where c.source = 'single_finding' and c.plan_id is not null
                                  and c.plan_id = (select a.plan_id from main.five_s_audits a where a.id::text = $1)))`

export async function countAuditFindings(sql: Sql, auditId: string): Promise<number> {
  const rows = await sql(AUDIT_FINDINGS_SQL, [auditId])
  return countOf(rows[0], 'n')
}
