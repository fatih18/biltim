import { type Row, query } from '../db'
import type { Read } from '../guards/caller'
import type { PlaceInYear } from './locationMatch'

/**
 * The findings a location form carries a row for.
 *
 * `$5` is the one audit asked for, or NULL for the location's year (`$1` the
 * place's finding spellings, `$2`/`$3` the year, `$4` the audit ids of the
 * year's audits). The yearly form matches by place and day and is unchanged.
 *
 * The one-audit form takes the findings that name the audit (`f.audit_id`) and
 * the single findings raised inside it. A single finding hangs under a carrier
 * row of its own (`source = 'single_finding'`), not under the audit, but
 * the carrier is written with the plan the audit belongs to, so the carriers of
 * that plan are the audit's: without them the report left out exactly the
 * findings the audit's own screen produces. The carrier clause starts from
 * `$5` alone, so it reaches no plan but the requested audit's: a field manager
 * who passed the report's approval check (`auditReportRefusal`) for that audit
 * reads findings of an approved plan, not of another one.
 */
export const FORM_FINDINGS_SQL = `select f.finding_no, f.detected_date, f.location_name, f.finding_type, f.description,
              f.action_to_take, f.due_date, f.completed_at, f.status,
              f.photo_before_files, f.photo_before_file_id, f.photo_before_url,
              f.photo_after_files, f.photo_after_file_id, f.photo_after_url
         from five_s_findings f
        where f.is_active = true
          and ($5::text is null
               and (f.location_name = any($1::text[]) or f.audit_id = any($4::uuid[]))
               and f.detected_date between $2 and $3
               or f.audit_id::text = $5
               or f.audit_id in (select c.id from five_s_audits c
                                  where c.source = 'single_finding' and c.plan_id is not null
                                    and c.plan_id = (select a.plan_id from five_s_audits a where a.id::text = $5)))
        order by f.detected_date asc, f.finding_no asc nulls last`

export function loadFormFindings(
  place: Pick<PlaceInYear, 'findingNames'>,
  range: { from: string; to: string },
  auditIds: string[],
  auditId: string | null,
  read: Read = query
): Promise<Row[]> {
  return read(FORM_FINDINGS_SQL, [place.findingNames, range.from, range.to, auditIds, auditId])
}
