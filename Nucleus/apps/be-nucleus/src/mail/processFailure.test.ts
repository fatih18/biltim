import { describe, expect, it } from 'bun:test'
import { MEMBER, PLAN_A, TEAM_USERS, mailWorld, oneDuePlan, plan } from './mailKit'
import { processPlan, retryDelayMs, runMailTick } from './process'
import { MAIL_MAX_ATTEMPTS } from './types'

const SMTP_DOWN = { success: false, error: '421 4.7.0 smtp.firma.example: bağlantı zaman aşımı' }

describe('a failed send', () => {
  it('releases the claim, counts the attempt and logs the plan, the people and the provider’s words', async () => {
    const w = mailWorld(oneDuePlan(), { send: async () => SMTP_DOWN })
    expect(await processPlan('invitation', PLAN_A, w.deps)).toBe('failed')
    expect(w.events).toEqual([`claim:${PLAN_A}`, 'send', `release:${PLAN_A}`])
    expect(w.world.plans[0]).toMatchObject({ claimed: false, attempts: 1 })
    const line = w.lines.find((l) => l.startsWith('HATA'))
    expect(line).toContain(`plan ${PLAN_A}`)
    expect(line).toContain('4 alıcı')
    expect(line).toContain('deneme 1/5')
    expect(line).toContain(SMTP_DOWN.error)
    expect(line).not.toContain('@firma.example,')
  })

  it('does the same for a provider that throws instead of answering', async () => {
    const w = mailWorld(oneDuePlan(), { send: async () => Promise.reject(new Error('ECONNRESET')) })
    expect(await processPlan('invitation', PLAN_A, w.deps)).toBe('failed')
    expect(w.world.plans[0]).toMatchObject({ claimed: false, attempts: 1 })
    expect(w.lines.join('\n')).toContain('ECONNRESET')
  })

  it('releases the claim too when writing the mail itself fails, with the people not yet known', async () => {
    const w = mailWorld({ plans: [plan()], members: [MEMBER], users: TEAM_USERS })
    const failing = { ...w.deps, sql: async (text: string, params: Parameters<typeof w.deps.sql>[1]) => {
      if (text.includes('from main.users u left join main.profiles')) throw new Error('users table locked')
      return w.deps.sql(text, params)
    } }
    expect(await processPlan('invitation', PLAN_A, failing)).toBe('failed')
    expect(w.world.plans[0]).toMatchObject({ claimed: false, attempts: 1 })
    expect(w.lines.join('\n')).toContain('users table locked')
  })

  it('waits before trying again: 5 minutes after the first failure, then longer', async () => {
    const w = mailWorld(oneDuePlan(), { send: async () => SMTP_DOWN })
    await runMailTick(w.deps)
    w.clock.at += 4 * 60_000
    expect(await runMailTick(w.deps)).toMatchObject({ waiting: 1, failed: 0 })
    expect(w.sent).toHaveLength(1)
    w.clock.at += 2 * 60_000
    expect(await runMailTick(w.deps)).toMatchObject({ failed: 1, waiting: 0 })
    expect(w.sent).toHaveLength(2)
    expect(w.world.plans[0]?.attempts).toBe(2)
    expect(retryDelayMs(1)).toBe(5 * 60_000)
    expect(retryDelayMs(2)).toBe(30 * 60_000)
    expect(retryDelayMs(3)).toBe(180 * 60_000)
    expect(retryDelayMs(4)).toBe(720 * 60_000)
    expect(retryDelayMs(5)).toBe(720 * 60_000)
  })

  it('gives up after five attempts and says so, and a later tick leaves the plan alone', async () => {
    const w = mailWorld(oneDuePlan(), { send: async () => SMTP_DOWN })
    for (let i = 0; i < MAIL_MAX_ATTEMPTS + 2; i++) {
      await runMailTick(w.deps)
      w.clock.at += 13 * 3_600_000
    }
    expect(w.sent).toHaveLength(MAIL_MAX_ATTEMPTS)
    expect(w.world.plans[0]?.attempts).toBe(MAIL_MAX_ATTEMPTS)
    expect(w.lines.filter((l) => l.includes('haklar bitti'))).toHaveLength(1)
  })

  it('sends on the retry once the provider is back, and then stays quiet', async () => {
    let up = false
    const w = mailWorld(oneDuePlan(), { send: async () => (up ? { success: true } : SMTP_DOWN) })
    await runMailTick(w.deps)
    up = true
    w.clock.at += 6 * 60_000
    expect(await runMailTick(w.deps)).toMatchObject({ sent: 1 })
    expect(w.deps.retryAt.size).toBe(0)
    w.clock.at += 6 * 60_000
    await runMailTick(w.deps)
    expect(w.sent).toHaveLength(2)
  })

  it('treats a provider that never answers as a failed send, so one hung connection cannot stop the worker', async () => {
    const w = mailWorld(oneDuePlan(), { send: () => new Promise(() => undefined) })
    expect(await processPlan('invitation', PLAN_A, { ...w.deps, sendTimeoutMs: 20 })).toBe('failed')
    expect(w.world.plans[0]).toMatchObject({ claimed: false, attempts: 1 })
    expect(w.lines.join(' | ')).toContain('yanıt vermedi')
  })

  it('costs no attempt when the provider disappeared in the middle of the send', async () => {
    const w = mailWorld(oneDuePlan(), {
      send: async () => {
        w.setAvailable(false)
        return { success: false, error: 'No email provider is configured or available' }
      },
    })
    expect(await processPlan('invitation', PLAN_A, w.deps)).toBe('failed')
    expect(w.world.plans[0]).toMatchObject({ claimed: false, attempts: 0 })
    expect(w.lines.some((l) => l.startsWith('HATA'))).toBe(false)
  })
})
