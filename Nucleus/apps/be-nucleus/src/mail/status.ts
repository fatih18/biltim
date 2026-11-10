import { defineRoute } from 'nucleus-core-ts/server'
import { type Sql, query } from '../db'
import { callerById, isAdmin } from '../guards/caller'
import { readExpired } from './expired'
import { isMailPackageInstalled } from './mailer'
import { readBacklog } from './queries'
import { latchMailRuntime, latchedMailRuntime } from './runtime'
import { MAIL_EXPIRED_LOOKBACK_DAYS, MAIL_MAX_ATTEMPTS, MAIL_WINDOW_HOURS, type MailRuntime } from './types'

/**
 * `GET /biltim/mail/status`: whether the install can send mail at all, through
 * which provider, from which address, and how many plan mails are still owed,
 * gave up or ran out of their window. Read only, for Merkez Ekip, Super Admin and the godmin (`isAdmin`;
 * Super Admin outranks Merkez Ekip on the users screen, so it is not left out).
 *
 * Mail needs two things on the server: the AZURE_EMAIL_* values AND the `@azure/communication-email` package
 * (an optional dependency of nucleus-core-ts, see `mailer.ts`), and a change to either takes a restart of the
 * backend. `providerConfigured` and `packageInstalled` let the screen tell "no Azure values" from "values
 * entered, package missing".
 *
 * It also hands the mail service to the worker (`runtime.ts`), like every
 * other host route that reads `ctx.nucleus`.
 */

export type MailStatusData = {
  available: boolean
  /**
   * A provider is switched on (nucleus names one: for Biltim the AZURE_EMAIL_* values are filled in) whether or not it
   * could start. `providerConfigured` with `available` false and `packageInstalled` false means "waiting for the
   * `@azure/communication-email` package".
   */
  providerConfigured: boolean
  /** The `@azure/communication-email` package can be loaded the way nucleus loads it (`mailer.ts`). */
  packageInstalled: boolean
  provider: ReturnType<MailRuntime['emailProvider']>
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

/** `packageInstalled` defaults to the real package lookup; a test hands in its own answer. */
export type MailStatusDeps = { read: Sql; packageInstalled?: () => boolean }

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
    providerConfigured: input.runtime?.emailProvider() != null,
    packageInstalled: (deps.packageInstalled ?? isMailPackageInstalled)(),
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
