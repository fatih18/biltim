import { afterEach, describe, expect, it } from 'bun:test'
import { FM1, LEADER, MEMBER, fakeRuntime, mailWorld, plan, user } from './mailKit'
import { forgetMailRuntime, latchMailRuntime } from './runtime'
import type { MailRuntime } from './types'
import { createMailTicker, startMailWorker, stopMailWorker } from './worker'

afterEach(async () => {
  await stopMailWorker()
  forgetMailRuntime()
})

const USERS = [user(LEADER, 'lider@firma.example'), user(MEMBER, 'uye@firma.example'), user(FM1, 'saha@firma.example')]

function tickerFor(options: Parameters<typeof mailWorld>[1] = {}) {
  const w = mailWorld({ plans: [plan()], members: [MEMBER], users: USERS }, options)
  const ticker = createMailTicker({
    sql: w.deps.sql,
    getRuntime: () => w.deps.runtime,
    log: w.deps.log,
    now: w.deps.now,
    appUrl: () => null,
  })
  return { w, ticker }
}

describe('a pass of the worker', () => {
  it('does nothing while no request has handed it the mail service', async () => {
    const w = mailWorld({ plans: [plan()], users: USERS })
    const ticker = createMailTicker({ sql: w.deps.sql, getRuntime: () => null, log: w.deps.log })
    expect(await ticker.tick()).toBeNull()
    expect(w.calls).toEqual([])
    expect(w.lines).toEqual([])
  })

  it('says once what the provider is, and sends the due plan mail', async () => {
    const { w, ticker } = tickerFor()
    expect(await ticker.tick()).toMatchObject({ available: true, sent: 1 })
    await ticker.tick()
    const ready = w.lines.filter((l) => l.includes('e-posta hazır'))
    expect(ready).toEqual(['[mail] e-posta hazır: sağlayıcı smtp, gönderen denetim@firma.example; plan postaları 60 sn aralıkla taranır'])
  })

  it('says "mail yapılandırılmamış" once when there is no provider, and touches nothing', async () => {
    const { w, ticker } = tickerFor({ available: false })
    await ticker.tick()
    await ticker.tick()
    expect(w.lines.filter((l) => l.includes('mail yapılandırılmamış'))).toHaveLength(1)
    expect(w.lines[0]).toContain('son 48 saatte açılan planlar')
    expect(w.calls).toEqual([])
    expect(w.sent).toEqual([])
  })

  it('writes the provider line again only when the state changes', async () => {
    const { w, ticker } = tickerFor({ available: false })
    await ticker.tick()
    w.setAvailable(true)
    await ticker.tick()
    w.setAvailable(false)
    await ticker.tick()
    const states = w.lines.filter((l) => l.includes('e-posta hazır') || l.includes('mail yapılandırılmamış'))
    expect(states.map((l) => (l.includes('hazır') ? 'hazır' : 'yok'))).toEqual(['yok', 'hazır', 'yok'])
  })

  it('does not start a second pass while the first is still sending', async () => {
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const { w, ticker } = tickerFor({ send: async () => gate.then(() => ({ success: true })) })
    const first = ticker.tick()
    await Promise.resolve()
    expect(await ticker.tick()).toBeNull()
    release()
    expect(await first).toMatchObject({ sent: 1 })
    expect(w.sent).toHaveLength(1)
  })

  it('logs a database failure and reports nothing, then works on the next pass', async () => {
    const w = mailWorld({ plans: [plan()], members: [MEMBER], users: USERS })
    let broken = true
    const ticker = createMailTicker({
      sql: async (text, params) => {
        if (broken) throw new Error('connection refused')
        return w.deps.sql(text, params)
      },
      getRuntime: () => w.deps.runtime,
      log: w.deps.log,
      appUrl: () => null,
    })
    expect(await ticker.tick()).toBeNull()
    expect(w.lines.join('\n')).toContain('[mail] tarama başarısız: connection refused')
    broken = false
    expect(await ticker.tick()).toMatchObject({ sent: 1 })
  })
})

describe('the first request after a start', () => {
  it('hands over the mail service and the worker looks at once, without waiting for the interval', async () => {
    const w = mailWorld({ plans: [plan()], members: [MEMBER], users: USERS })
    startMailWorker({ intervalMs: 3_600_000, sql: w.deps.sql, log: w.deps.log, appUrl: () => null })
    expect(w.sent).toEqual([])
    latchMailRuntime(fakeRuntime({}, w.events).runtime)
    await Bun.sleep(30)
    expect(w.lines.some((l) => l.includes('e-posta hazır'))).toBe(true)
    expect(w.world.plans[0]?.claimed).toBe(true)
  })

  it('looks at once at start when a request already handed it over', async () => {
    const w = mailWorld({ plans: [plan()], members: [MEMBER], users: USERS })
    latchMailRuntime(fakeRuntime({ available: false }, w.events).runtime)
    startMailWorker({ intervalMs: 3_600_000, sql: w.deps.sql, log: w.deps.log, appUrl: () => null })
    await Bun.sleep(30)
    expect(w.lines.some((l) => l.includes('mail yapılandırılmamış'))).toBe(true)
  })
})

describe('the timer', () => {
  it('runs a pass every interval, is one worker per process and stops when told to', async () => {
    let asked = 0
    const notYet = (): MailRuntime | null => {
      asked += 1
      return null
    }
    const lines: string[] = []
    const log = { info: (line: string) => void lines.push(line), error: (line: string) => void lines.push(line) }
    const worker = startMailWorker({ intervalMs: 5, getRuntime: notYet, log })
    expect(startMailWorker({ intervalMs: 5, getRuntime: notYet, log })).toBe(worker)
    expect(lines[0]).toContain('e-posta çalışanı başladı')
    await Bun.sleep(60)
    expect(asked).toBeGreaterThanOrEqual(2)
    worker.stop()
    const after = asked
    await Bun.sleep(40)
    expect(asked).toBe(after)
  })
})
