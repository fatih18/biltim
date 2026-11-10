import { type Row, query } from '../db'
import type { Read } from '../guards/caller'
import type { PlaceInYear } from './locationMatch'

/**
 * The audits a location form carries a question sheet for.
 *
 * Either the location's year (`auditId` null: audits typed with one of the
 * place's names or planned on one of its rows, dated inside the year) or the
 * one audit asked for. `completedOnly` is a scoped field manager asking: only
 * audits whose plan is approved (`completed`) count, in both shapes, so the
 * yearly form cannot be used to read a question sheet that the one-audit
 * report refuses. `$6` is that flag and the `exists` clause is what it switches.
 */
export function loadFormAudits(
  place: Pick<PlaceInYear, 'auditNames' | 'ids'>,
  range: { from: string; to: string },
  auditId: string | null,
  completedOnly: boolean,
  read: Read = query
): Promise<Row[]> {
  return read(
    `select a.id, a.plan_id, a.audit_date, a.auditor_name, a.total_score, a.target_score,
            a.score_s1, a.score_s2, a.score_s3, a.score_s4, a.score_s5
       from five_s_audits a
      where a.is_active = true and a.source is distinct from 'single_finding'
        and ($5::text is null
             and (a.department_name = any($1::text[]) or a.location_id = any($2::uuid[]))
             and a.audit_date >= $3 and a.audit_date < ($4::date + 1)
             or a.id::text = $5)
        and (not $6::boolean or exists (
              select 1 from five_s_audit_plans p
               where (p.audit_id = a.id or p.id = a.plan_id) and p.status = 'completed'))
      order by a.audit_date asc`,
    [place.auditNames, place.ids, range.from, range.to, auditId, completedOnly]
  )
}
