import { Type as t } from '@sinclair/typebox'
import { defineRoute } from 'nucleus-core-ts/server'
import { type Row, type Sql, query, transaction } from '../db'
import { PENDING_APPROVAL, canonicalId, toDateKey } from '../guards/businessRules'
import { callerById, isAdmin } from '../guards/caller'
import { REJECTED } from '../guards/rejectedPlan'
import { dayTr } from './auditReport'
import { statusTr } from './excel'

/**
 * Merkez Ekip sends an audit back for correction: `POST /biltim/plans/:plan_id/reject`
 * (customer notes, row 30, "onayla ve düzenlenin altına reddet butonu").
 *
 * Reddet is a return, not a redo. The plan goes `pending_approval` -> `rejected`
 * with the reason, who and when, and every person of the plan's team (its
 * leader and active members) gets a notification with the location, the
 * planned day and the reason. All of it happens in ONE transaction, so a plan
 * is never rejected without its team being told, nor told about a rejection
 * that did not happen. The plan row is locked while it is judged, so two
 * admins pressing the button together reject it once and the second is told
 * the plan is no longer waiting.
 *
 * Only Merkez Ekip, Super Admin and the godmin (`isAdmin`). Müdür plans audits
 * and does not approve them, so he does not send them back either. Nothing here
 * is reachable through the generic CRUD route: the guard refuses a plain write
 * of `status: "rejected"` (guards/rejectedPlan.ts).
 */

export const REASON_MIN = 5
export const REASON_MAX = 500

/** The notification's `type` and the prefix of its `source` (`plan:<id>`). */
export const REJECTED_NOTIFICATION_TYPE = 'audit_rejected'

export type RejectDeps = {
  /** Reads outside the transaction: who is calling. */
  read: Sql
  /** Runs `work` on one connection, committing together or not at all. */
  transaction: <T>(work: (sql: Sql) => Promise<T>) => Promise<T>
}

/** What the route answers: a refusal with its message, or the rejected plan's id and new status. */
export type RejectBody = {
  success: boolean
  isSuccess?: boolean
  message?: string
  errors?: Array<{ message: string }>
  data?: { id: string; status: string }
}

export type RejectOutcome = { status: number; body: RejectBody }

const defaultDeps: RejectDeps = { read: query, transaction }

const failure = (status: number, message: string): RejectOutcome => ({
  status,
  body: { success: false, isSuccess: false, message, errors: [{ message }] },
})

