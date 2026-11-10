import type { EmailPayload, EmailSendResult } from 'nucleus-core-ts'
import type { Sql } from '../db'

/**
 * Plan mails (customer notes R70 and R63).
 *
 * Two mails, both sent by the background worker in this folder and nowhere
 * else, so a mail problem can never reach the request that created or
 * completed a plan:
 *
 *   - `invitation`: a freshly created audit plan, to its team and to the field
 *     manager(s) of its location (R70);
 *   - `completion`: an approved audit, to the field manager(s) of its location
 *     (R63, "her denetim sonunda saha müdürüne mail").
 */
export type MailKind = 'invitation' | 'completion'

export const MAIL_KINDS: readonly MailKind[] = ['invitation', 'completion']

/**
 * The part of nucleus's runtime the worker uses (`nucleus-core-ts` 0.10.115,
 * `NucleusRuntime`). Declared here because the framework's own declaration
 * imports its email types by a path outside the package, which a host cannot
 * resolve; the shape is the same and `NucleusRuntime` is assignable to it.
 */
export type MailRuntime = {
  sendEmail(payload: EmailPayload): Promise<EmailSendResult>
  isEmailAvailable(): boolean
  emailProvider(): 'azure' | 'gmail' | 'smtp' | null
  emailSenderAddress(): string
}

/**
 * How far back a plan still counts as "new". When mail is configured later it
 * must not announce old plans, and a mail outage shorter than this heals itself.
 */
export const MAIL_WINDOW_HOURS = 48

/** Real send failures per plan and kind; a plan that used them up is reported, not retried. */
export const MAIL_MAX_ATTEMPTS = 5

export const MAIL_POLL_MS = 60_000

/** A provider that does not answer in this long has failed: without it one hung connection would stop every later mail. */
export const MAIL_SEND_TIMEOUT_MS = 60_000

/** Plans handled per kind and tick, so a mass planning is spread over minutes, not sent in one burst. */
export const MAIL_BATCH = 10

/**
 * Wait after the 1st, 2nd, 3rd and 4th failed attempt (the 5th is the last): 10 minutes, 1 hour, 6 hours,
 * 24 hours. The five attempts land about 31 hours after the first, so they cover most of the 48-hour window
 * and an outage of a working day still heals itself.
 */
export const MAIL_RETRY_MINUTES: readonly number[] = [10, 60, 360, 1440]

export type MailLog = {
  info: (line: string) => void
  error: (line: string) => void
}

/** What one plan's mail needs. `retryAt` lives in the worker: a restart starts with no waiting. */
export type PlanMailDeps = {
  sql: Sql
  runtime: MailRuntime
  /** The app's address for the link in the mail, or null to leave the link out. */
  appUrl: string | null
  now: () => number
  retryAt: Map<string, number>
  log: MailLog
  /** Overrides `MAIL_SEND_TIMEOUT_MS`; for tests. */
  sendTimeoutMs?: number
  /** True once the worker is being stopped: a pass finishes the plan it is on and takes no further one. */
  stopped?: () => boolean
}

/** The subject and the two bodies of one mail. */
export type MailContent = {
  subject: string
  text: string
  html: string
}

export const KIND_TR: Record<MailKind, string> = {
  invitation: 'plan daveti',
  completion: 'denetim sonucu',
}
