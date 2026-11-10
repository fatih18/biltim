import { describe, expect, it } from 'bun:test'
import type { Row } from '../db'
import { enforceBusinessRules } from './businessRules'
import type { Caller, QueryParam } from './caller'
import { auditIdsNamedIn, auditStructureKeysIn } from './rejectedAuditWrites'

/**
 * What the plan's team may write on an existing audit or answer while its plan
 * is rejected (R30): the Auditor role holds table-level put/patch on both
 * (boot.ts), so the guard keeps the correction to a correction. An answer is
 * not moved to another audit, and an audit's identity columns are not written.
 */

const GOD: Caller = { userId: 'u-god', isGod: true, roles: ['godmin'] }
const SUPER_ADMIN: Caller = { userId: 'u-sa', isGod: false, roles: ['super admin'] }
const CENTRAL: Caller = { userId: 'u-ce', isGod: false, roles: ['content manager core team'] }
const MANAGER: Caller = { userId: 'u-mgr', isGod: false, roles: ['manager'] }
const AUDITOR: Caller = { userId: 'u-aud', isGod: false, roles: ['auditor'] }

const TEAM = '3c1e5a7b-2d4f-4a6b-9c8d-0e1f2a3b4c5d'
/** An audit of a rejected plan of the caller's team, and a second one of the same team. */
const OWN = 'aaaaaaaa-1111-4222-8333-444444444444'
const OWN_TOO = 'cccccccc-1111-4222-8333-444444444444'
/** An audit whose plan is still planned. */
const OTHER = 'bbbbbbbb-1111-4222-8333-444444444444'

/** The stored answer hangs under `stored`; the audits in `rejected` are the ones whose plan is rejected. */
function world(stored: string, rejected: string[], member = true) {
  return async (text: string, params: QueryParam[]): Promise<Row[]> => {
    const ids = Array.isArray(params[0]) ? params[0] : []
    if (text.includes("where p.status = 'rejected'")) {
      return ids.some((id) => rejected.includes(id)) ? [{ status: 'rejected', assigned_team_id: TEAM }] : []
    }
    if (text.includes('from main.five_s_audit_answers where id')) return [{ audit_id: stored }]
    if (text.includes('from main.five_s_audit_teams t')) return [{ leader_user_id: 'u-lead', is_member: member }]
    return []
  }
}

