import type { Row } from '../db'
import type { Caller, QueryParam, Read } from './caller'

/** Callers and a scripted database for the field manager's findings limit (findingScope*.test.ts). */

export const GOD: Caller = { userId: 'u-god', isGod: true, roles: ['godmin'] }
export const SUPER_ADMIN: Caller = { userId: 'u-sa', isGod: false, roles: ['super admin'] }
export const CENTRAL: Caller = { userId: 'u-ce', isGod: false, roles: ['content manager core team'] }
export const MANAGER: Caller = { userId: 'u-mgr', isGod: false, roles: ['manager'] }
export const AUDITOR: Caller = { userId: 'u-aud', isGod: false, roles: ['auditor'] }
export const FIELD_MANAGER: Caller = { userId: 'u-fm', isGod: false, roles: ['field manager'] }
export const AUDITOR_FM: Caller = { userId: 'u-fm', isGod: false, roles: ['auditor', 'field manager'] }
export const MANAGER_FM: Caller = { userId: 'u-fm', isGod: false, roles: ['manager', 'field manager'] }

export const FINDING = '6f0c1c2e-3b4d-4e5f-8a9b-0c1d2e3f4a5b'
export const MINE = 'Çelik Haddehane'
export const OTHER = 'Soğuk Haddehane'

/** Every browser request carries its session; one without is nucleus's to answer 401. */
export const SESSION = { cookie: 'nucleus_session_token=s1' }

export type World = {
  /** The finding's `location_name`; leave out for "no such finding". */
  finding?: string
  /** The names of the locations the caller field-manages. */
  managed?: string[]
  /** The spellings findings were stored with. */
  stored?: string[]
  /** One entry per rejected plan the finding hangs under: that plan's team. */
  rejectedTeams?: string[]
  /** The stored finding row the closing rules read. */
  row?: Row
}

export const OPEN_ROW: Row = { status: 'open', photo_after_url: null, photo_after_file_id: null, photo_after_files: [] }

/** Answers each query by the first needle its text contains, and keeps every call. */
export function world(w: World = {}) {
  const calls: { text: string; params: QueryParam[] }[] = []
  const read: Read = async (text, params) => {
    calls.push({ text, params })
    if (text.includes('photo_after_url')) return [w.row ?? OPEN_ROW]
    if (text.includes('select location_name from main.five_s_findings'))
      return w.finding === undefined ? [] : [{ location_name: w.finding }]
    if (text.includes('select distinct location_name')) return (w.stored ?? []).map((name) => ({ name }))
    if (text.includes('main.five_s_locations')) return (w.managed ?? []).map((name) => ({ name }))
    if (text.includes('main.five_s_audit_plans'))
      return (w.rejectedTeams ?? []).map((team) => ({ status: 'rejected', assigned_team_id: team }))
    return []
  }
  return { read, calls }
}

export const request = (method: string, path: string, payload?: object, headers: Record<string, string> = SESSION) =>
  new Request(`http://localhost:4001${path}`, {
    method,
    headers: payload === undefined ? headers : { ...headers, 'content-type': 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  })

/** The closing the register sends: the after photo, and the status when the photo closes it. */
export const closing = {
  _id: FINDING,
  photo_after_files: [{ file_id: 'a1' }],
  photo_after_file_id: 'a1',
  photo_after_url: '/cdn/a1',
  status: 'closed',
}
