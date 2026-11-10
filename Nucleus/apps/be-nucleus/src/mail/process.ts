import type { EmailPayload } from 'nucleus-core-ts'
import { preparePlanMail } from './planMail'
import { claimPlan, findCandidates, releasePlan } from './queries'
import {
  KIND_TR,
  MAIL_BATCH,
  MAIL_KINDS,
  MAIL_MAX_ATTEMPTS,
  MAIL_RETRY_MINUTES,
  MAIL_SEND_TIMEOUT_MS,
  MAIL_WINDOW_HOURS,
  type MailContent,
  type MailKind,
  type PlanMailDeps,
} from './types'

/**
 * What happened to one plan:
 *  - `sent`: the provider took the mail;
 *  - `nobody`: nobody could be mailed (no account with an address); the plan is settled, not retried;
 *  - `lost`: another tick or process took the plan first, or it stopped being due;
 *  - `failed`: the send failed; the plan was given back.
 */
export type PlanOutcome = 'sent' | 'nobody' | 'lost' | 'failed'

const retryKey = (kind: MailKind, planId: string): string => `${kind}:${planId}`

/**
 * One message, the audience in bcc. People who are mailed together do not need
 * each other's addresses, and a mail leaves the building (nucleus's own advice
 * for a broadcast). `to` holds the sender's own box; if the provider reports
 * none, the first recipient takes its place.
 */
export function envelope(sender: string, recipients: string[], content: MailContent): EmailPayload {
  const to = sender || recipients[0] || ''
  const bcc = sender ? recipients : recipients.slice(1)
  return { to, ...(bcc.length > 0 ? { bcc } : {}), subject: content.subject, text: content.text, html: content.html }
}

/** Gives `work` `ms` milliseconds; a late answer is a failure, and what it eventually does is not waited for. */
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`e-posta sağlayıcısı ${Math.round(ms / 1000)} saniyede yanıt vermedi`)), ms)
  })
  return Promise.race([work, late]).finally(() => clearTimeout(timer))
}

/** How long to leave a plan alone after its `attempts`-th failure; the last attempt is not followed by one. */
export function retryDelayMs(attempts: number): number {
  const minutes = MAIL_RETRY_MINUTES[Math.min(Math.max(attempts, 1), MAIL_RETRY_MINUTES.length) - 1] ?? 0
  return minutes * 60_000
}

/**
 * Gives a plan back after a failed send, so a later tick takes it again, and
 * says why in the log: plan, how many people, the attempt and the provider's
 * own words. No provider at that moment is a deployment state, not this
 * plan's failure, so it costs no attempt.
 */
async function giveBack(kind: MailKind, planId: string, people: number, reason: string, deps: PlanMailDeps): Promise<PlanOutcome> {
  const { log } = deps
  const available = deps.runtime.isEmailAvailable()
  try {
    const attempts = await releasePlan(deps.sql, kind, planId, available)
    if (!available) {
      log.info(`[mail] ${KIND_TR[kind]} gönderilemedi, e-posta sağlayıcısı kullanılamıyor: plan ${planId}; hak harcanmadı, sağlayıcı dönünce yeniden denenecek`)
    } else {
      deps.retryAt.set(retryKey(kind, planId), deps.now() + retryDelayMs(attempts))
      const spent = attempts >= MAIL_MAX_ATTEMPTS ? '; haklar bitti, bu plan için yeniden denenmeyecek' : ''
      log.error(`[mail] ${KIND_TR[kind]} gönderilemedi: plan ${planId}, ${people} alıcı, deneme ${attempts}/${MAIL_MAX_ATTEMPTS}${spent}. Hata: ${reason}`)
    }
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error)
    log.error(`[mail] ${KIND_TR[kind]}: plan ${planId} geri verilemedi, bir daha denenmeyecek (${people} alıcı). Gönderim hatası: ${reason}. Geri verme hatası: ${why}`)
  }
  return 'failed'
}

/**
 * Takes one plan, writes its mail and sends it. The order is the point: the
 * marker is set FIRST, so a second tick or a second process finds nothing to
 * send, and it is cleared again only when the send failed.
 */
export async function processPlan(kind: MailKind, planId: string, deps: PlanMailDeps): Promise<PlanOutcome> {
  const { sql, runtime, log } = deps
  if (!(await claimPlan(sql, kind, planId))) return 'lost'

  let people = 0
  try {
    const mail = await preparePlanMail(sql, kind, planId, deps.appUrl)
    if (!mail) {
      log.info(`[mail] ${KIND_TR[kind]}: plan ${planId} artık yok, atlandı`)
      return 'nobody'
    }
    people = mail.recipients.length
    if (people === 0) {
      const { missing, inactive, noAddress } = mail.skipped
      log.info(`[mail] ${KIND_TR[kind]}: plan ${planId} için posta atılacak kimse yok (hesabı olmayan ${missing}, pasif ${inactive}, adresi olmayan ${noAddress}); plan tamamlandı sayıldı`)
      return 'nobody'
    }

    const message = envelope(runtime.emailSenderAddress(), mail.recipients, mail.content)
    const result = await withTimeout(runtime.sendEmail(message), deps.sendTimeoutMs ?? MAIL_SEND_TIMEOUT_MS)
    if (!result.success) return giveBack(kind, planId, people, result.error || 'sağlayıcı hata nedenini bildirmedi', deps)

    deps.retryAt.delete(retryKey(kind, planId))
    const refused = result.rejected?.length ?? 0
    log.info(`[mail] ${KIND_TR[kind]} gönderildi: plan ${planId}, ${people} alıcı${refused > 0 ? `, ${refused} adres sağlayıcı tarafından reddedildi` : ''}`)
    return 'sent'
  } catch (error) {
    return giveBack(kind, planId, people, error instanceof Error ? error.message : String(error), deps)
  }
}

export type TickReport = {
  /** False: no provider is configured, so nothing was read or sent. */
  available: boolean
  sent: number
  nobody: number
  lost: number
  failed: number
  /** Plans left alone because their retry time has not come. */
  waiting: number
}

/** Entries older than the window belong to plans the window has left; their wait is over anyway. */
function pruneRetries(retryAt: Map<string, number>, now: number): void {
  const horizon = now - MAIL_WINDOW_HOURS * 3_600_000
  for (const [key, at] of retryAt) if (at < horizon) retryAt.delete(key)
}

/**
 * One pass: while a provider is configured, the plans each mail is still owed
 * for, oldest first, at most `MAIL_BATCH` per kind. Without a provider it
 * answers at once and touches neither the database nor the network.
 */
export async function runMailTick(deps: PlanMailDeps): Promise<TickReport> {
  const report: TickReport = { available: false, sent: 0, nobody: 0, lost: 0, failed: 0, waiting: 0 }
  if (!deps.runtime.isEmailAvailable()) return report
  report.available = true
  pruneRetries(deps.retryAt, deps.now())

  for (const kind of MAIL_KINDS) {
    // Plans still waiting out a failure take a slot in the list but not in the batch.
    const resting = [...deps.retryAt.keys()].filter((key) => key.startsWith(`${kind}:`)).length
    const planIds = await findCandidates(deps.sql, kind, MAIL_BATCH + resting)
    let handled = 0
    for (const planId of planIds) {
      if (handled >= MAIL_BATCH) break
      if ((deps.retryAt.get(retryKey(kind, planId)) ?? 0) > deps.now()) {
        report.waiting += 1
        continue
      }
      handled += 1
      report[await processPlan(kind, planId, deps)] += 1
    }
  }
  return report
}
