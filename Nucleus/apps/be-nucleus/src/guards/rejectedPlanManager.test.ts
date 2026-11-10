import { describe, expect, it } from 'bun:test'
import type { Row } from '../db'
import { PENDING_APPROVAL, enforceBusinessRules } from './businessRules'
import type { Caller } from './caller'

/**
 * A Müdür is central, so the plan rules that skip central callers let one take
 * a plan out of correction: "İptal edildi", then "Onay Bekliyor" put an
 * uncorrected audit back in the approval queue. On a rejected plan the status
 * changes only by the plan's team's resend (R30); Merkez Ekip, Super Admin and
 * the godmin change it freely.
 */

const GOD: Caller = { userId: 'u-god', isGod: true, roles: ['godmin'] }
const SUPER_ADMIN: Caller = { userId: 'u-sa', isGod: false, roles: ['super admin'] }
const CENTRAL: Caller = { userId: 'u-ce', isGod: false, roles: ['content manager core team'] }
const MANAGER: Caller = { userId: 'u-mgr', isGod: false, roles: ['manager'] }

const TEAM = '3c1e5a7b-2d4f-4a6b-9c8d-0e1f2a3b4c5d'
const AUDIT = '0b0b0b0b-1111-4222-8333-444444444444'
const OTHER_AUDIT = '0c0c0c0c-1111-4222-8333-444444444444'

type OnTeam = { leader?: string; member?: boolean }

/** Answers each query by the first needle its text contains. */
const script =
  (answers: Record<string, Row[]>) => async (text: string) => {
    for (const [needle, rows] of Object.entries(answers)) if (text.includes(needle)) return rows
    return []
  }

const plan = (status: string, onTeam: OnTeam = { member: true }) =>
  script({
    'from main.five_s_audit_teams t': [{ leader_user_id: onTeam.leader ?? 'u-lead', is_member: onTeam.member === true }],
    'from main.five_s_audit_plans where id': [
      { assigned_team_id: TEAM, date_change_count: 0, planned_date: '2026-10-05', audit_id: AUDIT, status },
    ],
  })

const put = (payload: Row, read: ReturnType<typeof plan>, caller: Caller | null) =>
  enforceBusinessRules({
    request: new Request('http://localhost:4001/fiveSAuditPlans/p1', {
      method: 'PUT',
      headers: { cookie: 'nucleus_session_token=s1', 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }),
    body: undefined,
    read,
    caller,
  })

const CHANGE = 'durumu yalnız denetimiyle birlikte yeniden gönderilerek değişir'
const resend = { status: PENDING_APPROVAL, auditId: AUDIT }

describe('Müdür and a rejected plan', () => {
  it('cannot cancel it, plan it again or approve it, on the team or off it', async () => {
    for (const read of [plan('rejected', { member: false }), plan('rejected', { member: true })]) {
      for (const status of ['cancelled', 'planned']) {
        const res = await put({ status }, read, MANAGER)
        expect(res?.status).toBe(403)
        expect((await res?.json()).message).toContain(CHANGE)
      }
      const approve = await put({ status: 'completed' }, read, MANAGER)
      expect(approve?.status).toBe(400)
      expect((await approve?.json()).message).toContain('Merkez Ekip onayıyla')
    }
  })

  it('cannot send it again from outside the team, with its audit or without', async () => {
    const outsider = plan('rejected', { member: false })
    for (const payload of [resend, { status: PENDING_APPROVAL }]) {
      const res = await put(payload, outsider, MANAGER)
      expect(res?.status).toBe(403)
      expect((await res?.json()).message).toContain('planın ekibi ya da Merkez Ekip')
    }
  })

  it('sends it again as a member or the leader of the team, with the plan’s own audit', async () => {
    expect(await put(resend, plan('rejected'), MANAGER)).toBeUndefined()
    expect(await put(resend, plan('rejected', { leader: 'u-mgr', member: false }), MANAGER)).toBeUndefined()
    expect(await put({ ...resend, auditId: AUDIT.toUpperCase() }, plan('rejected'), MANAGER)).toBeUndefined()
  })

  it('cannot send it again on the team with another audit or none', async () => {
    for (const payload of [{ ...resend, auditId: OTHER_AUDIT }, { status: PENDING_APPROVAL }]) {
      const res = await put(payload, plan('rejected'), MANAGER)
      expect(res?.status).toBe(403)
      expect((await res?.json()).message).toContain(CHANGE)
    }
  })

  it('cannot move its audit link, on the team or off it, and may still save the plan as it is', async () => {
    for (const read of [plan('rejected', { member: false }), plan('rejected')]) {
      for (const payload of [{ auditId: OTHER_AUDIT }, { auditId: null }]) {
        const res = await put(payload, read, MANAGER)
        expect(res?.status).toBe(403)
        expect((await res?.json()).message).toContain('aynı bağlantıyla')
      }
      expect(await put({ status: 'rejected', auditId: AUDIT }, read, MANAGER)).toBeUndefined()
      expect(await put({ fieldManagerAttended: true }, read, MANAGER)).toBeUndefined()
    }
  })

  it('answers 401 when it cannot tell who is writing', async () => {
    expect((await put({ status: 'cancelled' }, plan('rejected'), null))?.status).toBe(401)
  })

  it('still cancels a plan that is not rejected, as before', async () => {
    expect(await put({ status: 'cancelled' }, plan('planned', { member: false }), MANAGER)).toBeUndefined()
  })
})

describe('Merkez Ekip, Super Admin and the godmin and a rejected plan', () => {
  it('change its status any way they like, from outside the team', async () => {
    const outsider = plan('rejected', { member: false })
    for (const caller of [CENTRAL, SUPER_ADMIN, GOD]) {
      for (const payload of [{ status: 'cancelled' }, { status: 'planned' }, { status: 'completed' }, resend, { status: PENDING_APPROVAL }]) {
        expect(await put(payload, outsider, caller)).toBeUndefined()
      }
      expect(await put({ auditId: OTHER_AUDIT }, outsider, caller)).toBeUndefined()
    }
  })
})
