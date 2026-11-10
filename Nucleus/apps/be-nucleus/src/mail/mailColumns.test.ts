import { describe, expect, it } from 'bun:test'
import type { Row } from '../db'
import { enforceBusinessRules } from '../guards/businessRules'
import type { Caller } from '../guards/caller'
import { MAIL_COLUMNS_WRITE_MESSAGE, mailColumnsIn } from './mailColumns'

const PLAN = '/fiveSAuditPlans/6f0c2a4e-1b3d-4c5e-8f7a-9b0c1d2e3f40'

const GOD: Caller = { userId: 'u-god', isGod: true, roles: ['godmin'] }
const SUPER_ADMIN: Caller = { userId: 'u-sa', isGod: false, roles: ['super admin'] }
const CENTRAL: Caller = { userId: 'u-ce', isGod: false, roles: ['content manager core team'] }
const MANAGER: Caller = { userId: 'u-mgr', isGod: false, roles: ['manager'] }
const FIELD_MANAGER: Caller = { userId: 'u-fm', isGod: false, roles: ['field manager'] }
const AUDITOR: Caller = { userId: 'u-aud', isGod: false, roles: ['auditor'] }
const CALLERS: Caller[] = [GOD, SUPER_ADMIN, CENTRAL, MANAGER, FIELD_MANAGER, AUDITOR]

const write = (method: string, path: string, payload: Row, caller: Caller) =>
  enforceBusinessRules({
    request: new Request(`http://localhost:4001${path}`, {
      method,
      headers: { cookie: 'nucleus_session_token=s1', 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }),
    body: undefined,
    read: async () => [],
    caller,
  })

describe('mailColumnsIn', () => {
  it('finds the four columns in any spelling and nothing else', () => {
    expect(
      mailColumnsIn({
        invitation_mailed_at: null,
        completionMailedAt: '2026-11-12',
        'Invitation-Mail-Attempts': 0,
        completion_mail_attempts: 9,
        title: 'x',
        status: 'planned',
        rejected_at: null,
      })
    ).toEqual(['invitation_mailed_at', 'completionMailedAt', 'Invitation-Mail-Attempts', 'completion_mail_attempts'])
    expect(mailColumnsIn({ planned_date: '2026-11-12', mail: 1 })).toEqual([])
  })
})

describe('writing the mail columns through the generic plan routes', () => {
  const bodies: Row[] = [
    { invitation_mailed_at: null },
    { invitationMailedAt: null },
    { completionMailedAt: '2026-11-12T09:00:00' },
    { invitationMailAttempts: 0 },
    { completion_mail_attempts: 0, title: 'Yeni ad' },
  ]

  it('is refused for every caller, the godmin included, by PUT and PATCH', async () => {
    for (const caller of CALLERS) {
      for (const method of ['PUT', 'PATCH']) {
        for (const payload of bodies) {
          const res = await write(method, PLAN, payload, caller)
          expect(res?.status).toBe(400)
          expect(await res?.text()).toContain(MAIL_COLUMNS_WRITE_MESSAGE)
        }
      }
    }
  })

  it('is refused when a plan is created with one of them, too', async () => {
    const period = { quarter: '2026 Q4', date_range_start: '2026-10-01', date_range_end: '2026-12-31' }
    const res = await write('POST', '/fiveSAuditPlans', { ...period, invitationMailedAt: '2026-11-12T09:00:00' }, CENTRAL)
    expect(res?.status).toBe(400)
    expect(await res?.text()).toContain('e-posta gönderim kayıtları elle yazılamaz')
    expect(await write('POST', '/fiveSAuditPlans', period, CENTRAL)).toBeUndefined()
  })

  it('leaves an ordinary plan write alone', async () => {
    for (const caller of [GOD, SUPER_ADMIN, CENTRAL, MANAGER]) {
      expect(await write('PATCH', PLAN, { title: 'Yeni ad' }, caller)).toBeUndefined()
    }
  })

  it('says what is wrong, what it means and what to do', () => {
    expect(MAIL_COLUMNS_WRITE_MESSAGE).toContain('elle yazılamaz')
    expect(MAIL_COLUMNS_WRITE_MESSAGE).toContain('ikinci kez ya da hiç gönderilmemesine')
    expect(MAIL_COLUMNS_WRITE_MESSAGE).toContain('göndermeyin')
  })
})
