import { afterEach, describe, expect, it } from 'bun:test'
import { MEMBER, TEAM_USERS } from '../mail/mailKit'
import { type World, noticeWorld, plan } from './noticeKit'
import { type NoticeTimers, createNoticeTicker, startNoticeWorker, stopNoticeWorker } from './worker'

afterEach(async () => {
  await stopNoticeWorker()
})

type FakeTimer = { run: () => void; ms: number; cancelled: boolean }

function fakeTimers() {
  const every: FakeTimer[] = []
  const after: FakeTimer[] = []
  const make = (into: FakeTimer[]) => (run: () => void, ms: number) => {
    const timer = { run, ms, cancelled: false }
    into.push(timer)
    return () => void (timer.cancelled = true)
  }
  const timers: NoticeTimers = { every: make(every), after: make(after) }
  return { timers, every, after }
}

const oneNewPlan = (): World => ({ plans: [plan()], members: [MEMBER], users: TEAM_USERS })

function gate() {
  let open: () => void = () => undefined
  const closed = new Promise<void>((resolve) => {
    open = resolve
  })
  return { closed, open }
}

describe('the timers', () => {
  it('start one pass every 60 seconds and a first one shortly after the boot', async () => {
    const w = noticeWorld(oneNewPlan())
    const t = fakeTimers()
    const worker = startNoticeWorker({ sql: w.sql, transaction: w.transaction, log: w.deps.log, timers: t.timers })
    expect(t.every.map((x) => x.ms)).toEqual([60_000])
    expect(t.after).toHaveLength(1)
    expect(t.after[0]?.ms).toBeGreaterThan(0)
    expect(t.after[0]?.ms).toBeLessThanOrEqual(10_000)
    expect(w.calls).toEqual([])
    expect(w.lines.join('\n')).toContain('bildirim çalışanı başladı (60 sn aralık)')

    t.after[0]?.run()
    await worker.settled()
    expect(w.notifications).toHaveLength(4)
  })

  it('keep the one worker of the process when started twice', () => {
    const w = noticeWorld(oneNewPlan())
    const t = fakeTimers()
    const first = startNoticeWorker({ sql: w.sql, transaction: w.transaction, log: w.deps.log, timers: t.timers })
    const second = startNoticeWorker({ sql: w.sql, transaction: w.transaction, log: w.deps.log, timers: t.timers })
    expect(second).toBe(first)
    expect(t.every).toHaveLength(1)
    expect(t.after).toHaveLength(1)
  })

  it('stop with the worker: both are cancelled and a late fire starts nothing', async () => {
    const w = noticeWorld(oneNewPlan())
    const t = fakeTimers()
    const worker = startNoticeWorker({ sql: w.sql, transaction: w.transaction, log: w.deps.log, timers: t.timers })
    await worker.stop()
    expect(t.every[0]?.cancelled).toBe(true)
    expect(t.after[0]?.cancelled).toBe(true)
    t.every[0]?.run()
    await worker.settled()
    expect(w.calls).toEqual([])
    expect(await worker.tick()).toBeNull()
  })

  it('can be started again after a stop', async () => {
    const w = noticeWorld(oneNewPlan())
    const t = fakeTimers()
    await startNoticeWorker({ sql: w.sql, transaction: w.transaction, log: w.deps.log, timers: t.timers }).stop()
    startNoticeWorker({ sql: w.sql, transaction: w.transaction, log: w.deps.log, timers: t.timers })
    expect(t.every).toHaveLength(2)
    expect(t.every[1]?.cancelled).toBe(false)
  })

  it('stopping a worker that was never started returns at once', async () => {
    await stopNoticeWorker()
    await stopNoticeWorker()
  })
})

