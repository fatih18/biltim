import { describe, expect, it } from 'bun:test'
import type { Row } from '../db'
import { enforceBusinessRules } from './businessRules'
import type { Caller, QueryParam } from './caller'

/**
 * Two rules of the plan that was sent back for correction (R30, "Reddet"):
 * closing a finding stays open to the roles that close findings, and the three
 * columns of a rejection are written by the Reddet route alone. The pure
 * helpers behind them are in rejectedPlan.test.ts.
 */

const GOD: Caller = { userId: 'u-god', isGod: true, roles: ['godmin'] }
const SUPER_ADMIN: Caller = { userId: 'u-sa', isGod: false, roles: ['super admin'] }
const CENTRAL: Caller = { userId: 'u-ce', isGod: false, roles: ['content manager core team'] }
const MANAGER: Caller = { userId: 'u-mgr', isGod: false, roles: ['manager'] }
const FIELD_MANAGER: Caller = { userId: 'u-fm', isGod: false, roles: ['field manager'] }
const AUDITOR: Caller = { userId: 'u-aud', isGod: false, roles: ['auditor'] }
const BASIC: Caller = { userId: 'u-basic', isGod: false, roles: ['basic'] }

const FINDING = '/fiveSFindings/6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c6'
const PLAN = '/fiveSAuditPlans/6f0c2a4e-1b3d-4c5e-8f7a-9b0c1d2e3f40'
const AUDIT = '0b0b0b0b-1111-4222-8333-444444444444'
const TEAM = '3c1e5a7b-2d4f-4a6b-9c8d-0e1f2a3b4c5d'

const jsonReq = (method: string, path: string, payload: Row) =>
  new Request(`http://localhost:4001${path}`, {
    method,
    headers: { cookie: 'nucleus_session_token=s1', 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })

/** The plan of the finding's audit is rejected; `member` says whether the caller is on its team. Records every query. */
function world(options: { rejected?: boolean; member?: boolean } = {}) {
  const seen: string[] = []
  const read = async (text: string, _params: QueryParam[]): Promise<Row[]> => {
    seen.push(text)
    if (text.includes("on p.status = 'rejected'") || text.includes("where p.status = 'rejected'")) {
      return options.rejected === false ? [] : [{ status: 'rejected', assigned_team_id: TEAM }]
    }
    if (text.includes('from main.five_s_audit_teams t')) {
      return [{ leader_user_id: 'u-lead', is_member: options.member === true }]
    }
    if (text.includes('from main.five_s_findings where id')) return [{ status: 'open' }]
    return []
  }
  return { read, seen }
}

const write = (method: string, payload: Row, caller: Caller | null, read = world().read) =>
  enforceBusinessRules({ request: jsonReq(method, FINDING, payload), body: undefined, read, caller })

const photo = { photoAfterUrl: '/cdn/6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c7' }
const closing: Row[] = [
  { status: 'closed', ...photo },
  { status: 'closed', photo_after_url: '/cdn/a', completed_at: '2026-11-10' },
  { status: 'closed', photoAfterFiles: [{ file_id: '6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c8' }], closedAt: '2026-11-10' },
  { status: 'closed', photoAfterFileId: 'f1', completedAt: '2026-11-10' },
  { photoAfterUrl: '/cdn/a' },
]
const REFUSED = 'yalnız planın ekibi ve Merkez Ekip yapabilir'

describe('closing a finding of a plan that stays rejected', () => {
  it('is allowed to everyone who closes findings, from outside the plan’s team, by PUT and PATCH', async () => {
    for (const caller of [FIELD_MANAGER, MANAGER, CENTRAL, SUPER_ADMIN, GOD]) {
      for (const method of ['PUT', 'PATCH']) {
        for (const payload of closing) expect(await write(method, payload, caller)).toBeUndefined()
      }
    }
  })

  it('asks nothing about the plan: the closing rules are the whole judgement', async () => {
    const { read, seen } = world()
    expect(await write('PATCH', closing[0] ?? {}, FIELD_MANAGER, read)).toBeUndefined()
    expect(seen.filter((text) => text.includes("'rejected'"))).toEqual([])
  })

  it('still needs the "after" photo', async () => {
    const res = await write('PATCH', { status: 'closed' }, FIELD_MANAGER)
    expect(res?.status).toBe(400)
    expect((await res?.json()).message).toContain('Sonrası Fotoğraf')
  })

  it('is refused to a caller with no role that closes findings, and to an auditor who only audits', async () => {
    const basic = await write('PATCH', closing[0] ?? {}, BASIC)
    expect(basic?.status).toBe(403)
    expect((await basic?.json()).message).toContain(REFUSED)
    const auditor = await write('PATCH', closing[0] ?? {}, AUDITOR)
    expect(auditor?.status).toBe(403)
    expect((await auditor?.json()).message).toContain('Denetçi bulguları değiştiremez')
    expect((await write('PATCH', closing[0] ?? {}, null))?.status).toBe(401)
  })

  it('leaves everything else refused to Saha Sorumlusu and Müdür: any other key, a move, a switch-off, an empty body', async () => {
    const others: Row[] = [
      { description: 'Kırık raf' },
      { status: 'closed', ...photo, description: 'Kırık raf, düzeltildi' },
      { status: 'closed', ...photo, dueDate: '2026-12-01' },
      { status: 'closed', ...photo, auditId: AUDIT },
      { status: 'closed', ...photo, isActive: false },
      {},
    ]
    for (const caller of [FIELD_MANAGER, MANAGER]) {
      for (const payload of others) {
        const res = await write('PUT', payload, caller)
        expect(res?.status).toBe(403)
        expect((await res?.json()).message).toContain(REFUSED)
      }
    }
  })

  it('leaves a new finding and a delete refused to them, the exemption being for PUT and PATCH', async () => {
    const created = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSFindings', {
        auditId: AUDIT,
        description: 'Kırık raf',
        locationName: 'Depo',
        findingType: 'safety',
        detectedDate: '2026-01-02',
      }),
      body: undefined,
      read: world().read,
      caller: FIELD_MANAGER,
    })
    expect(created?.status).toBe(403)
    const removed = await enforceBusinessRules({
      request: new Request(`http://localhost:4001${FINDING}`, { method: 'DELETE', headers: { cookie: 'nucleus_session_token=s1' } }),
      body: undefined,
      read: world().read,
      caller: FIELD_MANAGER,
    })
    expect(removed?.status).toBe(403)
  })

  it('does not change who may write the rest: Merkez Ekip and the plan’s own team', async () => {
    expect(await write('PUT', { description: 'Kırık raf' }, CENTRAL)).toBeUndefined()
    expect(await write('PUT', { description: 'Kırık raf' }, FIELD_MANAGER, world({ member: true }).read)).toBeUndefined()
  })
})

