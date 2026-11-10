import { describe, expect, it } from 'bun:test'
import type { Row, Sql } from '../db'
import { BiltimRoutes } from './biltim'
import {
  REASON_MAX,
  REASON_MIN,
  REJECTED_NOTIFICATION_TYPE,
  type RejectDeps,
  rejectPlan,
  rejectPlanRoute,
  rejectionNotice,
} from './planReview'

const PLAN = '6f0c2a4e-1b3d-4c5e-8f7a-9b0c1d2e3f40'
const TEAM = '3c1e5a7b-2d4f-4a6b-9c8d-0e1f2a3b4c5d'
const LEADER = 'b7d4e2f1-6a5c-4b3d-8e9f-0a1b2c3d4e5f'
const MEMBER_A = '11111111-2222-4333-8444-555555555555'
const MEMBER_B = '66666666-7777-4888-9999-aaaaaaaaaaaa'
const REASON = 'Kırık raf puanlamasında hata var, düzeltin.'

const USERS: Record<string, { god?: boolean; roles: string[] }> = {
  'u-ce': { roles: ['Content Manager Core Team'] },
  'u-sa': { roles: ['Super Admin'] },
  'u-god': { god: true, roles: [] },
  'u-mgr': { roles: ['Manager'] },
  'u-aud': { roles: ['Auditor'] },
  'u-fm': { roles: ['Field Manager'] },
}

type World = {
  /** The locked plan row; none = no such plan. */
  plan?: Row
  members?: string[]
  /** What the guarded update answers; empty = the plan was no longer pending. */
  updated?: Row[]
  failInsert?: boolean
}

const pending = (over: Row = {}): Row => ({
  status: 'pending_approval',
  planned_date: '2026-11-12',
  assigned_team_id: TEAM,
  location_name: 'Haddehane 2',
  leader_user_id: LEADER,
  ...over,
})

/** A database that answers the route's questions, and remembers what it was asked and how the transaction ended. */
function fakeDb(world: World) {
  const calls: Array<{ text: string; params: unknown[] }> = []
  const events: string[] = []
  const sql: Sql = async (text, params = []) => {
    calls.push({ text, params })
    if (text.includes('select is_god from main.users')) {
      const user = USERS[String(params[0])]
      return user ? [{ is_god: user.god === true }] : []
    }
    if (text.includes('from main.user_roles ur')) {
      return (USERS[String(params[0])]?.roles ?? []).map((name) => ({ name }))
    }
    if (text.includes('for update of p')) return world.plan ? [world.plan] : []
    if (text.includes('from main.five_s_audit_team_members')) return (world.members ?? []).map((user_id) => ({ user_id }))
    if (text.includes('update main.five_s_audit_plans')) return world.updated ?? [{ id: PLAN }]
    if (text.includes('insert into main.notifications')) {
      if (world.failInsert) throw new Error('notifications is gone')
      return []
    }
    return []
  }
  const deps: RejectDeps = {
    read: sql,
    transaction: async (work) => {
      events.push('begin')
      try {
        const result = await work(sql)
        events.push('commit')
        return result
      } catch (error) {
        events.push('rollback')
        throw error
      }
    },
  }
  const wrote = () => calls.some((c) => c.text.includes('update main.') || c.text.includes('insert into'))
  return { deps, calls, events, wrote }
}

/** `rest` is `[reason, planId]`; naming a reason as `undefined` is a missing one, not the default. */
const reject = (userId: string | null, world: World, ...rest: [reason?: unknown, planId?: string]) => {
  const db = fakeDb(world)
  const reason = rest.length > 0 ? rest[0] : REASON
  return rejectPlan({ planId: rest[1] ?? PLAN, userId, reason }, db.deps).then((outcome) => ({ outcome, ...db }))
}

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

