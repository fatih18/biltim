import { type Sql, query } from '../db'
import { type TickReport, runMailTick } from './process'
import { latchedMailRuntime, onMailRuntimeLatched } from './runtime'
import { appBaseUrl } from './texts'
import { MAIL_POLL_MS, MAIL_WINDOW_HOURS, type MailLog, type MailRuntime } from './types'

/**
 * The background worker: every minute it asks nucleus's mail service whether a
 * provider is configured and, if so, sends the plan mails that are due
 * (`process.ts`). It is the only place that sends, so nothing a person does in
 * the app can be slowed down or broken by a mail.
 */

export type WorkerOptions = {
  sql?: Sql
  /** The mail service, or null while no request has handed it over yet (`runtime.ts`). */
  getRuntime?: () => MailRuntime | null
  intervalMs?: number
  appUrl?: () => string | null
  now?: () => number
  log?: MailLog
  /** Overrides `MAIL_STOP_WAIT_MS`; for tests. */
  stopWaitMs?: number
}

export type MailTicker = {
  /** One pass now. Null when there is no mail service yet, the previous pass is still running or the ticker was halted. */
  tick: () => Promise<TickReport | null>
  /** From now on no pass starts, and a running one stops after the plan it is on. */
  halt: () => void
  /** Settles when no pass is running (at once if none is). Never rejects. */
  settled: () => Promise<void>
}

export type MailWorker = MailTicker & { stop: () => Promise<void> }

/** How long stopping waits for a pass that is mid-send before the database pool may be closed under it. */
export const MAIL_STOP_WAIT_MS = 10_000

const consoleLog: MailLog = { info: (line) => console.log(line), error: (line) => console.error(line) }

/** What the log says about the provider; it is written again only when this text changes. */
export function describeProvider(runtime: MailRuntime): string {
  if (!runtime.isEmailAvailable()) {
    return `[mail] mail yapılandırılmamış: sağlayıcı kurulana kadar hiçbir şey gönderilmez. Kurulunca yalnız son ${MAIL_WINDOW_HOURS} saatte açılan planlar için posta atılır`
  }
  const sender = runtime.emailSenderAddress() || 'gönderen adres bilinmiyor'
  return `[mail] e-posta hazır: sağlayıcı ${runtime.emailProvider() ?? 'bilinmiyor'}, gönderen ${sender}; plan postaları ${MAIL_POLL_MS / 1000} sn aralıkla taranır`
}

/** The pass without the timer, so a test (or `startMailWorker`) decides when it runs. */
export function createMailTicker(options: WorkerOptions = {}): MailTicker {
  const sql = options.sql ?? query
  const getRuntime = options.getRuntime ?? latchedMailRuntime
  const appUrl = options.appUrl ?? (() => appBaseUrl())
  const now = options.now ?? Date.now
  const log = options.log ?? consoleLog
  const retryAt = new Map<string, number>()

  let running = false
  let halted = false
  let announced = ''
  let inFlight: Promise<TickReport | null> | null = null

  const pass = async (runtime: MailRuntime): Promise<TickReport | null> => {
    try {
      const line = describeProvider(runtime)
      if (line !== announced) {
        announced = line
        log.info(line)
      }
      return await runMailTick({ sql, runtime, appUrl: appUrl(), now, retryAt, log, stopped: () => halted })
    } catch (error) {
      log.error(`[mail] tarama başarısız: ${error instanceof Error ? error.message : String(error)}`)
      return null
    } finally {
      running = false
      inFlight = null
    }
  }

  const tick = (): Promise<TickReport | null> => {
    const runtime = getRuntime()
    if (!runtime || running || halted) return Promise.resolve(null)
    running = true
    inFlight = pass(runtime)
    return inFlight
  }

  const settled = async (): Promise<void> => {
    await inFlight
  }

  return { tick, halt: () => void (halted = true), settled }
}

let current: { worker: MailWorker; timer: ReturnType<typeof setInterval>; ticker: MailTicker; stopWaitMs: number } | null = null

/** Starts the one worker of the process (a second call keeps the first). */
export function startMailWorker(options: WorkerOptions = {}): MailWorker {
  if (current) return current.worker
  const ticker = createMailTicker(options)
  const intervalMs = options.intervalMs ?? MAIL_POLL_MS
  const log = options.log ?? consoleLog
  const timer = setInterval(() => void ticker.tick(), intervalMs)
  timer.unref()
  // The first request after a start hands over the mail service: look at once, not a minute later.
  const soon = () => void setTimeout(() => void ticker.tick(), 0)
  onMailRuntimeLatched(soon)
  if ((options.getRuntime ?? latchedMailRuntime)()) soon()
  const worker: MailWorker = { ...ticker, stop: stopMailWorker }
  current = { worker, timer, ticker, stopWaitMs: options.stopWaitMs ?? MAIL_STOP_WAIT_MS }
  log.info(`[mail] e-posta çalışanı başladı (${Math.round(intervalMs / 1000)} sn aralık); sağlayıcı durumu ilk sayfa isteğinden sonra loglanır`)
  return worker
}

/**
 * Stops the timer and waits for a pass that is mid-send (at most `stopWaitMs`)
 * so the database pool is not closed under it: a plan whose release then failed
 * would keep its marker and never be mailed. The pass is told to stop after the
 * plan it is on, so the wait is one send, not the whole batch.
 */
export async function stopMailWorker(): Promise<void> {
  if (!current) return
  const { timer, ticker, stopWaitMs } = current
  clearInterval(timer)
  onMailRuntimeLatched(null)
  current = null
  ticker.halt()
  let giveUp: ReturnType<typeof setTimeout> | undefined
  const capped = new Promise<void>((resolve) => {
    giveUp = setTimeout(resolve, stopWaitMs)
  })
  await Promise.race([ticker.settled(), capped])
  clearTimeout(giveUp)
}
