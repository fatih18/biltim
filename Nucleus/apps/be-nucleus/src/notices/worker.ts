import { type Sql, query, transaction as dbTransaction } from '../db'
import { type NoticeReport, runNoticePass } from './process'
import {
  NOTICE_FIRST_PASS_MS,
  NOTICE_POLL_MS,
  NOTICE_STOP_WAIT_MS,
  type NoticeLog,
  type Transaction,
} from './types'

/**
 * The background worker of the bell notices: every minute it looks for plans
 * created or completed inside the window and writes their notifications
 * (`process.ts`). It does not need the nucleus mail service, a mail provider or
 * a request to have been served, so the bell works on an install with no mail
 * credential at all. Nothing a person does in the app waits for it.
 */

/** Timers as functions that hand back their own canceller, so a test can run them by hand. */
export type NoticeTimers = {
  every: (run: () => void, ms: number) => () => void
  after: (run: () => void, ms: number) => () => void
}

export const realTimers: NoticeTimers = {
  every: (run, ms) => {
    const handle = setInterval(run, ms)
    handle.unref()
    return () => clearInterval(handle)
  },
  after: (run, ms) => {
    const handle = setTimeout(run, ms)
    handle.unref()
    return () => clearTimeout(handle)
  },
}

export type NoticeWorkerOptions = {
  sql?: Sql
  transaction?: Transaction
  intervalMs?: number
  /** When the first pass runs after the start. */
  firstPassMs?: number
  now?: () => number
  log?: NoticeLog
  timers?: NoticeTimers
  /** Overrides `NOTICE_STOP_WAIT_MS`; for tests. */
  stopWaitMs?: number
}

export type NoticeTicker = {
  /** One pass now. Null when the previous pass is still running, the ticker was halted or the pass failed. */
  tick: () => Promise<NoticeReport | null>
  /** From now on no pass starts, and a running one stops after the plan it is on. */
  halt: () => void
  /** Settles when no pass is running (at once if none is). Never rejects. */
  settled: () => Promise<void>
}

export type NoticeWorker = NoticeTicker & { stop: () => Promise<void> }

const consoleLog: NoticeLog = { info: (line) => console.log(line), error: (line) => console.error(line) }

/** The pass without the timers, so a test (or `startNoticeWorker`) decides when it runs. A failing pass logs one line and never throws. */
export function createNoticeTicker(options: NoticeWorkerOptions = {}): NoticeTicker {
  const sql = options.sql ?? query
  const transaction = options.transaction ?? dbTransaction
  const now = options.now ?? Date.now
  const log = options.log ?? consoleLog
  const resting = new Map<string, number>()

  let running = false
  let halted = false
  let inFlight: Promise<NoticeReport | null> | null = null

  const pass = async (): Promise<NoticeReport | null> => {
    try {
      return await runNoticePass({ sql, transaction, now, resting, log, stopped: () => halted })
    } catch (error) {
      log.error(`[bildirim] tarama başarısız: ${error instanceof Error ? error.message : String(error)}`)
      return null
    } finally {
      running = false
      inFlight = null
    }
  }

  const tick = (): Promise<NoticeReport | null> => {
    if (running || halted) return Promise.resolve(null)
    running = true
    inFlight = pass()
    return inFlight
  }

  const settled = async (): Promise<void> => {
    await inFlight
  }

  return { tick, halt: () => void (halted = true), settled }
}

type Running = { worker: NoticeWorker; cancel: () => void; ticker: NoticeTicker; stopWaitMs: number }

let current: Running | null = null

/** Starts the one worker of the process (a second call keeps the first): a pass every minute and a first one shortly after the start. */
export function startNoticeWorker(options: NoticeWorkerOptions = {}): NoticeWorker {
  if (current) return current.worker
  const ticker = createNoticeTicker(options)
  const timers = options.timers ?? realTimers
  const intervalMs = options.intervalMs ?? NOTICE_POLL_MS
  const log = options.log ?? consoleLog

  const cancelEvery = timers.every(() => void ticker.tick(), intervalMs)
  const cancelFirst = timers.after(() => void ticker.tick(), options.firstPassMs ?? NOTICE_FIRST_PASS_MS)
  const cancel = () => {
    cancelEvery()
    cancelFirst()
  }

  const worker: NoticeWorker = { ...ticker, stop: stopNoticeWorker }
  current = { worker, cancel, ticker, stopWaitMs: options.stopWaitMs ?? NOTICE_STOP_WAIT_MS }
  log.info(`[bildirim] bildirim çalışanı başladı (${Math.round(intervalMs / 1000)} sn aralık); yeni plan ve tamamlanan denetim bildirimleri uygulamadaki zilde görünür`)
  return worker
}

/**
 * Stops the timers and waits for a pass that is writing (at most `stopWaitMs`),
 * so the database pool is not closed under it. The pass is told to stop after
 * the plan it is on.
 */
export async function stopNoticeWorker(): Promise<void> {
  if (!current) return
  const { cancel, ticker, stopWaitMs } = current
  current = null
  cancel()
  ticker.halt()
  let giveUp: ReturnType<typeof setTimeout> | undefined
  const capped = new Promise<void>((resolve) => {
    giveUp = setTimeout(resolve, stopWaitMs)
  })
  await Promise.race([ticker.settled(), capped])
  clearTimeout(giveUp)
}
