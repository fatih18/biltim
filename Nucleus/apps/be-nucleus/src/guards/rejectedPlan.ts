import { type Caller, isAdmin } from './caller'

/**
 * A plan Merkez Ekip sent back for correction (customer notes, row 30).
 *
 * "Reddet" is a return, not a redo: the field audit has physically happened, so
 * the plan keeps its audit, the plan's team corrects it and sends it again,
 * and "one plan, one audit" stays intact. While the plan is `rejected` its
 * audit, answers and findings are the correction's working copy, and only the
 * two circles that can legitimately correct it may write them: Merkez Ekip
 * (`isAdmin`) and the plan's own team (its leader or an active member).
 */

type Read = (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>

/** Whether a person leads, or is an active member of, a team (businessRules' `onPlanTeam`). */
export type TeamLookup = (teamId: string, userId: string) => Promise<{ leader: boolean; member: boolean }>

export const REJECTED = 'rejected'

/** Writing the status straight through the CRUD route would skip the reason and the team's notification. */
export const REJECTED_STATUS_WRITE_MESSAGE =
  'Plan durumu doğrudan "Düzeltme Bekliyor" yapılamaz. Denetimi geri göndermek için onay ekranındaki "Reddet" düğmesini kullanın; gerekçe ve ekibe giden bildirim o düğmeyle kaydedilir.'

export const REJECTED_AUDIT_MESSAGE =
  'Bu denetim düzeltme için geri gönderildi; düzeltmeyi yalnız planın ekibi ve Merkez Ekip yapabilir. Düzeltmeyi planın ekibinden isteyin.'

export const REJECTED_RELINK_MESSAGE =
  'Düzeltme bekleyen bir planın denetim bağlantısı değiştirilemez; düzeltilen denetim aynı bağlantıyla yeniden gönderilir.'

export const REJECTED_RESEND_MESSAGE =
  'Düzeltme bekleyen plan, yalnız kendi denetimiyle ve yalnız planın ekibi ya da Merkez Ekip tarafından yeniden gönderilebilir.'

export const REJECTED_DATE_MESSAGE = 'Düzeltme bekleyen denetimin tarihi yalnız Merkez Ekip tarafından değiştirilebilir.'

/** Rows the database answered, kept only when they really are rejected plans. */
const teamsOf = (rows: Record<string, unknown>[]): string[] =>
  rows.filter((r) => String(r.status ?? '') === REJECTED).map((r) => String(r.assigned_team_id ?? ''))

/**
 * The teams of the rejected plans these audits belong to, one entry per plan;
 * empty when none is rejected. The link is either side, as for the audit's
 * other rules: the plan's `audit_id`, or the audit's own `plan_id`. A plan with
 * no team answers an empty id, which nobody is a member of.
 */
export async function rejectedPlanTeams(read: Read, auditIds: string[]): Promise<string[]> {
  if (auditIds.length === 0) return []
  const rows = await read(
    `select p.status, p.assigned_team_id::text as assigned_team_id
       from main.five_s_audit_plans p
      where p.status = 'rejected'
        and (p.audit_id::text = any($1::text[])
             or p.id::text in (select a.plan_id::text from main.five_s_audits a where a.id::text = any($1::text[])))`,
    [auditIds]
  )
  return teamsOf(rows)
}

/** The same, for the audit a stored finding hangs under. An unknown finding answers empty. */
export async function rejectedPlanTeamsOfFinding(read: Read, findingId: string): Promise<string[]> {
  const rows = await read(
    `select p.status, p.assigned_team_id::text as assigned_team_id
       from main.five_s_findings f
       join main.five_s_audit_plans p
         on p.status = 'rejected'
        and (p.audit_id::text = f.audit_id::text
             or p.id::text in (select a.plan_id::text from main.five_s_audits a where a.id::text = f.audit_id::text))
      where f.id::text = $1 and f.audit_id is not null`,
    [findingId]
  )
  return teamsOf(rows)
}

/**
 * Whether this caller may write the audit of every one of these rejected
 * plans: Merkez Ekip, Super Admin and the godmin always; anyone else only when
 * they are on each plan's team.
 */
export async function mayWriteRejected(caller: Caller, teamIds: string[], onTeam: TeamLookup): Promise<boolean> {
  if (isAdmin(caller)) return true
  for (const teamId of teamIds) {
    const on = await onTeam(teamId, caller.userId)
    if (!on.leader && !on.member) return false
  }
  return true
}
