import { defineRoute } from 'nucleus-core-ts/server'
import { type Sql, query } from '../db'
import { callerById, isAdmin } from '../guards/caller'
import { readExpired } from './expired'
import { readBacklog } from './queries'
import { latchMailRuntime, latchedMailRuntime } from './runtime'
import { MAIL_EXPIRED_LOOKBACK_DAYS, MAIL_MAX_ATTEMPTS, MAIL_WINDOW_HOURS, type MailRuntime } from './types'

/**
 * `GET /biltim/mail/status`: whether the install can send mail at all, through
 * which provider, from which address, and how many plan mails are still owed,
 * gave up or ran out of their window. Read only, for Merkez Ekip, Super Admin and the godmin (`isAdmin`;
 * Super Admin outranks Merkez Ekip on the users screen, so it is not left out).
 *
 * It also hands the mail service to the worker (`runtime.ts`), like every
 * other host route that reads `ctx.nucleus`.
 */

export type MailStatusData = {
  available: boolean
  provider: 'azure' | 'gmail' | 'smtp' | null
  senderAddress: string
  windowHours: number
  maxAttempts: number
  pendingInvitations: number
  pendingCompletions: number
  failedInvitations: number
  failedCompletions: number
  expiredInvitations: number
  expiredCompletions: number
  /** How many days back `expired` looks. */
  expiredDays: number
  /** Plans still owed a mail inside the window, both kinds together. */
  pending: number
  /** Plans that used their attempts up inside the window, both kinds together. */
  failed: number
  /** Plans of the last `expiredDays` days that left the window with no mail sent, both kinds together. */
  expired: number
}

export type MailStatusBody = {
  success: boolean
  isSuccess?: boolean
  message?: string
  errors?: Array<{ message: string }>
  data?: MailStatusData
}

export type MailStatusOutcome = { status: number; body: MailStatusBody }

export type MailStatusDeps = { read: Sql }

const defaultDeps: MailStatusDeps = { read: query }

const failure = (status: number, message: string): MailStatusOutcome => ({
  status,
  body: { success: false, isSuccess: false, message, errors: [{ message }] },
})

export async function mailStatus(
  input: { userId: string | null; runtime: MailRuntime | null },
  deps: MailStatusDeps = defaultDeps
): Promise<MailStatusOutcome> {
  const caller = input.userId ? await callerById(input.userId, deps.read) : null
  if (!caller) return failure(401, 'Oturum bulunamadı.')
  if (!isAdmin(caller)) {
    return failure(
      403,
      "E-posta durumunu yalnız Merkez Ekip, Super Admin ve godmin görebilir. Plan e-postaları hakkında bilgi gerekiyorsa Merkez Ekip'ten isteyin."
    )
  }

  const [backlog, expired] = await Promise.all([readBacklog(deps.read), readExpired(deps.read)])
  const available = input.runtime?.isEmailAvailable() === true
  const data: MailStatusData = {
    available,
    provider: available ? (input.runtime?.emailProvider() ?? null) : null,
    senderAddress: available ? (input.runtime?.emailSenderAddress() ?? '') : '',
    windowHours: MAIL_WINDOW_HOURS,
    maxAttempts: MAIL_MAX_ATTEMPTS,
    ...backlog,
    ...expired,
    expiredDays: MAIL_EXPIRED_LOOKBACK_DAYS,
    pending: backlog.pendingInvitations + backlog.pendingCompletions,
    failed: backlog.failedInvitations + backlog.failedCompletions,
    expired: expired.expiredInvitations + expired.expiredCompletions,
  }
  return { status: 200, body: { success: true, data } }
}

/** The route over any database: the server takes the default, a test hands in a fake. */
export const createMailStatusRoute = (deps: MailStatusDeps = defaultDeps) =>
  defineRoute({
    method: 'GET',
    path: '/mail/status',
    detail: {
      tags: ['Biltim'],
      summary: 'Mail service state and the plan mails still owed (Merkez Ekip, Super Admin, godmin)',
    },
    handler: async (ctx) => {
      latchMailRuntime(ctx.nucleus)
      const result = await mailStatus(
        { userId: ctx.request.headers.get('x-user-id'), runtime: latchedMailRuntime() },
        deps
      )
      ctx.set.status = result.status
      return result.body
    },
  })

export const mailStatusRoute = createMailStatusRoute()
