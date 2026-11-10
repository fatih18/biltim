import { describe, expect, it } from 'bun:test'
import { BiltimRoutes } from './biltim'
import {
  REASON_MAX,
  REJECTED_NOTIFICATION_TYPE,
  rejectPlan,
  rejectPlanRoute,
  rejectionNotice,
} from './planReview'
import { fakeDb, LEADER, MEMBER_A, MEMBER_B, PLAN, pending, reject, REASON, TEAM } from './planReviewKit'

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
