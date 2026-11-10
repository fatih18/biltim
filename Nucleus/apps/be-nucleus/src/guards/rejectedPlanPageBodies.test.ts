import { describe, expect, it } from 'bun:test'
import type { Row } from '../db'
import { enforceBusinessRules } from './businessRules'
import type { Caller, QueryParam } from './caller'

/**
 * R30: a Saha Sorumlusu outside the team of a rejected plan closes a finding
 * with the bodies the bulgular page really sends. The nucleus client repeats
 * the path id in the body as `_id`, so the closing exemption must not count it
 * as a correction.
 */

const FIELD_MANAGER: Caller = { userId: 'u-fm', isGod: false, roles: ['field manager'] }
const ID = '6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c6'
const FILE = '6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c8'
const TEAM = '3c1e5a7b-2d4f-4a6b-9c8d-0e1f2a3b4c5d'
const REFUSED = 'yalnız planın ekibi ve Merkez Ekip yapabilir'

/** The finding is open, its audit's plan is rejected, and the caller is not on the plan's team. */
const read = async (text: string, _params: QueryParam[]): Promise<Row[]> => {
  if (text.includes("on p.status = 'rejected'") || text.includes("where p.status = 'rejected'")) {
    return [{ status: 'rejected', assigned_team_id: TEAM }]
  }
  if (text.includes('from main.five_s_audit_teams t')) return [{ leader_user_id: 'u-lead', is_member: false }]
  if (text.includes('from main.five_s_findings where id')) return [{ status: 'open' }]
  return []
}

const write = (method: string, payload: Row) =>
  enforceBusinessRules({
    request: new Request(`http://localhost:4001/fiveSFindings/${ID}`, {
      method,
      headers: { cookie: 'nucleus_session_token=s1', 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }),
    body: undefined,
    read,
    caller: FIELD_MANAGER,
  })

describe('closing a finding of a rejected plan with the bulgular page bodies', () => {
  it('allows the photo upload that closes it, in both spellings, and the status change, by PUT and PATCH', async () => {
    const bodies: Row[] = [
      { _id: ID, photoAfterFiles: [{ file_id: FILE }], photoAfterFileId: FILE, photoAfterUrl: `/cdn/${FILE}`, status: 'closed' },
      { _id: ID, photo_after_files: [{ file_id: FILE }], photo_after_file_id: FILE, photo_after_url: `/cdn/${FILE}` },
      { _id: ID, status: 'in_progress' },
    ]
    for (const method of ['PUT', 'PATCH']) {
      for (const payload of bodies) expect(await write(method, payload)).toBeUndefined()
    }
  })

  it('still asks for the "after" photo when the status alone closes it', async () => {
    const res = await write('PUT', { _id: ID, status: 'closed' })
    expect(res?.status).toBe(400)
    expect((await res?.json()).message).toContain('Sonrası Fotoğraf')
  })

  it('refuses an edit of the description, and an _id of another finding', async () => {
    for (const payload of [{ _id: ID, description: 'Kırık raf' }, { _id: 'another', status: 'in_progress' }]) {
      const res = await write('PATCH', payload)
      expect(res?.status).toBe(403)
      expect((await res?.json()).message).toContain(REFUSED)
    }
  })
})