/** A text column of a row, trimmed; a missing or null column reads as empty. */
const field = (row: Row | undefined, key: string): string => {
  const value = row?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

/** Cut to a column's width, saying so with an ellipsis (the same as nucleus does for its own notifications). */
const clip = (value: string, max: number): string => (value.length > max ? `${value.slice(0, max - 1)}…` : value)

/** What the team reads in the bell: where, which day and why. */
export function rejectionNotice(location: string, day: string, reason: string): { title: string; body: string } {
  const subject = [location ? `${location} lokasyonunun` : '', day ? `${dayTr(day)} tarihli` : '']
    .filter(Boolean)
    .join(' ')
  return {
    title: clip(location ? `Denetim düzeltme bekliyor: ${location}` : 'Denetim düzeltme bekliyor', 255),
    body: clip(
      `${subject ? `${subject} denetimi` : 'Denetim'} Merkez Ekip tarafından düzeltilmek üzere ekibinize geri gönderildi. Gerekçe: ${reason} Denetimi ana sayfadaki "Düzelt ve Yeniden Gönder" ile düzeltip yeniden gönderin; hiçbir kayıt silinmedi.`,
      1000
    ),
  }
}

export async function rejectPlan(
  input: { planId: string; userId: string | null; reason: string | undefined },
  deps: RejectDeps = defaultDeps
): Promise<RejectOutcome> {
  const caller = input.userId ? await callerById(input.userId, deps.read) : null
  if (!caller) return failure(401, 'Oturum bulunamadı.')
  if (!isAdmin(caller)) {
    return failure(
      403,
      'Denetimi yalnız Merkez Ekip, Super Admin ve godmin reddedebilir. Reddedilmesi gereken bir denetim varsa Merkez Ekip\'ten isteyin.'
    )
  }

  const reason = (input.reason ?? '').trim()
  const length = [...reason].length
  if (length < REASON_MIN || length > REASON_MAX) {
    return failure(
      400,
      `Red gerekçesi ${REASON_MIN} ile ${REASON_MAX} karakter arasında olmalı (şu an ${length}). Ekibin neyi düzelteceğini anlatan kısa bir gerekçe yazın.`
    )
  }

  const planId = canonicalId(input.planId)
  return deps.transaction(async (sql): Promise<RejectOutcome> => {
    // `for update of p`: the plan is ours until the transaction ends.
    const plans = await sql(
      `select p.status, p.planned_date, p.assigned_team_id::text as assigned_team_id,
              l.name as location_name, t.leader_user_id::text as leader_user_id
         from main.five_s_audit_plans p
         left join main.five_s_locations l on l.id = p.location_id
         left join main.five_s_audit_teams t on t.id = p.assigned_team_id
        where p.id::text = $1 and p.is_active is not false
          for update of p`,
      [planId]
    )
    const plan = plans[0]
    if (!plan) return failure(404, 'Denetim planı bulunamadı. Sayfayı yenileyip yeniden deneyin.')

    const status = field(plan, 'status')
    if (status !== PENDING_APPROVAL) {
      return failure(
        409,
        `Yalnız "${statusTr(PENDING_APPROVAL)}" durumundaki bir denetim reddedilebilir; bu planın durumu "${statusTr(status)}". Sayfayı yenileyip güncel durumu görün.`
      )
    }

    const updated = await sql(
      `update main.five_s_audit_plans
          set status = '${REJECTED}', rejection_reason = $2, rejected_at = (now() at time zone 'utc'),
              rejected_by = $3::uuid, updated_at = (now() at time zone 'utc')
        where id::text = $1 and status = '${PENDING_APPROVAL}'
        returning id::text as id`,
      [planId, reason, caller.userId]
    )
    const id = field(updated[0], 'id')
    if (!id) return failure(409, 'Plan başka biri tarafından değiştirildi. Sayfayı yenileyip güncel durumu görün.')

    // The leader and the active members; each person once, whatever the roles say.
    const teamId = field(plan, 'assigned_team_id')
    const members = teamId
      ? await sql(
          `select m.user_id::text as user_id from main.five_s_audit_team_members m
            where m.team_id::text = $1 and coalesce(m.is_active, true)`,
          [teamId]
        )
      : []
    const recipients = [
      ...new Set(
        [field(plan, 'leader_user_id'), ...members.map((m) => field(m, 'user_id'))]
          .map((v) => canonicalId(v))
          .filter(Boolean)
      ),
    ]
    if (recipients.length > 0) {
      const notice = rejectionNotice(field(plan, 'location_name'), toDateKey(plan.planned_date), reason)
      /*
       * No entity_name / entity_id: the bell opens `/<entity_name>s/<entity_id>`
       * for a notification that carries both, and no such page exists for a
       * plan. The row is read by user_id alone (nucleus's list route).
       */
      await sql(
        `insert into main.notifications (user_id, title, body, type, source, is_seen, created_by)
         select r::uuid, $2, $3, $4, $5, false, $6::uuid from unnest($1::text[]) as r`,
        [recipients, notice.title, notice.body, REJECTED_NOTIFICATION_TYPE, `plan:${id}`, caller.userId]
      )
    }
    return { status: 200, body: { success: true, data: { id, status: REJECTED } } }
  })
}

/** The route over any database: the server takes the default, a test hands in a fake. */
export const createRejectPlanRoute = (deps: RejectDeps = defaultDeps) =>
  defineRoute({
    method: 'POST',
    path: '/plans/:plan_id/reject',
    params: t.Object({ plan_id: t.String() }),
    // Optional all the way down, so a missing reason is answered in Turkish by rejectPlan, not by the validator.
    body: t.Optional(t.Object({ reason: t.Optional(t.String()) })),
    detail: {
      tags: ['Biltim'],
      summary: 'Send an audit waiting for approval back to its team for correction (Merkez Ekip)',
    },
    handler: async (ctx) => {
      const result = await rejectPlan(
        {
          planId: ctx.params.plan_id,
          userId: ctx.request.headers.get('x-user-id'),
          reason: ctx.body?.reason,
        },
        deps
      )
      ctx.set.status = result.status
      return result.body
    },
  })

export const rejectPlanRoute = createRejectPlanRoute()
