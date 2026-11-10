import { describe, expect, it } from 'bun:test'
import { createRejectPlanRoute } from './planReview'
import { type World, fakeDb, MEMBER_A, PLAN, pending, REASON } from './planReviewKit'

/** The Reddet route's handler itself, driven with the context the router hands it. */

type Set = { status?: number; headers: Record<string, string> }

function call(userId: string | null, body: { reason?: string }, world: World = { plan: pending(), members: [MEMBER_A] }) {
  const db = fakeDb(world)
  const route = createRejectPlanRoute(db.deps)
  const set: Set = { headers: {} }
  const headers: Record<string, string> = userId === null ? {} : { 'x-user-id': userId }
  const answer = route.handler({
    request: new Request(`http://localhost:1001/biltim/plans/${PLAN}/reject`, { method: 'POST', headers }),
    params: { plan_id: PLAN },
    query: {},
    body,
    set,
  })
  return Promise.resolve(answer).then((result) => ({ result, set, db }))
}

describe('rejectPlanRoute.handler', () => {
  it('answers 401 and sets it when the request carries no x-user-id, touching nothing', async () => {
    const { result, set, db } = await call(null, { reason: REASON })
    expect(set.status).toBe(401)
    expect(result.success).toBe(false)
    expect(result.message).toBe('Oturum bulunamadı.')
    expect(db.calls).toEqual([])
    expect(db.events).toEqual([])
  })

  it('answers 200 with the plan’s id and new status for a valid body, and commits once', async () => {
    const { result, set, db } = await call('u-ce', { reason: REASON })
    expect(set.status).toBe(200)
    expect(result).toEqual({ success: true, data: { id: PLAN, status: 'rejected' } })
    expect(db.events).toEqual(['begin', 'commit'])
    const update = db.calls.find((c) => c.text.includes('update main.five_s_audit_plans'))
    expect(update?.params).toEqual([PLAN, REASON, 'u-ce'])
  })

  it('reads the reason from the body and the person from the header, not the other way round', async () => {
    const { set, db } = await call('u-aud', { reason: REASON })
    expect(set.status).toBe(403)
    expect(db.events).toEqual([])
  })

  it('sets 400 for a missing or empty reason, in Turkish, and writes nothing', async () => {
    for (const body of [{}, { reason: '' }]) {
      const { result, set, db } = await call('u-ce', body)
      expect(set.status).toBe(400)
      expect(result.message).toContain('karakter arasında olmalı')
      expect(db.events).toEqual([])
    }
  })

  it('sets 404 for a plan that does not exist, and 409 for one that is not waiting', async () => {
    expect((await call('u-ce', { reason: REASON }, { plan: undefined, members: [] })).set.status).toBe(404)
    const sent = { plan: pending({ status: 'completed' }), members: [] }
    expect((await call('u-ce', { reason: REASON }, sent)).set.status).toBe(409)
  })
})