const send = (method: string, path: string, payload: Row, read: ReturnType<typeof world>, caller: Caller | null) =>
  enforceBusinessRules({
    request: new Request(`http://localhost:4001${path}`, {
      method,
      headers: { cookie: 'nucleus_session_token=s1', 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }),
    body: undefined,
    read,
    caller,
  })

const MOVED = 'taşınamaz'
const NOT_THE_TEAMS = 'yalnız planın ekibi ve Merkez Ekip yapabilir'
const NOT_CORRECTION = 'yalnız Merkez Ekip ve Müdür düzeltebilir'

describe('an answer is not moved to another audit', () => {
  const patch = (payload: Row, read: ReturnType<typeof world>, caller: Caller | null = AUDITOR, method = 'PATCH') =>
    send(method, '/fiveSAuditAnswers/ans1', payload, read, caller)

  it('refuses naming the team’s own rejected audit over an answer of an unlocked audit, in every spelling', async () => {
    for (const key of ['auditId', 'audit_id', 'AuditId', 'AUDIT-ID']) {
      for (const method of ['PATCH', 'PUT']) {
        const res = await patch({ [key]: OWN, rating: 'bad' }, world(OTHER, [OWN]), AUDITOR, method)
        expect(res?.status).toBe(403)
        expect((await res?.json()).message).toContain(MOVED)
      }
    }
  })

  it('refuses moving an answer out of the rejected audit into an unlocked one', async () => {
    const res = await patch({ auditId: OTHER }, world(OWN, [OWN]))
    expect(res?.status).toBe(403)
    expect((await res?.json()).message).toContain(MOVED)
  })

  it('leaves the answer of an unlocked audit to Merkez Ekip and Müdür when no audit is named', async () => {
    const res = await patch({ rating: 'bad' }, world(OTHER, [OWN]))
    expect(res?.status).toBe(403)
    expect((await res?.json()).message).toContain(NOT_CORRECTION)
  })

  it('corrects an answer in its own rejected audit, the audit named in either case', async () => {
    expect(await patch({ rating: 'bad' }, world(OWN, [OWN]))).toBeUndefined()
    expect(await patch({ auditId: OWN, rating: 'bad' }, world(OWN, [OWN]))).toBeUndefined()
    expect(await patch({ auditId: OWN.toUpperCase() }, world(OWN, [OWN]))).toBeUndefined()
  })

  it('lets the team correct between two rejected audits of its own: both are its correction', async () => {
    expect(await patch({ auditId: OWN_TOO }, world(OWN, [OWN, OWN_TOO]))).toBeUndefined()
  })

  it('still asks for the team when the named audit is another team’s', async () => {
    const res = await patch({ auditId: OWN }, world(OTHER, [OWN], false))
    expect(res?.status).toBe(403)
    expect((await res?.json()).message).toContain(NOT_THE_TEAMS)
  })

  it('leaves Merkez Ekip, Super Admin, the godmin and Müdür on the team to write any answer', async () => {
    for (const caller of [CENTRAL, SUPER_ADMIN, GOD, MANAGER]) {
      expect(await patch({ auditId: OWN, rating: 'bad' }, world(OTHER, [OWN]), caller)).toBeUndefined()
    }
  })

  it('answers 401 when it cannot tell who is writing', async () => {
    expect((await patch({ auditId: OWN }, world(OTHER, [OWN]), null))?.status).toBe(401)
  })

  it('does not touch a new answer: it is the auditor’s own submission', async () => {
    const post = send('POST', '/fiveSAuditAnswers', { auditId: OTHER, questionId: 'q1', rating: 'good' }, world(OTHER, [OWN]), AUDITOR)
    expect(await post).toBeUndefined()
  })
})

describe('an audit’s identity columns are not a correction’s to write', () => {
  const patch = (payload: Row, caller: Caller | null, method = 'PATCH') =>
    send(method, `/fiveSAudits/${OWN}`, payload, world(OWN, [OWN]), caller)
  const bodies: Row[] = [
    { isActive: false },
    { is_active: false },
    { IsActive: true },
    { ISACTIVE: false },
    { planId: OTHER },
    { plan_id: null },
    { 'plan-id': OTHER },
    { PLAN_ID: OTHER },
    { source: 'single_finding' },
    { clientSubmissionId: 'x' },
    { client_submission_id: 'x' },
    { 'Client-Submission-Id': 'x' },
    { totalScore: '80.00', isActive: false },
  ]

  it('refuses them to the plan’s team and to Müdür, by PUT and PATCH, in any spelling', async () => {
    for (const caller of [AUDITOR, MANAGER]) {
      for (const method of ['PUT', 'PATCH']) {
        for (const payload of bodies) {
          const res = await patch(payload, caller, method)
          expect(res?.status).toBe(403)
          expect((await res?.json()).message).toContain('elle değiştirilemez')
        }
      }
    }
  })

  it('leaves them to Merkez Ekip, Super Admin and the godmin', async () => {
    for (const caller of [CENTRAL, SUPER_ADMIN, GOD]) {
      for (const payload of bodies) expect(await patch(payload, caller)).toBeUndefined()
    }
  })

  it('keeps scores, the auditor’s name and the date open to the team', async () => {
    const correction = {
      auditorName: 'Ayşe Yılmaz',
      auditDate: '2026-10-05',
      totalScore: '80.00',
      scoreS1: '16.00',
      scoreS2: '16.00',
      scoreS3: '16.00',
      scoreS4: '16.00',
      scoreS5: '16.00',
    }
    expect(await patch(correction, AUDITOR)).toBeUndefined()
    expect(await patch(correction, AUDITOR, 'PUT')).toBeUndefined()
  })

  it('answers 401 when it cannot tell who is writing', async () => {
    expect((await patch({ isActive: false }, null))?.status).toBe(401)
  })

  it('does not judge a new audit: its plan, source and submission id are the auditor’s own submission', async () => {
    const res = await send(
      'POST',
      '/fiveSAudits',
      { planId: OTHER, source: 'single_finding', clientSubmissionId: 'x', auditDate: '2026-10-05' },
      world(OTHER, []),
      AUDITOR
    )
    expect(res).toBeUndefined()
  })
})

describe('the keys of an audit or answer write', () => {
  it('finds the identity columns in any spelling and nothing else', () => {
    const body = { isActive: 1, 'Plan-Id': 2, SOURCE: 3, client_submission_id: 4, totalScore: 5, auditorName: 6, plan: 7, sourceName: 8 }
    expect(auditStructureKeysIn(body)).toEqual(['isActive', 'Plan-Id', 'SOURCE', 'client_submission_id'])
    expect(auditStructureKeysIn({})).toEqual([])
  })

  it('also finds the place, person and period columns, and leaves scores, name and date open', () => {
    const body = {
      departmentName: 'x',
      location_id: 'y',
      'Auditor-Id': 'z',
      periodId: 'p',
      auditor_name: 'ok',
      auditDate: '2026-10-05',
      score_s3: 4,
      total_score: 50,
      target_score: 75,
    }
    expect(auditStructureKeysIn(body)).toEqual(['departmentName', 'location_id', 'Auditor-Id', 'periodId'])
  })

  it('finds every audit id named, under any spelling, and ignores null and blank', () => {
    expect(auditIdsNamedIn({ audit_id: OWN, AuditId: ` ${OTHER} `, 'AUDIT-ID': null, auditID: '  ', questionId: 'q' })).toEqual([OWN, OTHER])
    expect(auditIdsNamedIn({ rating: 'bad' })).toEqual([])
  })
})
