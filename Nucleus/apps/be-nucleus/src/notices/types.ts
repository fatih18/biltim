import type { Sql } from '../db'
import { MAIL_WINDOW_HOURS, type MailKind, type MailLog } from '../mail/types'

/**
 * In-app bell notices for the two plan events of the customer notes R70 and R63.
 *
 * The plan mails (`src/mail`) need a mail provider; these do not. The people the
 * mails are meant for find the same news in the app's bell at once, and the
 * mail layers on top when a provider exists. Nothing here reads or writes a
 * mail marker, and nothing here needs the nucleus mail service.
 *
 *   - `created`: an audit plan was created (R70), told to its team and to the
 *     field manager(s) of its location;
 *   - `completed`: an audit was approved (R63), told to the field manager(s) of
 *     its location.
 */
export type NoticeKind = 'created' | 'completed'

export const NOTICE_KINDS: readonly NoticeKind[] = ['created', 'completed']

export type NoticeSpec = {
  /** The mail the notice mirrors; its words and its window come from there. */
  mailKind: MailKind
  /** The notification's `type` (the bell lists every type alike). */
  type: string
  /** The notification's `source` is this prefix and the plan id: the dedupe key together with the user. */
  sourcePrefix: string
}

export const NOTICE_SPEC: Record<NoticeKind, NoticeSpec> = {
  created: { mailKind: 'invitation', type: 'plan_created', sourcePrefix: 'plan-created:' },
  completed: { mailKind: 'completion', type: 'plan_completed', sourcePrefix: 'plan-completed:' },
}

/** The same window as the mail: a plan older than this is history, and a restart never announces it. */
export const NOTICE_WINDOW_HOURS = MAIL_WINDOW_HOURS

/** A completed plan only notifies while its audit is this recent, so editing an old plan (which refreshes `updated_at`) tells nobody. */
export const NOTICE_AUDIT_DAYS = 14

/** Plans handled per pass, both kinds together, so a mass planning is spread over minutes. */
export const NOTICE_BATCH = 20

export const NOTICE_POLL_MS = 60_000

/** The first pass runs this long after the worker starts, not at once: the boot fixes have just run. */
export const NOTICE_FIRST_PASS_MS = 5_000

/** A plan nobody could be told about, or one that failed, is left alone this long before it is looked at again. */
export const NOTICE_RETRY_MS = 10 * 60_000

/** How long stopping waits for a running pass before the database pool may be closed under it. */
export const NOTICE_STOP_WAIT_MS = 10_000

/** `main.notifications` column widths (`title` varchar 255, `body` varchar 1000). */
export const NOTICE_TITLE_MAX = 255
export const NOTICE_BODY_MAX = 1000

export type NoticeLog = MailLog

/** Runs `work` on one connection, committing together or not at all (`db.ts` `transaction`). */
export type Transaction = <T>(work: (sql: Sql) => Promise<T>) => Promise<T>

export type NoticeDeps = {
  sql: Sql
  transaction: Transaction
  now: () => number
  /** `<kind>:<planId>` -> when it was set aside; lives in the worker, so a restart looks at everything again. */
  resting: Map<string, number>
  log: NoticeLog
  /** True once the worker is being stopped: a pass takes no further plan. */
  stopped?: () => boolean
}

/** What one plan event needs written: who, and what the bell says. `recipients` empty means nobody is to be told. */
export type PreparedNotice = {
  recipients: string[]
  title: string
  body: string
}
