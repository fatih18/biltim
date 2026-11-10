import { describe, expect, it } from 'bun:test'
import { REASON_MAX, REASON_MIN } from './planReview'
import { MEMBER_A, PLAN, pending, reject, REASON } from './planReviewKit'

describe('who may reject', () => {
  it('answers 401 for nobody and for an account that does not exist, before anything else', async () => {
    for (const userId of [null, '', 'u-nobody']) {
      const { outcome, events } = await reject(userId, { plan: pending() })
      expect(outcome.status).toBe(401)
      expect(events).toEqual([])
    }
  })

  it('refuses Müdür, an auditor and a field manager, saying who may', async () => {
    for (const userId of ['u-mgr', 'u-aud', 'u-fm']) {
      const { outcome, events, wrote } = await reject(userId, { plan: pending(), members: [MEMBER_A] })
      expect(outcome.status).toBe(403)
      expect(String(outcome.body.message)).toContain('yalnız Merkez Ekip, Super Admin ve godmin reddedebilir')
      expect(events).toEqual([])
      expect(wrote()).toBe(false)
    }
  })

  it('lets Merkez Ekip, Super Admin and the godmin, the flag alone included', async () => {
    for (const userId of ['u-ce', 'u-sa', 'u-god']) {
      const { outcome } = await reject(userId, { plan: pending() })
      expect(outcome.status).toBe(200)
    }
  })
})

describe('the reason', () => {
  it('is 5 to 500 characters once trimmed, and a 400 in Turkish otherwise', async () => {
    const bad: unknown[] = [undefined, null, 42, '', '    ', 'abcd', '  abcd  ', 'x'.repeat(REASON_MAX + 1)]
    for (const reason of bad) {
      const { outcome, events, wrote } = await reject('u-ce', { plan: pending() }, reason)
      expect(outcome.status).toBe(400)
      expect(String(outcome.body.message)).toContain(`${REASON_MIN} ile ${REASON_MAX} karakter arasında`)
      expect(events).toEqual([])
      expect(wrote()).toBe(false)
    }
  })

  it('takes the limits themselves, counts people’s characters not code units, and is stored trimmed', async () => {
    for (const reason of ['abcde', `  ${'x'.repeat(REASON_MAX)}  `, '😀'.repeat(300)]) {
      const { outcome, calls } = await reject('u-ce', { plan: pending() }, reason)
      expect(outcome.status).toBe(200)
      const update = calls.find((c) => c.text.includes('update main.five_s_audit_plans'))
      expect(update?.params[1]).toBe(reason.trim())
    }
  })
})

describe('the plan', () => {
  it('is a 404 when there is none, and nothing is written', async () => {
    const { outcome, events, wrote } = await reject('u-ce', {})
    expect(outcome.status).toBe(404)
    expect(events).toEqual(['begin', 'commit'])
    expect(wrote()).toBe(false)
  })

  it('is looked up by its canonical id, locked, and only while it is switched on', async () => {
    const { calls } = await reject('u-ce', { plan: pending() }, REASON, PLAN.toUpperCase())
    const lookup = calls.find((c) => c.text.includes('for update of p'))
    expect(lookup?.params).toEqual([PLAN])
    expect(lookup?.text).toContain('p.is_active is not false')
  })

  it('must be waiting for approval: any other status is a 409 that names the real one', async () => {
    const labels: Record<string, string> = {
      planned: 'Planlandı',
      rejected: 'Düzeltme Bekliyor',
      completed: 'Tamamlandı',
      cancelled: 'İptal',
    }
    for (const [status, label] of Object.entries(labels)) {
      const { outcome, wrote } = await reject('u-ce', { plan: pending({ status }), members: [MEMBER_A] })
      expect(outcome.status).toBe(409)
      expect(String(outcome.body.message)).toContain(`bu planın durumu "${label}"`)
      expect(String(outcome.body.message)).toContain('"Onay Bekliyor"')
      expect(wrote()).toBe(false)
    }
  })

  it('is a 409 when it stopped waiting between the lock and the update', async () => {
    const { outcome, calls } = await reject('u-ce', { plan: pending(), members: [MEMBER_A], updated: [] })
    expect(outcome.status).toBe(409)
    expect(calls.some((c) => c.text.includes('insert into'))).toBe(false)
  })
})