describe('a pass that fails', () => {
  it('logs one line and does not throw, and the next pass works again', async () => {
    const w = noticeWorld({ ...oneNewPlan(), brokenCandidates: 'connection terminated' })
    const ticker = createNoticeTicker({ sql: w.sql, transaction: w.transaction, log: w.deps.log })
    expect(await ticker.tick()).toBeNull()
    expect(w.lines).toEqual(['HATA [bildirim] tarama başarısız: connection terminated'])
    expect(w.notifications).toEqual([])

    const healthy = noticeWorld(oneNewPlan())
    const again = createNoticeTicker({ sql: healthy.sql, transaction: healthy.transaction, log: healthy.deps.log })
    expect(await again.tick()).toMatchObject({ plans: 1, added: 4 })
  })

  it('never lets the timer’s own call reject, even when the pass throws', async () => {
    const w = noticeWorld({ ...oneNewPlan(), brokenCandidates: 'boom' })
    const t = fakeTimers()
    const worker = startNoticeWorker({ sql: w.sql, transaction: w.transaction, log: w.deps.log, timers: t.timers })
    t.every[0]?.run()
    await worker.settled()
    expect(w.lines.filter((l) => l.startsWith('HATA'))).toHaveLength(1)
  })
})

describe('overlap and stopping', () => {
  it('does not start a pass while the previous one is still running', async () => {
    const hold = gate()
    const w = noticeWorld(oneNewPlan())
    const ticker = createNoticeTicker({
      sql: async (text, params) => {
        await hold.closed
        return w.sql(text, params)
      },
      transaction: w.transaction,
      log: w.deps.log,
    })
    const first = ticker.tick()
    expect(await ticker.tick()).toBeNull()
    hold.open()
    expect(await first).toMatchObject({ added: 4 })
    expect(await ticker.tick()).toMatchObject({ plans: 0 })
  })

  it('waits for a pass that is writing, so the pool is not closed under it', async () => {
    const hold = gate()
    const w = noticeWorld(oneNewPlan())
    let poolClosed = false
    const t = fakeTimers()
    const worker = startNoticeWorker({
      sql: async (text, params) => {
        await hold.closed
        return w.sql(text, params)
      },
      transaction: w.transaction,
      log: w.deps.log,
      timers: t.timers,
    })
    const pass = worker.tick()
    // What index.ts does: onStop runs stopNoticeWorker, and only then closePool.
    const stopping = worker.stop().then(() => {
      poolClosed = true
    })
    await Bun.sleep(30)
    expect(poolClosed).toBe(false)
    hold.open()
    await stopping
    expect(poolClosed).toBe(true)
    await pass
  })

  it('gives up waiting after the cap, so a hung database cannot hold the shutdown', async () => {
    const hold = gate()
    const w = noticeWorld(oneNewPlan())
    const worker = startNoticeWorker({
      sql: async (text, params) => {
        await hold.closed
        return w.sql(text, params)
      },
      transaction: w.transaction,
      log: w.deps.log,
      timers: fakeTimers().timers,
      stopWaitMs: 25,
    })
    const pass = worker.tick()
    const started = Date.now()
    await worker.stop()
    expect(Date.now() - started).toBeGreaterThanOrEqual(20)
    expect(Date.now() - started).toBeLessThan(2_000)
    hold.open()
    await pass
  })
})

describe('independence and wiring', () => {
  const read = (path: string) => Bun.file(new URL(path, import.meta.url)).text()

  it('the notice code does not touch the mail runtime, the mail worker or a mail provider', async () => {
    for (const file of ['worker.ts', 'process.ts', 'prepare.ts', 'queries.ts', 'audience.ts', 'texts.ts', 'types.ts']) {
      const source = await read(`./${file}`)
      expect(source).not.toMatch(/mail\/runtime|mail\/worker|mail\/process|sendEmail|isEmailAvailable|latchedMailRuntime/)
    }
  })

  it('index.ts starts the worker next to the mail worker and stops it in the same onStop list, before the pool closes', async () => {
    const source = await read('../index.ts')
    expect(source).toContain("import { startNoticeWorker, stopNoticeWorker } from './notices/worker'")
    expect(source).toMatch(/startMailWorker\(\)\s+\/\/[^\n]*\s+startNoticeWorker\(\)/)
    expect(source).toContain('onStop: [stopMailWorker, stopNoticeWorker, closePool],')
  })
})