describe('the columns of a rejection', () => {
  const forged: Row[] = [
    { rejection_reason: 'Uydurma' },
    { rejectionReason: 'Uydurma' },
    { rejected_at: '2026-11-10T10:00:00' },
    { rejectedAt: '2026-11-10T10:00:00' },
    { rejected_by: 'u-ce' },
    { rejectedBy: 'u-ce' },
    { rejectedBy: null },
    { 'Rejection-Reason': 'Uydurma' },
    { REJECTED_BY: 'u-ce' },
    { status: 'pending_approval', rejectionReason: 'Uydurma' },
  ]

  it('are written by nobody through the generic route: PUT, PATCH and POST, every caller, nothing read', async () => {
    for (const caller of [GOD, SUPER_ADMIN, CENTRAL, MANAGER, AUDITOR, FIELD_MANAGER]) {
      for (const payload of forged) {
        for (const method of ['PUT', 'PATCH']) {
          const { read, seen } = world()
          const res = await enforceBusinessRules({ request: jsonReq(method, PLAN, payload), body: undefined, read, caller })
          expect(res?.status).toBe(400)
          expect((await res?.json()).message).toContain('"Reddet"')
          if (!('status' in payload)) expect(seen).toEqual([])
        }
      }
    }
    const created = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAuditPlans', {
        plannedDate: '2026-12-01',
        locationId: 'loc',
        assignedTeamId: 'team',
        rejectionReason: 'Uydurma',
      }),
      body: undefined,
      read: world().read,
      caller: CENTRAL,
    })
    expect(created?.status).toBe(400)
  })

  it('leave an ordinary plan write alone', async () => {
    const read = async (text: string, _params: QueryParam[]): Promise<Row[]> =>
      text.includes('from main.five_s_audit_plans where id')
        ? [{ status: 'planned', planned_date: '2026-10-05', date_change_count: 0, assigned_team_id: TEAM }]
        : []
    const res = await enforceBusinessRules({
      request: jsonReq('PUT', PLAN, { plannedDate: '2026-10-05' }),
      body: undefined,
      read,
      caller: CENTRAL,
    })
    expect(res).toBeUndefined()
  })
})
