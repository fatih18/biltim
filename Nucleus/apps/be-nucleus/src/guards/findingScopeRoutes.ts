import { pathId } from './businessRules'
import { FINDING_ITEM } from './findingDelete'

/** Which generic findings route a request is for, and the SQL the findings limit reads with (findingScope.ts). */

/** The places a user field-manages, as `managedSpellings` finds them. */
export const MANAGED_LOCATIONS_SQL = `select name from main.five_s_locations where coalesce(field_manager_user_ids, '[]'::jsonb) ? $1::text`
/** One finding's place; no row means the route answers 404. */
export const FINDING_LOCATION_SQL = 'select location_name from main.five_s_findings where id::text = $1'
/** Every spelling findings were written with, active or not. */
export const FINDING_SPELLINGS_SQL = 'select distinct location_name as name from main.five_s_findings'

const COLLECTION = /^\/fiveSFindings\/?$/
const DISTINCT = /^\/fiveSFindings\/distinct\/[^/]+\/?$/
const BULK = /^\/fiveSFindings\/bulk\/?$/

export type Target = { kind: 'list' | 'distinct' | 'read' | 'write' | 'bulk'; id: string }

/** Which of the generic findings routes a request is for; null for every other request. */
export function classifyFindingRequest(method: string, path: string): Target | null {
  const item = FINDING_ITEM.exec(path)
  if (method === 'GET') {
    if (COLLECTION.test(path)) return { kind: 'list', id: '' }
    if (DISTINCT.test(path)) return { kind: 'distinct', id: '' }
    return item ? { kind: 'read', id: pathId(item[1]) } : null
  }
  if (method !== 'PUT' && method !== 'PATCH' && method !== 'DELETE') return null
  if (BULK.test(path)) return { kind: 'bulk', id: '' }
  return item ? { kind: 'write', id: pathId(item[1]) } : null
}