describe('rejecting', () => {
  it('stamps the plan with the reason, the person and the UTC moment, and answers the new status', async () => {
    const { outcome, calls, events } = await reject('u-ce', { plan: pending(), members: [MEMBER_A] }, `  ${REASON}  `)
    expect(outcome).toEqual({ status: 200, body: { success: true, data: { id: PLAN, status: 'rejected' } } })
    const update = calls.find((c) => c.text.includes('update main.five_s_audit_plans'))
    expect(update?.params).toEqual([PLAN, REASON, 'u-ce'])
    expect(update?.text).toContain("status = 'rejected'")
    expect(update?.text).toContain("rejected_at = (now() at time zone 'utc')")
    expect(update?.text).toContain("where id::text = $1 and status = 'pending_approval'")
    expect(events).toEqual(['begin', 'commit'])
  })

  it('tells the leader and every active member once, with location, day and reason', async () => {
    const { calls } = await reject('u-ce', {
      plan: pending({ planned_date: new Date(2026, 10, 12) }),
      members: [MEMBER_A, MEMBER_B, MEMBER_A.toUpperCase(), LEADER],
    })
    const members = calls.find((c) => c.text.includes('from main.five_s_audit_team_members'))
    expect(members?.params).toEqual([TEAM])
    expect(members?.text).toContain('coalesce(m.is_active, true)')

    const inserts = calls.filter((c) => c.text.includes('insert into main.notifications'))
    expect(inserts).toHaveLength(1)
    const [recipients, title, body, type, source, createdBy] = inserts[0]?.params ?? []
    expect(recipients).toEqual([LEADER, MEMBER_A, MEMBER_B])
    expect(title).toContain('Haddehane 2')
    expect(body).toContain('Haddehane 2')
    expect(body).toContain('12.11.2026')
    expect(body).toContain(REASON)
    expect(type).toBe(REJECTED_NOTIFICATION_TYPE)
    expect(source).toBe(`plan:${PLAN}`)
    expect(createdBy).toBe('u-ce')
  })

  it('writes the plan and the notifications in one transaction: a failed notification rolls the rejection back', async () => {
    const db = fakeDb({ plan: pending(), members: [MEMBER_A], failInsert: true })
    await expect(rejectPlan({ planId: PLAN, userId: 'u-ce', reason: REASON }, db.deps)).rejects.toThrow('notifications is gone')
    expect(db.events).toEqual(['begin', 'rollback'])
  })

  it('has nobody to tell when the plan has no team: the plan is still rejected', async () => {
    const { outcome, calls } = await reject('u-ce', { plan: pending({ assigned_team_id: null, leader_user_id: null }) })
    expect(outcome.status).toBe(200)
    expect(calls.some((c) => c.text.includes('from main.five_s_audit_team_members'))).toBe(false)
    expect(calls.some((c) => c.text.includes('insert into main.notifications'))).toBe(false)
  })

  it('is told once even when the leader is also a member', async () => {
    const { calls } = await reject('u-ce', { plan: pending(), members: [LEADER] })
    const insert = calls.find((c) => c.text.includes('insert into main.notifications'))
    expect(insert?.params[0]).toEqual([LEADER])
  })
})

describe('rejectionNotice', () => {
  it('names the place, the day and the reason, and what the team does next', () => {
    const notice = rejectionNotice('Haddehane 2', '2026-11-12', REASON)
    expect(notice.title).toBe('Denetim düzeltme bekliyor: Haddehane 2')
    expect(notice.body).toContain('Haddehane 2 lokasyonunun 12.11.2026 tarihli denetimi')
    expect(notice.body).toContain(`Gerekçe: ${REASON}`)
    expect(notice.body).toContain('"Düzelt ve Yeniden Gönder"')
  })

  it('still reads without a day or a location, and fits the columns', () => {
    const bare = rejectionNotice('', '', REASON)
    expect(bare.title).toBe('Denetim düzeltme bekliyor')
    expect(bare.body.startsWith('Denetim Merkez Ekip tarafından düzeltilmek üzere')).toBe(true)
    const long = rejectionNotice('L'.repeat(600), '2026-11-12', 'r'.repeat(REASON_MAX))
    expect(long.title.length).toBeLessThanOrEqual(255)
    expect(long.body.length).toBeLessThanOrEqual(1000)
  })
})

describe('the route', () => {
  it('is POST /biltim/plans/:plan_id/reject, with plan_id declared', () => {
    expect(rejectPlanRoute.method).toBe('POST')
    expect(rejectPlanRoute.path).toBe('/plans/:plan_id/reject')
    expect(BiltimRoutes.prefix).toBe('/biltim')
    expect(BiltimRoutes.routes).toContain(rejectPlanRoute)
    expect(JSON.stringify(rejectPlanRoute.params)).toContain('plan_id')
  })
})
