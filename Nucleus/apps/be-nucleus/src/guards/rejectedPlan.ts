import type { Row } from '../db'
import { type Caller, type Read, isAdmin, isCentral } from './caller'

/**
 * A plan Merkez Ekip sent back for correction (customer notes, row 30).
 *
 * "Reddet" is a return, not a redo: the field audit has physically happened, so
 * the plan keeps its audit, the plan's team corrects it and sends it again,
 * and "one plan, one audit" stays intact. While the plan is `rejected` its
 * audit, answers and findings are the correction's working copy, and only the
 * two circles that can legitimately correct it may write them: Merkez Ekip
 * (`isAdmin`) and the plan's own team (its leader or an active member).
 *
 * One write is not a correction: closing a finding with its "after" photo is
 * the Saha Sorumlusu's core job (`isClosureOnlyWrite`, `mayCloseFindings`), and
 * a plan that stays rejected must not stop it. The reason, the moment and the
 * person of the rejection belong to the Reddet route alone (`rejectionColumnsIn`).
 */


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

/** Müdür is central, so the plan's status is guarded for them by name: it changes only by the team's resend. */
export const REJECTED_STATUS_CHANGE_MESSAGE =
  'Düzeltme bekleyen planın durumu yalnız denetimiyle birlikte yeniden gönderilerek değişir. İptal etmek, planlı duruma almak ya da onaylamak Merkez Ekip\'in işidir; düzeltilmemiş bir denetim onay kuyruğuna bu yolla dönemez.'

export const REJECTED_DATE_MESSAGE = 'Düzeltme bekleyen denetimin tarihi yalnız Merkez Ekip tarafından değiştirilebilir.'

/** The reason, the moment and the person are the Reddet route's own columns; a plain write could forge them. */
export const REJECTED_COLUMNS_WRITE_MESSAGE =
  'Planın red gerekçesi, red zamanı ve reddeden kişi elle yazılamaz; bu bilgileri yalnız onay ekranındaki "Reddet" düğmesi kaydeder. Denetimi geri göndermek için o düğmeyi kullanın.'

const REJECTION_COLUMNS: readonly string[] = ['rejectionreason', 'rejectedat', 'rejectedby']

/** A key reduced to its letters and digits, lower case: `rejectionReason`, `rejection_reason` and `Rejection-Reason` read alike. */
export const squash = (key: string): string => key.replace(/[^a-z0-9]/gi, '').toLowerCase()

/** The keys of a plan write that name `rejection_reason`, `rejected_at` or `rejected_by`, in any spelling. */
export function rejectionColumnsIn(body: Row): string[] {
  return Object.keys(body).filter((key) => REJECTION_COLUMNS.includes(squash(key)))
}

/** The only keys of a finding write that is nothing but its closing: the status and the "after" evidence. */
const CLOSURE_KEYS: ReadonlySet<string> = new Set([
  'status',
  'photo_after_files',
  'photo_after_file_id',
  'photo_after_url',
  'completed_at',
  'closed_at',
  'photoAfterFiles',
  'photoAfterFileId',
  'photoAfterUrl',
  'completedAt',
  'closedAt',
])

/** The keys that only name the finding being written: the client repeats the path id as `_id` (or `id`). */
const TARGET_KEYS: readonly string[] = ['_id', 'id']

/**
 * A finding PUT or PATCH that carries closing keys and nothing else. The
 * nucleus client leaves the target id in the body as `_id` beside the path
 * id; that key is neutral only when it names the same finding as the path
 * (`targetId`, canonical). At least one real closing key is still required.
 */
export function isClosureOnlyWrite(body: Row, targetId: string): boolean {
  const target = targetId.toLowerCase()
  const keys = Object.keys(body).filter((key) => {
    const value = body[key]
    return !(TARGET_KEYS.includes(key) && typeof value === 'string' && value.toLowerCase() === target)
  })
  return keys.length > 0 && keys.every((key) => CLOSURE_KEYS.has(key))
}

/**
 * The roles that close findings today: the Saha Sorumlusu, whose core job it is,
 * and Merkez Ekip, Super Admin, Müdür and the godmin, who manage them. The
 * closing rules (an "after" photo, a closed finding stays closed) still apply.
 */
export function mayCloseFindings(caller: Caller | null): boolean {
  return !!caller && (isCentral(caller) || caller.roles.includes('field manager'))
}

/** Rows the database answered, kept only when they really are rejected plans. */
const teamsOf = (rows: Row[]): string[] =>
  rows
    .filter((r) => r.status === REJECTED)
    .map((r) => (typeof r.assigned_team_id === 'string' ? r.assigned_team_id : ''))

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
