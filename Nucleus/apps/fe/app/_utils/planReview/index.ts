/**
 * The review of a sent audit (R30): Merkez Ekip approves it, or rejects it and
 * the plan's own team corrects it and sends it again.
 *
 *   planned -> pending_approval (auditor sends)
 *           -> rejected         (Merkez Ekip rejects, with a reason)
 *           -> pending_approval (the team resends after correcting)
 *           -> completed        (Merkez Ekip approves)
 *
 * Every decision the screens make about that flow is here, as a function of
 * plain values, so the buttons, the dialog and the audit form cannot disagree.
 * The server applies the same rules; nothing here replaces its refusal.
 */
import type { BaseErrorResponse } from 'nucleus-core-ts/client'

/** What the auditor's submission, and a resent correction, make of a plan. */
export const PLAN_STATUS_SENT = 'pending_approval'
/** Returned for correction; shown as "Düzeltme Bekliyor". */
export const PLAN_STATUS_REJECTED = 'rejected'

/** The server refuses a reason outside this range (400). */
export const REJECT_REASON_MIN = 5
export const REJECT_REASON_MAX = 500

/** The team's way back into the audit; also the label of the form's save button. */
export const RESEND_LABEL = 'Düzelt ve Yeniden Gönder'

/** Whether the plan was returned to its team and still waits for the correction. */
export function isPlanRejected(status: string | null | undefined): boolean {
  return status === PLAN_STATUS_REJECTED
}

/**
 * A plan whose audit has been carried out: sent, returned or approved. Its date
 * is a correction, so only admins move it and nothing is spent (R30: a rejected
 * plan is held to the same rule as a finished one).
 */
export function isCarriedOutPlan(status: string | null | undefined): boolean {
  return status === 'completed' || status === PLAN_STATUS_SENT || status === PLAN_STATUS_REJECTED
}

/**
 * "Onayla" is offered on a sent audit to admins (Merkez Ekip, Super Admin,
 * godmin) and to nobody else; Müdür approves nothing and rejects nothing.
 * A rejected plan is not offered it: it waits for its team's correction first.
 */
export function canApprovePlan(input: { status: string; isAdmin: boolean }): boolean {
  return input.isAdmin && input.status === PLAN_STATUS_SENT
}

/**
 * "Reddet" is offered on a sent audit to admins (Merkez Ekip, Super Admin,
 * godmin) and to nobody else; Müdür approves nothing and rejects nothing.
 */
export function canRejectPlan(input: { status: string; isAdmin: boolean }): boolean {
  return input.isAdmin && input.status === PLAN_STATUS_SENT
}

/** The plan's team: its leader or an active member. Ids compare folded, like the server's. */
export function isOnPlanTeam(teamId: string | null | undefined, myTeamIds: readonly string[]): boolean {
  const wanted = String(teamId ?? '').trim().toLowerCase()
  return wanted !== '' && myTeamIds.some((id) => String(id).trim().toLowerCase() === wanted)
}

/**
 * "Düzelt ve Yeniden Gönder": the plan's own team and admins, on a rejected
 * plan that still has its audit. Nobody else may write into it, so nobody else
 * is offered the way in.
 */
export function canCorrectRejectedPlan(input: {
  status: string
  auditId: string | null | undefined
  isAdmin: boolean
  isTeamMember: boolean
}): boolean {
  return isPlanRejected(input.status) && !!input.auditId && (input.isAdmin || input.isTeamMember)
}

/** Saving a correction on a rejected plan sends it again; on any other plan it only saves. */
export function shouldResendAfterCorrection(status: string | null | undefined): boolean {
  return isPlanRejected(status)
}

export type RejectReasonCheck = { ok: true; reason: string } | { ok: false; message: string }

/** The reason as the server will read it (trimmed), or what to tell the person. */
export function checkRejectReason(raw: string): RejectReasonCheck {
  const reason = raw.trim()
  if (reason.length === 0) {
    return {
      ok: false,
      message: 'Sebep yazılmadan denetim reddedilemez. Ekip neyi düzelteceğini bu yazıdan anlayacak.',
    }
  }
  if (reason.length < REJECT_REASON_MIN) {
    return {
      ok: false,
      message: `Sebep en az ${REJECT_REASON_MIN} karakter olmalı (şu an ${reason.length}). Ekip neyi düzelteceğini bu yazıdan anlayacak.`,
    }
  }
  if (reason.length > REJECT_REASON_MAX) {
    return {
      ok: false,
      message: `Sebep en fazla ${REJECT_REASON_MAX} karakter olabilir (şu an ${reason.length}). Kısaltıp tekrar deneyin.`,
    }
  }
  return { ok: true, reason }
}

/** The live counter's length: what the server will count, not what the box holds. */
export function reasonLength(raw: string): number {
  return raw.trim().length
}

/** What the server said, from either shape a refusal arrives in. */
export function serverMessageOf(
  error: BaseErrorResponse | BaseErrorResponse[] | null | undefined
): string | null {
  const first = Array.isArray(error) ? error[0] : error
  const message = first?.message
  return typeof message === 'string' && message.trim() !== '' ? message.trim() : null
}

const HAS_ZONE = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i
const PLANT_ZONE = 'Europe/Istanbul'

/**
 * `rejected_at` for the row, as the plant's clock.
 *
 * The column is `timestamp without time zone` written in UTC; read with the
 * browser's own zone it would show three hours early in Turkey. A stamp that
 * already names its zone is left as it is.
 */
export function formatRejectedAt(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim().replace(' ', 'T')
  if (raw === '' || !raw.includes('T')) return null
  const date = new Date(HAS_ZONE.test(raw) ? raw : `${raw}Z`)
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('tr-TR', {
    timeZone: PLANT_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  return `${part('day')}.${part('month')}.${part('year')} ${part('hour')}:${part('minute')}`
}

/** The opening sentence of the audit form's banner when it opens an audit for correction. */
export function correctionBannerText(rejected: boolean): string {
  return rejected
    ? 'Merkez Ekip bu denetimi düzeltme için ekibine geri gönderdi. Düzeltmeyi kaydettiğinizde puanlar ve yanıtlar bu denetimin üzerine yazılır ve denetim onaya yeniden gönderilir; yeni bir denetim açılmaz.'
    : 'Tamamlanmış bir denetimi düzenliyorsunuz. Kaydettiğinizde puanlar ve yanıtlar bu denetimin üzerine yazılır; yeni bir denetim açılmaz.'
}
