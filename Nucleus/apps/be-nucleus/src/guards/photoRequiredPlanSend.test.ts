import { describe, expect, it } from 'bun:test'
import { PENDING_APPROVAL, enforceBusinessRules } from './businessRules'
import type { Caller } from './caller'
import { missingPhotoMessage } from './photoRequired'

const AUDIT = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const TEAM = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'
const FILE = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'
const AUDITOR: Caller = { userId: 'u-aud', isGod: false, roles: ['auditor'] }
const CENTRAL: Caller = { userId: 'u-ce', isGod: false, roles: ['content manager core team'] }

describe('sending a plan with a photo-demanding question (R72)', () => {
  type Rows = Record<string, unknown>[]
  const plan = (status: string, findings: Rows, stored: Record<string, unknown> = {}) => {
    const asked: string[] = []
    const read = async (text: string): Promise<Rows> => {
      asked.push(text)
      if (text.includes('from main.five_s_audit_teams t')) return [{ leader_user_id: 'u-lead', is_member: true }]
      if (text.includes('from main.five_s_findings f')) return findings
      if (text.includes('from main.five_s_audit_plans where id')) {
        return [{ assigned_team_id: TEAM, date_change_count: 0, status, ...stored }]
      }
      return []
    }
    return { read, asked }
  }
  const put = (payload: unknown, read: (text: string) => Promise<Rows>, caller: Caller = AUDITOR) =>
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
  const stamp = { status: PENDING_APPROVAL, auditId: AUDIT, auditorAttended: true }
  const bare = [{ question_id: 'S1-Q2', photo_before_files: [] }]

  it('refuses the send with 422 and the Turkish reason when a finding has no photo', async () => {
    const res = await put(stamp, plan('planned', bare).read)
    expect(res?.status).toBe(422)
    const body = await res?.json()
    expect(body.isSuccess).toBe(false)
    expect(body.message).toBe(missingPhotoMessage(['S1-Q2']))
  })

  it('lets the send through when the findings carry a photo, or none sits on such a question', async () => {
    expect(await put(stamp, plan('planned', [{ question_id: 'S1-Q2', photo_before_file_id: FILE }]).read)).toBeUndefined()
    expect(await put(stamp, plan('planned', []).read)).toBeUndefined()
  })

  it('judges the audit the write names, and the plan’s own when it names none', async () => {
    const named = plan('planned', [])
    await put(stamp, named.read)
    expect(named.asked.some((text) => text.includes('from main.five_s_findings f'))).toBe(true)

    const own = plan('rejected', bare, { audit_id: AUDIT })
    const res = await put({ status: PENDING_APPROVAL }, own.read, CENTRAL)
    expect(res?.status).toBe(422)
  })

  it('does not look at the findings when the plan is not entering a sent state', async () => {
    const sent = plan(PENDING_APPROVAL, bare, { audit_id: AUDIT, auditor_attended: true })
    expect(await put(stamp, sent.read)).toBeUndefined()
    expect(sent.asked.some((text) => text.includes('from main.five_s_findings f'))).toBe(false)

    const approving = plan(PENDING_APPROVAL, bare, { audit_id: AUDIT })
    expect(await put({ status: 'completed' }, approving.read, CENTRAL)).toBeUndefined()
    expect(approving.asked.some((text) => text.includes('from main.five_s_findings f'))).toBe(false)
  })

  it('leaves a plan write that touches no status alone', async () => {
    const quiet = plan('planned', bare)
    expect(await put({ auditorAttended: true }, quiet.read, CENTRAL)).toBeUndefined()
    expect(quiet.asked.some((text) => text.includes('from main.five_s_findings f'))).toBe(false)
  })

  it('tells an auditor from another team the plan is not theirs, not what its findings lack', async () => {
    const other = async (text: string): Promise<Rows> =>
      text.includes('from main.five_s_audit_teams t')
        ? [{ leader_user_id: 'u-lead', is_member: false }]
        : plan('planned', bare).read(text)
    const res = await put(stamp, other)
    expect(res?.status).toBe(403)
  })
})
