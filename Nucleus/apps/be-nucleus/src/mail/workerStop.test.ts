import { afterEach, describe, expect, it } from 'bun:test'
import { MEMBER, PLAN_A, PLAN_B, TEAM_USERS, mailWorld, plan } from './mailKit'
import { forgetMailRuntime } from './runtime'
import { startMailWorker, stopMailWorker } from './worker'

/** Stopping the worker (index.ts: `onStop: [stopMailWorker, closePool]`) must not close the pool under a pass that is mid-send. */

afterEach(async () => {
  await stopMailWorker()
  forgetMailRuntime()
})

const USERS = TEAM_USERS

describe('stopping', () => {
  const gate = () => {
    let open: () => void = () => undefined
    const closed = new Promise<void>((resolve) => {
      open = resolve
    })
    return { closed, open }
  }

  function runningWorker(plans: ReturnType<typeof plan>[], send: Parameters<typeof mailWorld>[1], stopWaitMs?: number, guard?: () => boolean) {
    const w = mailWorld({ plans, members: [MEMBER], users: USERS }, send)
    const sql: typeof w.deps.sql = async (text, params) => {
      if (guard?.()) throw new Error('pool closed')
      return w.deps.sql(text, params)
    }
    const worker = startMailWorker({
      intervalMs: 3_600_000,
      sql,
      getRuntime: () => w.deps.runtime,
      log: w.deps.log,
      appUrl: () => null,
      ...(stopWaitMs === undefined ? {} : { stopWaitMs }),
    })
    return { w, worker }
  }

  it('waits for a pass that is mid-send, so the plan is given back before the pool is closed', async () => {
    const hold = gate()
    let poolClosed = false
    const { w, worker } = runningWorker(
      [plan(PLAN_A)],
      { send: async () => hold.closed.then(() => ({ success: false, error: 'smtp down' })) },
      undefined,
      () => poolClosed
    )
    const pass = worker.tick()
    await Bun.sleep(5)
    expect(w.world.plans[0]?.claimed).toBe(true)
    // What index.ts does: onStop runs stopMailWorker, and only then closePool.
    const stopping = worker.stop().then(() => {
      poolClosed = true
    })
    await Bun.sleep(30)
    expect(poolClosed).toBe(false)
    hold.open()
    await stopping
    expect(await pass).toMatchObject({ failed: 1 })
    expect(w.world.plans[0]).toMatchObject({ claimed: false, attempts: 1 })
    expect(w.lines.some((l) => l.includes('geri verilemedi'))).toBe(false)
  })

  it('lets the running pass finish the plan it is on and take no further one, and starts no new pass', async () => {
    const hold = gate()
    const { w, worker } = runningWorker([plan(PLAN_A), plan(PLAN_B)], { send: async () => hold.closed.then(() => ({ success: true })) })
    const pass = worker.tick()
    await Bun.sleep(5)
    const stopping = worker.stop()
    hold.open()
    await stopping
    expect(await pass).toMatchObject({ sent: 1 })
    expect(w.sent).toHaveLength(1)
    expect(w.world.plans[1]?.claimed).toBe(false)
    expect(await worker.tick()).toBeNull()
    expect(w.sent).toHaveLength(1)
  })

  it('gives up waiting after the cap, so a hung provider cannot hold the shutdown', async () => {
    const hold = gate()
    const { worker } = runningWorker([plan(PLAN_A)], { send: async () => hold.closed.then(() => ({ success: true })) }, 25)
    const pass = worker.tick()
    await Bun.sleep(5)
    const started = Date.now()
    await worker.stop()
    expect(Date.now() - started).toBeGreaterThanOrEqual(20)
    expect(Date.now() - started).toBeLessThan(2_000)
    hold.open()
    await pass
  })

  it('returns at once when no pass is running, and when it was never started', async () => {
    await stopMailWorker()
    const { worker } = runningWorker([], {})
    const started = Date.now()
    await worker.stop()
    expect(Date.now() - started).toBeLessThan(500)
  })
})
