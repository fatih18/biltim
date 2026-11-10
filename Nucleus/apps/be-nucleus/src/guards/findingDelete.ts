/**
 * Deleting a finding of an audit that has been sent or approved.
 *
 * The findings register lets Merkez Ekip, Super Admin and Müdür delete a
 * finding (the `delete.five_s_findings` claim), and the audit correction screen
 * now offers the same "Sil" per finding. Once the plan an audit belongs to is
 * waiting for approval or approved, its findings are part of the record Merkez
 * Ekip signs off, and the customer's rule for such an audit (notes rows 12, 17,
 * 29) is that correcting it is not Müdür's: the same circle that may rewrite
 * its answers (`isAdmin`) may delete its findings. A finding of an audit still
 * being carried out, or of a single finding's carrier row, is not held to it.
 */

type Read = (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>

/** `DELETE /fiveSFindings/<id>`: the one finding, not the collection or a sub-path. */
export const FINDING_ITEM = /^\/fiveSFindings\/([^/?]+)\/?$/

/** What the refused caller is told. */
export const FINISHED_AUDIT_FINDING_MESSAGE =
  'Tamamlanmış ya da onay bekleyen bir denetimin bulgusunu yalnız Merkez Ekip silebilir.'

/**
 * True when the finding hangs under an audit whose plan is `completed` or
 * `pending_approval`. The link is either side, as for the audit's own answers:
 * the plan's `audit_id`, or the audit's own `plan_id`. No such finding (an
 * unknown id) answers false, and the route answers 404 in its own words.
 */
export async function findingOfFinishedAudit(findingId: string, read: Read): Promise<boolean> {
  const rows = await read(
    `select 1 as locked
       from main.five_s_findings f
      where f.id::text = $1
        and f.audit_id is not null
        and exists (
          select 1 from main.five_s_audit_plans p
           where coalesce(p.status, '') in ('completed', 'pending_approval')
             and (p.audit_id::text = f.audit_id::text
                  or p.id::text in (select a.plan_id::text from main.five_s_audits a where a.id::text = f.audit_id::text)))
      limit 1`,
    [findingId]
  )
  return rows.length > 0
}
