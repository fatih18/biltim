import { readFileSync } from 'node:fs'
import { query } from '../db'
import { type Caller, carriesCredentials, isAdmin, isAuditorOnly, isCentral, resolveCaller } from './caller'

/**
 * The 5S rules that must hold no matter who is writing.
 *
 * Both of these existed only in the browser. Measured against the live backend:
 *
 *   PUT /fiveSFindings/<id>   {"status":"closed"}          -> 200, row closed
 *                             with photo_after_url NULL
 *   PUT /fiveSAuditPlans/<id> {"planned_date":…} x5        -> 200 every time,
 *                             date_change_count reached 5 against a cap of 2
 *
 * The screen disables the control and explains why; the API accepted both. A
 * rule that only the UI enforces is not a rule — the whole point of requiring
 * an "after" photo is that a finding cannot be reported as resolved without
 * evidence, and the point of the date cap is that an audit cannot be postponed
 * indefinitely.
 *
 * This runs as the host's `onRequest` guard, which nucleus chains ahead of its
 * own inbound guard, so it covers the generated CRUD routes it could not
 * otherwise reach. Returning a Response short-circuits; returning nothing lets
 * the request through.
 */

const FINDING_PATH = /^\/fiveSFindings\/([^/?]+)/
const AUDIT_PATH = /^\/fiveSAudits\/([^/?]+)/
const AUDIT_COLLECTION = /^\/fiveSAudits\/?$/
const PLAN_PATH = /^\/fiveSAuditPlans\/([^/?]+)/
const PLAN_COLLECTION = /^\/fiveSAuditPlans\/?$/
const FINDING_COLLECTION = /^\/fiveSFindings\/?$/
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH'])
const LOCATION_ITEM = /^\/fiveSLocations\/([^/?]+)\/?$/
const TEAM_ITEM = /^\/fiveSAuditTeams\/([^/?]+)\/?$/
const TEAM_MEMBER_COLLECTION = /^\/fiveSAuditTeamMembers\/?$/
const TEAM_MEMBER_ITEM = /^\/fiveSAuditTeamMembers\/([^/?]+)\/?$/
const ANSWER_COLLECTION = /^\/fiveSAuditAnswers\/?$/
const ANSWER_ITEM = /^\/fiveSAuditAnswers\/([^/?]+)\/?$/
/** `DELETE /<entity>/bulk`, an array of ids; see the DELETE branch below. */
const MASTER_BULK = /^\/(fiveSLocations|fiveSAuditTeams)\/bulk\/?$/
/** nucleus's generic routes for the `users` system table (bulk is on for it). */
const USER_ITEM = /^\/users\/([^/?]+)\/?$/
const USER_BULK = /^\/users\/bulk\/?$/

/**
 * A plan the auditor has sent and Merkez Ekip has not yet approved.
 *
 * The customer's rule (7 Oct notes, #28): an audit the auditor closes is not
 * finished until Merkez Ekip looks at it. Until then the plan sits here; only
 * Merkez Ekip moves it to `completed`.
 */
export const PENDING_APPROVAL = 'pending_approval'

/** The cap the planning screen shows as "Düzenle (N hak)". */
export const MAX_DATE_CHANGES = 2

/**
 * Today, on the plant's calendar.
 *
 * The pool opens with `-c timezone=UTC`, so a plain server-side date is up to
 * three hours behind the people using this. Between 00:00 and 03:00 in Turkey
 * that makes the current day look like tomorrow, and a rule that refuses
 * "tomorrow" would refuse a finding recorded right now.
 */
export const PLANT_TZ = process.env.BILTIM_TZ || 'Europe/Istanbul'

export function todayAtPlant(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PLANT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export type RuleContext = {
  request: Request
  body: unknown
  /** Injected so the rules can be tested without a database. */
  read?: (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>
  /**
   * Who is calling, injected by tests. Left undefined, it is read from the
   * request's session and access token (see `caller.ts`) — and only when a
   * rule needs it.
   */
  caller?: Caller | null
}

type Read = NonNullable<RuleContext['read']>

function refuse(message: string, status = 400): Response {
  return new Response(
    JSON.stringify({ success: false, isSuccess: false, message, errors: [{ message }] }),
    { status, headers: { 'content-type': 'application/json' } }
  )
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

/**
 * Every top-level key in its snake_case spelling, the value nucleus will write.
 *
 * The frontend's nucleus client camelCases every key before it sends
 * (`convertKeysToCamelCase`), so the server receives `plannedDate`,
 * `dateChangeCount`, `photoAfterUrl`. The rules here were written against
 * `planned_date` and read nothing — measured: a date move from the planning
 * screen never reached the cap check at all.
 *
 * Folding is done the way nucleus's `sanitizePayload` folds before it hands
 * the payload to drizzle: both spellings land on the same column, and the key
 * that comes LATER in the body wins. Keeping the snake key when both are sent
 * would let `{"planned_date": <same>, "plannedDate": <new>}` pass the guard as
 * a no-op while nucleus writes the new date. Nested values are left as they
 * are; only the column names matter here.
 */
export function toSnakeKeys(value: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, v] of Object.entries(value)) {
    if (key === '__proto__') continue
    out[key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)] = v
  }
  return out
}

/** Every spelling Postgres's uuid_in reads: any case, hyphens after any group of four, or none. */
const UUID_INPUT = /^(?:[0-9a-f]{4}-?){7}[0-9a-f]{4}$/i

/**
 * An id in the one spelling the database hands back: lower-case 8-4-4-4-12.
 *
 * Every rule here looks a row up with `id::text = $1` and lets the request
 * through when nothing comes back — "the route will answer 404". But Postgres
 * reads `6F0C…`, `{6f0c…}` and the hyphenless form as the same uuid, and
 * nucleus finds the row by `eq(id, params.id)`. So the upper-case spelling of
 * a real plan's id missed every rule and was written: an auditor approved
 * their own audit, a field manager closed a finding with no photo. Anything
 * that parses as a uuid is brought to the canonical form before it is looked
 * up or compared; anything else is left as it is (trimmed).
 */
export function canonicalId(value: unknown): string {
  const raw = String(value ?? '').trim()
  const inner = raw.startsWith('{') && raw.endsWith('}') ? raw.slice(1, -1) : raw
  if (!UUID_INPUT.test(inner)) return raw
  const hex = inner.replace(/-/g, '').toLowerCase()
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** A path segment as nucleus receives it (decoded), in canonical form. */
function pathId(segment: string | undefined): string {
  let decoded = segment ?? ''
  try {
    decoded = decodeURIComponent(decoded)
  } catch {
    // Not valid percent-encoding: compare it as it came.
  }
  return canonicalId(decoded)
}

/**
 * Body ids in canonical form: every `…_id` value, and every item of an
 * `…_ids` array. Applied to the guard's own copy only; nucleus still receives
 * the body as sent, and Postgres reads either spelling as the same uuid.
 */
function canonicalIds(body: Record<string, unknown>): Record<string, unknown> {
  for (const [key, value] of Object.entries(body)) {
    if (key.endsWith('_id') && typeof value === 'string') body[key] = canonicalId(value)
    else if (key.endsWith('_ids') && Array.isArray(value)) {
      body[key] = value.map((v) => (typeof v === 'string' ? canonicalId(v) : v))
    }
  }
  return body
}

/**
 * nucleus's own body ceiling (config.json `security.maxRequestBodyBytes`).
 * Its inbound guard runs right after this one and answers 413 above it, from
 * the Content-Length alone, without reading the body.
 */
const NUCLEUS_BODY_LIMIT: number | undefined = (() => {
  try {
    const raw = JSON.parse(readFileSync(new URL('../../config.json', import.meta.url), 'utf8'))
    const limit = Number(raw?.security?.maxRequestBodyBytes)
    return Number.isFinite(limit) && limit > 0 ? limit : undefined
  } catch {
    return undefined
  }
})()
const BODY_LIMIT = NUCLEUS_BODY_LIMIT ?? 50 * 1024 * 1024

/** A plain calendar day, `YYYY-MM-DD`, that exists. */
export function isPlainDate(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number) as [number, number, number]
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

/** A value a client actually filled in: not absent, not null, not blank. */
function present(body: Record<string, unknown>, key: string): boolean {
  const v = body[key]
  return typeof v === 'string' ? v.trim() !== '' : v !== undefined && v !== null
}

const str = (v: unknown): string => String(v ?? '').trim()
const isFalse = (v: unknown): boolean => v === false || v === 'false'

/**
 * A calendar day, compared as a day.
 *
 * node-pg parses a `date` column into a Date at LOCAL midnight, so on this
 * machine (UTC+3) `2026-11-02` becomes `2026-11-01T21:00:00Z` and
 * `toISOString().slice(0,10)` reads it as the 1st. That made writing the SAME
 * date back look like a move, and it was refused with "no changes left" —
 * caught by testing the no-op path, not by reading the code.
 */
export function toDateKey(value: unknown): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return String(value ?? '').slice(0, 10)
}

/** A file id inside a url, read the way the screens read it (`extractUuidMaybe`). */
const UUID_IN_URL = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i

/**
 * Every name one photo goes by: its file id, id, url or path (or the string
 * itself), and the file id a url embeds. The screens write the single-photo
 * columns as `/cdn/<file id>` of an item in the array, and render a url that
 * embeds an id as that file — so those are the same photo. Empty when the
 * value names nothing: `{}` and `{file_id: null}` are not a photo.
 */
export function photoNames(item: unknown): string[] {
  const names: string[] = []
  const add = (value: unknown) => {
    if (typeof value !== 'string' || !value.trim()) return
    names.push(canonicalId(value))
    const embedded = UUID_IN_URL.exec(value)?.[0]
    if (embedded) names.push(canonicalId(embedded))
  }
  if (typeof item === 'string') add(item)
  else if (item && typeof item === 'object' && !Array.isArray(item)) {
    const o = item as Record<string, unknown>
    for (const key of ['file_id', 'fileId', 'id', 'url', 'path']) add(o[key])
  }
  return names
}

/**
 * True when the value names a photo — a url, a file id, or a file list with at
 * least one item that says which file it is. `[{}]` and `[{"file_id":null}]`
 * used to count, so a finding could be closed on an "after" photo of nothing.
 */
export function hasAfterPhoto(row: Record<string, unknown>): boolean {
  const url = row.photo_after_url ?? row.photoAfterUrl
  if (typeof url === 'string' && url.trim()) return true

  const fileId = row.photo_after_file_id ?? row.photoAfterFileId
  if (typeof fileId === 'string' && fileId.trim()) return true

  return jsonArray(row.photo_after_files ?? row.photoAfterFiles).some((item) => photoNames(item).length > 0)
}

/**
 * What nucleus will parse this body as — the same tests in the same order as
 * its `parseBody`. The order matters: `multipart/form-data; x=application/json`
 * is a form there, so it must not be read as JSON here.
 */
function bodyKind(contentType: string | null): 'formdata' | 'urlencoded' | 'json' | 'text' | 'binary' | undefined {
  if (!contentType) return undefined
  if (contentType.includes('multipart/form-data')) return 'formdata'
  if (contentType.includes('application/x-www-form-urlencoded')) return 'urlencoded'
  if (contentType.includes('application/json')) return 'json'
  if (contentType.startsWith('text/')) return 'text'
  if (contentType.includes('octet-stream')) return 'binary'
  return undefined
}

/** Bun hands a request with nothing after the headers over with `body === null`. */
function carriesBody(request: Request): boolean {
  return request.body !== null && request.headers.get('content-length') !== '0'
}

/*
 * `onRequest` runs BEFORE nucleus parses the body, so `ctx.body` is undefined
 * there — measured, not assumed: the probe logged
 * `PUT /fiveSFindings/<id> body= undefined`. The guard therefore reads it
 * itself, from a CLONE, so the stream nucleus is about to read is untouched.
 */
async function readBody(ctx: RuleContext): Promise<Record<string, unknown>> {
  if (ctx.body !== undefined && ctx.body !== null) return canonicalIds(toSnakeKeys(asRecord(ctx.body)))
  if (bodyKind(ctx.request.headers.get('content-type')) !== 'json') return {}
  try {
    return canonicalIds(toSnakeKeys(asRecord(await ctx.request.clone().json())))
  } catch {
    // A malformed body is the route's problem to report, not this guard's.
    return {}
  }
}

/**
 * A location or team an open plan still points at cannot be deleted.
 *
 * `five_s_audit_plans.location_id` and `assigned_team_id` carry no foreign
 * key, and nucleus's generic DELETE is a hard delete, so nothing stopped it.
 * Measured on production (30 Sep, 11:45 UTC): three locations and three teams
 * were deleted from Ana Veri Yönetimi while two planned audits still named
 * them. The plans stayed, pointing at rows that no longer exist; the home
 * page showed "-" for the location and "—" for the team, and nobody could say
 * where or by whom those audits were meant to be done.
 *
 * Completed and cancelled plans do not block: they are history, and the
 * customer must be able to clean test data out. The message says what to do
 * instead.
 */
async function guardMasterDataDelete(path: string, read: Read): Promise<Response | undefined> {
  const target = LOCATION_ITEM.exec(path)
    ? { id: LOCATION_ITEM.exec(path)?.[1], column: 'location_id', label: 'Bu lokasyon', hint: 'lokasyonu pasif yapın' }
    : TEAM_ITEM.exec(path)
      ? { id: TEAM_ITEM.exec(path)?.[1], column: 'assigned_team_id', label: 'Bu ekip', hint: 'ekibi pasif yapın' }
      : null
  if (!target?.id) return undefined

  // `::text` so an id that is not a uuid answers "no plan" instead of a 500.
  // `coalesce(is_active, true)`: a plan nobody deactivated is active.
  const rows = await read(
    `select count(*)::int as n from main.five_s_audit_plans
      where ${target.column}::text = $1 and coalesce(is_active, true)
        and coalesce(status, '') not in ('completed', 'cancelled')`,
    [pathId(target.id)]
  )
  const open = Number(rows[0]?.n ?? 0)
  if (!Number.isFinite(open) || open <= 0) return undefined
  return refuse(
    `${target.label} ${open} açık denetim planında kullanılıyor; silinirse o planların nerede ve kimle yapılacağı kaybolur. Önce planları başka birine taşıyın ya da silin, veya ${target.hint}.`
  )
}

/**
 * The ids a bulk write names: a `DELETE …/bulk` body is a bare JSON array of
 * ids, a `PUT …/bulk` body an array of `{ id, data }`.
 */
async function readIdArray(request: Request): Promise<string[]> {
  try {
    const parsed = await request.clone().json()
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((v) => canonicalId(v && typeof v === 'object' ? (v as Record<string, unknown>).id : v))
      .filter(Boolean)
  } catch {
    return []
  }
}

/** Display names for user ids: "Ad Soyad", or the e-mail when there is no profile. */
async function userNames(read: Read, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return []
  const rows = await read(
    `select coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), u.email, u.id::text) as name
       from main.users u left join main.profiles p on p.user_id = u.id
      where u.id::text = any($1::text[])`,
    [ids]
  )
  return rows.map((r) => String(r.name ?? '')).filter(Boolean)
}

/** A jsonb array as node-pg hands it over: already parsed, or still text. */
function jsonArray(value: unknown): unknown[] {
  let v = value
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v)
    } catch {
      return []
    }
  }
  return Array.isArray(v) ? v : []
}

/** A jsonb id list in canonical form, so it compares with ids from anywhere else. */
function jsonIds(value: unknown): string[] {
  return jsonArray(value)
    .map((x) => canonicalId(x))
    .filter(Boolean)
}

const idOf = (v: unknown): string => canonicalId(v)

/**
 * A location's field manager cannot be on the team that audits it (#13).
 *
 * The 5S audit is an outside look at a place; the person responsible for the
 * place auditing it is the one thing the method rules out. The planner let any
 * team be put on any location. Returns the names that clash, empty when none.
 */
export async function fieldManagerOnTeam(read: Read, locationId: string, teamId: string): Promise<string[]> {
  if (!locationId || !teamId) return []
  const locations = await read(
    'select field_manager_user_ids from main.five_s_locations where id::text = $1',
    [locationId]
  )
  const managers = new Set(jsonIds(locations[0]?.field_manager_user_ids))
  if (managers.size === 0) return []

  const teams = await read('select leader_user_id from main.five_s_audit_teams where id::text = $1', [teamId])
  const members = await read(
    `select user_id from main.five_s_audit_team_members
      where team_id::text = $1 and coalesce(is_active, true)`,
    [teamId]
  )
  const onTeam = new Set([teams[0]?.leader_user_id, ...members.map((m) => m.user_id)].map(idOf).filter(Boolean))
  const clash = [...onTeam].filter((id) => managers.has(id))
  if (clash.length === 0) return []
  const names = await userNames(read, clash)
  return names.length > 0 ? names : clash
}

/** The photo columns of one side of a finding. */
const photoKeys = (side: 'before' | 'after') =>
  [`photo_${side}_files`, `photo_${side}_url`, `photo_${side}_file_id`] as const

/**
 * Whether a write drops a photo a closed finding was closed on (#31, trace R32).
 *
 * Counting was not enough: `[A]` replaced by `[B]`, or the only url swapped
 * for another, kept the count and lost the evidence. Each photo is now
 * followed by name:
 *
 *   - every item of the stored file list must still be in the file list this
 *     write leaves behind, when the write touches the list;
 *   - a stored single-photo column (`…_url`, `…_file_id`) that the write
 *     touches must still name a photo somewhere on that side. The screens
 *     move those columns to the NEWEST photo when one is added and keep the
 *     old one in the list, which is an addition, not a swap;
 *   - and the count may not go down (items that name no file are still items).
 */
function dropsPhoto(
  row: Record<string, unknown>,
  next: Record<string, unknown>,
  body: Record<string, unknown>,
  side: 'before' | 'after'
): boolean {
  const [filesKey, urlKey, fileIdKey] = photoKeys(side)
  const missingFrom = (names: string[], pool: Set<string>) => names.length > 0 && !names.some((n) => pool.has(n))

  if (filesKey in body) {
    const nextFiles = new Set(jsonArray(next[filesKey]).flatMap(photoNames))
    if (jsonArray(row[filesKey]).some((item) => missingFrom(photoNames(item), nextFiles))) return true
  }

  const nextSide = new Set([
    ...jsonArray(next[filesKey]).flatMap(photoNames),
    ...photoNames(next[urlKey]),
    ...photoNames(next[fileIdKey]),
  ])
  for (const key of [urlKey, fileIdKey]) {
    if (key in body && missingFrom(photoNames(row[key]), nextSide)) return true
  }

  return photoCount(next, side) < photoCount(row, side)
}

/**
 * How many photos a finding row (or a write to one) carries on one side.
 *
 * The file id counts as a photo on its own: a row whose only evidence is
 * `photo_after_file_id` would otherwise count as zero, and nulling that id
 * on a closed finding went through as "removing nothing".
 */
export function photoCount(row: Record<string, unknown>, side: 'before' | 'after'): number {
  const files = jsonArray(row[`photo_${side}_files`]).length
  const url = row[`photo_${side}_url`]
  const fileId = row[`photo_${side}_file_id`]
  const single = (typeof url === 'string' && url.trim()) || (typeof fileId === 'string' && fileId.trim())
  return Math.max(files, single ? 1 : 0)
}

/**
 * Open audit plans: not completed, not cancelled and not switched off — the
 * same test the delete guard uses. A cancelled plan will never be audited, so
 * it cannot make anyone audit their own place.
 */
const OPEN_PLAN = `coalesce(p.is_active, true) and coalesce(p.status, '') not in ('completed', 'cancelled')`

/**
 * The open plans a person would be auditing their own location on, if they
 * joined (or led) this team. Returns the location names; empty when none.
 */
async function ownLocationsOnTeam(read: Read, teamId: string, userId: string): Promise<string[]> {
  if (!teamId || !userId) return []
  const plans = await read(
    `select l.name as location_name, l.field_manager_user_ids
       from main.five_s_audit_plans p join main.five_s_locations l on l.id = p.location_id
      where p.assigned_team_id::text = $1 and ${OPEN_PLAN}`,
    [teamId]
  )
  const names = plans
    .filter((p) => jsonIds(p.field_manager_user_ids).includes(userId))
    .map((p) => str(p.location_name))
  return [...new Set(names.filter(Boolean))]
}

async function refuseOwnLocation(read: Read, teamId: string, userId: string): Promise<Response | undefined> {
  const locations = await ownLocationsOnTeam(read, teamId, userId)
  if (locations.length === 0) return undefined
  const person = (await userNames(read, [userId]))[0] ?? userId
  return refuse(
    `${person}, bu ekibin açık denetim planı olan ${locations.join(', ')} lokasyonunun saha sorumlusu; kendi lokasyonunu denetleyen ekipte yer alamaz. Önce planı başka bir ekibe taşıyın ya da saha sorumlusunu değiştirin.`
  )
}

/**
 * #13 holds after the plan is made, too.
 *
 * The rule was checked when a plan was created or re-placed, and nowhere
 * else. Adding the field manager to the team afterwards, making them its
 * leader, or naming a team member the location's field manager all reached
 * the same forbidden state — a person auditing their own place — through the
 * master-data screens, with the plan untouched. Only open plans count: a
 * completed audit is history and is not re-judged.
 */
async function guardTeamAndLocationEdit(
  path: string,
  method: string,
  body: Record<string, unknown>,
  read: Read
): Promise<Response | undefined> {
  const memberItem = method !== 'POST' ? TEAM_MEMBER_ITEM.exec(path) : null
  if ((method === 'POST' && TEAM_MEMBER_COLLECTION.test(path)) || memberItem) {
    if (!('team_id' in body) && !('user_id' in body) && !('is_active' in body)) return undefined
    let teamId = idOf(body.team_id)
    let userId = idOf(body.user_id)
    let active = !isFalse(body.is_active)
    if (memberItem) {
      const rows = await read(
        'select team_id, user_id, is_active from main.five_s_audit_team_members where id::text = $1',
        [pathId(memberItem[1])]
      )
      const row = rows[0]
      if (!row) return undefined // The route answers 404 in its own words.
      const storedActive = row.is_active !== false
      teamId ||= idOf(row.team_id)
      userId ||= idOf(row.user_id)
      if (!('is_active' in body)) active = storedActive
      // Same person, same team, already on it: nobody new joins.
      if (teamId === idOf(row.team_id) && userId === idOf(row.user_id) && storedActive) return undefined
    }
    if (!active) return undefined
    return refuseOwnLocation(read, teamId, userId)
  }

  const teamItem = method !== 'POST' ? TEAM_ITEM.exec(path) : null
  if (teamItem && 'leader_user_id' in body) {
    const leader = idOf(body.leader_user_id)
    if (!leader) return undefined
    const teamId = pathId(teamItem[1])
    const rows = await read('select leader_user_id from main.five_s_audit_teams where id::text = $1', [teamId])
    if (rows[0] && idOf(rows[0].leader_user_id) === leader) return undefined
    return refuseOwnLocation(read, teamId, leader)
  }

  const locationItem = method !== 'POST' ? LOCATION_ITEM.exec(path) : null
  if (locationItem && 'field_manager_user_ids' in body) {
    const locationId = pathId(locationItem[1])
    const next = jsonIds(body.field_manager_user_ids)
    if (next.length === 0) return undefined
    const rows = await read('select field_manager_user_ids from main.five_s_locations where id::text = $1', [
      locationId,
    ])
    // Only someone NEWLY made responsible can create the clash; a manager
    // already in place is not re-judged by an unrelated edit.
    const before = new Set(jsonIds(rows[0]?.field_manager_user_ids))
    const added = new Set(next.filter((id) => !before.has(id)))
    if (added.size === 0) return undefined

    const people = await read(
      `select t.name as team_name, x.user_id
         from main.five_s_audit_plans p
         join main.five_s_audit_teams t on t.id = p.assigned_team_id
         join lateral (
           select t.leader_user_id::text as user_id
           union all
           select m.user_id::text from main.five_s_audit_team_members m
            where m.team_id = t.id and coalesce(m.is_active, true)
         ) x on true
        where p.location_id::text = $1 and ${OPEN_PLAN}`,
      [locationId]
    )
    const clash = people.filter((r) => added.has(idOf(r.user_id)))
    if (clash.length === 0) return undefined
    const ids = [...new Set(clash.map((r) => idOf(r.user_id)))]
    const names = await userNames(read, ids)
    const teams = [...new Set(clash.map((r) => str(r.team_name)).filter(Boolean))]
    return refuse(
      `${(names.length > 0 ? names : ids).join(', ')} bu lokasyonun açık denetim planına atanmış ekipte (${teams.join(', ')}) yer alıyor; kendi lokasyonunu denetleyen ekipte olan biri saha sorumlusu yapılamaz. Önce planı başka bir ekibe taşıyın ya da ekibi düzenleyin.`
    )
  }
  return undefined
}

/**
 * The godmin accounts among these user ids: `users.is_god`, or an active
 * grant of the godmin role.
 */
async function godminTargets(read: Read, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return []
  const rows = await read(
    `select u.id::text as id from main.users u
      where u.id::text = any($1::text[])
        and (u.is_god is true
             or exists (select 1 from main.user_roles ur join main.roles r on r.id = ur.role_id
                         where ur.user_id = u.id and ur.is_active is not false
                           and lower(trim(r.name)) = 'godmin'))`,
    [ids]
  )
  return rows.map((r) => idOf(r.id)).filter(Boolean)
}

/**
 * Whether this person leads, or is an active member of, the team a plan is
 * assigned to. The plan's stored team: nobody below Merkez Ekip may write
 * `assigned_team_id`.
 */
async function onPlanTeam(read: Read, teamId: string, userId: string): Promise<{ leader: boolean; member: boolean }> {
  if (!teamId || !userId) return { leader: false, member: false }
  const rows = await read(
    `select t.leader_user_id::text as leader_user_id,
            exists (select 1 from main.five_s_audit_team_members m
                     where m.team_id = t.id and m.user_id::text = $2 and coalesce(m.is_active, true)) as is_member
       from main.five_s_audit_teams t
      where t.id::text = $1`,
    [teamId, userId]
  )
  const row = rows[0]
  if (!row) return { leader: false, member: false }
  return { leader: idOf(row.leader_user_id) === userId, member: row.is_member === true }
}

const isPlannedStatus = (status: string): boolean => status === 'planned' || status === ''

/** An attendance flag as a comparable value: 'true', 'false' or '' (no record). */
const flag = (v: unknown): string => (v === true || v === 'true' ? 'true' : v === false || v === 'false' ? 'false' : '')

export async function enforceBusinessRules(ctx: RuleContext): Promise<Response | undefined> {
  const { request } = ctx
  const read = ctx.read ?? query

  /*
   * Nothing to judge before nucleus has had its say on these two.
   *
   * This guard runs ahead of nucleus's inbound guard and its auth. A request
   * with no credential at all is answered 401 by nucleus on every route here,
   * so reading its body, or the database, only gave anonymous callers a free
   * JSON parse and answers built from rows (names, open-plan counts). A body
   * over nucleus's ceiling is answered 413 by the inbound guard from the
   * Content-Length alone; reading it here first buffered it twice.
   */
  if (!carriesCredentials(request)) return undefined
  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > BODY_LIMIT) {
    return NUCLEUS_BODY_LIMIT ? undefined : refuse('İstek gövdesi çok büyük.', 413)
  }

  // Who is calling, looked up once and only when a rule asks.
  let callerLookup: Promise<Caller | null> | undefined
  const who = (): Promise<Caller | null> => {
    if (ctx.caller !== undefined) return Promise.resolve(ctx.caller)
    callerLookup ??= resolveCaller(request, read).catch(() => null)
    return callerLookup
  }

  /*
   * A rule that depends on who is calling, and nobody can be identified.
   *
   * 401, not 400: the commonest cause is a session that lapsed while a tablet
   * was offline, and the offline queue keeps a 401 for a retry after sign-in
   * but sets a 400 aside as "reddedildi" — one tap from being discarded.
   */
  const unidentified = () => refuse('Oturum doğrulanamadı; lütfen yeniden giriş yapın.', 401)
  const requireCaller = async (
    allowed: (caller: Caller) => boolean,
    message: string,
    status = 400
  ): Promise<Response | undefined> => {
    const caller = await who()
    if (!caller) return unidentified()
    return allowed(caller) ? undefined : refuse(message, status)
  }

  /*
   * The godmin's account is not anyone else's to change.
   *
   * The users screen's own routes refuse it, but Super Admin also holds
   * put/patch/delete on nucleus's generic `users` routes, and nucleus does not
   * protect a godmin row there: PATCH /users/<godmin> {"isActive":false}
   * switched the install's own account off and ended its sessions.
   */
  const requestPath = new URL(request.url).pathname
  if (['PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const userBulk = USER_BULK.test(requestPath)
    const userItem = userBulk ? null : USER_ITEM.exec(requestPath)
    if (userBulk || userItem) {
      const ids = userBulk ? await readIdArray(request) : [pathId(userItem?.[1])]
      if ((await godminTargets(read, ids.filter(Boolean))).length > 0) {
        const refusal = await requireCaller((c) => c.isGod, 'Godmin hesabı değiştirilemez.', 403)
        if (refusal) return refusal
      }
      return undefined
    }
  }

  if (request.method === 'DELETE') {
    const deletePath = requestPath

    /*
     * The second door. nucleus serves `DELETE /<entity>/bulk` for any entity
     * whose bulk endpoints are switched on; Biltim's are off today, so this is
     * the check waiting on the door if they are ever switched on. Each id goes
     * through the same rule as the by-id DELETE.
     */
    const bulk = MASTER_BULK.exec(deletePath)
    if (bulk) {
      for (const id of await readIdArray(request)) {
        const refusal = await guardMasterDataDelete(`/${bulk[1]}/${encodeURIComponent(id)}`, read)
        if (refusal) return refusal
      }
      return undefined
    }

    if (!LOCATION_ITEM.test(deletePath) && !TEAM_ITEM.test(deletePath)) return undefined
    return guardMasterDataDelete(deletePath, read)
  }
  if (!WRITE_METHODS.has(request.method)) return undefined

  const path = requestPath
  const auditSide =
    FINDING_PATH.test(path) ||
    FINDING_COLLECTION.test(path) ||
    PLAN_PATH.test(path) ||
    PLAN_COLLECTION.test(path) ||
    AUDIT_PATH.test(path) ||
    AUDIT_COLLECTION.test(path) ||
    ANSWER_COLLECTION.test(path) ||
    ANSWER_ITEM.test(path)
  const masterSide =
    request.method === 'POST'
      ? TEAM_MEMBER_COLLECTION.test(path)
      : TEAM_MEMBER_ITEM.test(path) || TEAM_ITEM.test(path) || LOCATION_ITEM.test(path)
  if (!auditSide && !masterSide) return undefined

  /*
   * JSON or nothing.
   *
   * Every rule below reads the body as JSON, and nucleus also parses
   * `application/x-www-form-urlencoded` and `multipart/form-data` into the
   * same columns. A form post carrying `status=closed` was therefore read here
   * as an empty body and passed every rule, then written by nucleus as a
   * closed finding. Nothing Biltim sends to these tables is a form — uploads
   * go to /files — so anything but JSON is refused rather than half-read.
   */
  if (carriesBody(request) && bodyKind(request.headers.get('content-type')) !== 'json') {
    return refuse('Bu kayıt yalnız JSON gövdesiyle (Content-Type: application/json) yazılabilir.', 415)
  }

  const body = await readBody(ctx)

  if (masterSide) return guardTeamAndLocationEdit(path, request.method, body, read)

  /*
   * Nothing was found, and no audit was carried out, on a day that has not
   * happened yet.
   *
   * Measured: five of the eight audits in the database carried a date in the
   * future, because picking a planned audit copies the PLAN's date into the
   * form — an audit performed today against a plan dated 5 December was
   * recorded as happening on 5 December. Two findings inherited the same
   * date. The consequence is not cosmetic: the reports endpoint averages
   * (completed_at - detected_date), and with a detection date in the future
   * that average came out at **-88 days**. "Bu ay yapılan denetimler" counts
   * the same column.
   *
   * A plan's own `planned_date` is deliberately not checked here — a plan is
   * supposed to be in the future.
   */
  const today = todayAtPlant()
  const futureField = (
    [
      ['detected_date', 'Tespit tarihi'],
      ['audit_date', 'Denetim tarihi'],
    ] as const
  ).find(([key]) => {
    const raw = body[key]
    if (raw === undefined || raw === null || raw === '') return false
    const dateKey = toDateKey(raw)
    return dateKey !== '' && dateKey > today
  })
  if (futureField) {
    return refuse(`${futureField[1]} gelecekte olamaz.`)
  }

  /*
   * A 5S score is out of 100, and the database will take 150.
   *
   * Measured: the edit modal's own field says max="100" and the browser marks
   * 150 invalid, but the form submits regardless — the audit was stored with
   * total_score 150.00, and PATCH with the same value answered 200. Every
   * number the customer is shown is computed from these columns: the period
   * average, the "hedef üstü / hedef altında" verdict, the trend line. One
   * mistyped score moves all of them, and nothing on any screen says the value
   * is impossible.
   *
   * The ceiling is the one the form already claims, so this refuses only what
   * the screen would never have sent.
   */
  if (AUDIT_PATH.test(path) || AUDIT_COLLECTION.test(path)) {
    const SCORE_FIELDS: Array<[string, string]> = [
      ['total_score', 'Toplam puan'],
      ['score_s1', 'S1 puanı'],
      ['score_s2', 'S2 puanı'],
      ['score_s3', 'S3 puanı'],
      ['score_s4', 'S4 puanı'],
      ['score_s5', 'S5 puanı'],
    ]
    for (const [key, label] of SCORE_FIELDS) {
      const raw = body[key]
      if (raw === undefined || raw === null || raw === '') continue
      const n = Number(raw)
      if (!Number.isFinite(n)) {
        return refuse(`${label} sayı olmalıdır.`)
      }
      if (n < 0 || n > 100) {
        return refuse(`${label} 0 ile 100 arasında olmalıdır; gönderilen: ${raw}.`)
      }
    }
  }

  const findingItem = request.method !== 'POST' ? FINDING_PATH.exec(path) : null
  if (findingItem) {
    /*
     * The auditor records findings; changing one afterwards is not theirs
     * (trace R9). The screens already keep an auditor-only account off the
     * findings register, and the audit form only ever POSTs a finding, but the
     * role still held put/patch on every column except status — description,
     * due date, photos and the person responsible of any finding, closed ones
     * included, were one request away.
     */
    // Unknown is not "not an auditor": like every other caller rule here, a
    // caller the guard cannot identify is refused rather than let past.
    const findingCaller = await who()
    if (!findingCaller) return unidentified()
    if (isAuditorOnly(findingCaller)) {
      return refuse('Denetçi bulguları değiştiremez; yalnız yeni bulgu ekleyebilir.', 403)
    }

    const sides = (['after', 'before'] as const).filter((side) => photoKeys(side).some((key) => key in body))
    const incomingStatus = body.status === undefined ? undefined : str(body.status).toLowerCase()
    if (sides.length > 0 || incomingStatus !== undefined) {
      const rows = await read(
        `select status, photo_after_url, photo_after_file_id, photo_after_files,
                photo_before_url, photo_before_file_id, photo_before_files
           from main.five_s_findings where id::text = $1`,
        [pathId(findingItem[1])]
      )
      // No row: let the route answer 404 in its own words.
      const row = rows[0]
      const storedClosed = !!row && str(row.status).toLowerCase() === 'closed'

      /*
       * A closed finding stays closed unless Merkez Ekip reopens it (#31).
       *
       * The photo rule below only guards CLOSED findings, so reopening first
       * and stripping the photos second walked straight round it, and closing
       * again needs only one "after" photo of any kind.
       */
      if (storedClosed && incomingStatus !== undefined && incomingStatus !== 'closed') {
        const refusal = await requireCaller(
          isAdmin,
          'Kapatılmış bulgu yalnız Merkez Ekip veya Super Admin tarafından yeniden açılabilir.'
        )
        if (refusal) return refusal
      }

      /*
       * A closed finding keeps its evidence (#31).
       *
       * Closing requires an "after" photo, and the photo is what the finding is
       * closed ON. The screen let anyone who could edit the finding remove it
       * afterwards, which left a closed finding with nothing behind the word
       * "closed". Removing or swapping a photo of a closed finding is now Merkez
       * Ekip's or a Super Admin's call; adding one stays open to everyone.
       */
      if (row && storedClosed && sides.length > 0) {
        const drops = sides.some((side) => {
          const next = { ...row }
          for (const key of photoKeys(side)) {
            if (key in body) next[key] = body[key]
          }
          return dropsPhoto(row, next, body, side)
        })
        if (drops) {
          const refusal = await requireCaller(
            isAdmin,
            'Kapatılmış bulgunun fotoğrafı yalnız Merkez Ekip veya Super Admin tarafından silinebilir ya da değiştirilebilir.'
          )
          if (refusal) return refusal
        }
      }

      /*
       * Closing needs an "after" photo, judged on the row as it will be AFTER
       * this write. A photo supplied in the same request counts — the screen
       * uploads first, but a caller may legitimately do both at once — and a
       * photo the same request removes does not: `{"status":"closed",
       * "photo_after_url":null}` used to pass on the strength of the stored
       * photo it was deleting.
       */
      if (row && incomingStatus === 'closed') {
        const next = { ...row }
        for (const key of photoKeys('after')) {
          if (key in body) next[key] = body[key]
        }
        if (!hasAfterPhoto(next)) {
          return refuse('Bulgu kapatılamaz: önce "Sonrası Fotoğraf" yüklenmelidir.')
        }
      }
    }
  }

  /*
   * Nobody audits the place they are responsible for (#27).
   *
   * Someone can be an auditor on one team and a location's field manager at
   * the same time. The home page offered them "Denetimi Başlat" on the audit of
   * their own location, and the audit was saved. Merkez Ekip, Super Admin and
   * the godmin, who may correct any audit, are not held to it; Müdür is
   * (rows 12/17/29 keep finished audits out of Müdür's hands, and an audit of
   * one's own place is the same conflict).
   *
   * An audit starts in three places, and each is checked: POST /fiveSAudits
   * against a plan; POST /fiveSAudits with no plan, naming the location by id
   * or by name (`department_name` carries the location's name); and the plan
   * write that links the audit or sends it for approval.
   *
   * A caller this cannot identify is answered 401 when the location HAS a
   * field manager. It used to be let through, so a field manager whose token
   * had lapsed — the commonest way to be unidentifiable — was the one person
   * the rule did not apply to.
   */
  const startRefusal = async (managers: string[]): Promise<Response | undefined> => {
    if (managers.length === 0) return undefined
    const caller = await who()
    if (!caller) return unidentified()
    if (isAdmin(caller)) return undefined
    if (managers.includes(idOf(caller.userId))) {
      return refuse(
        'Saha sorumlusu olduğunuz lokasyonun denetimini siz yapamazsınız; bu denetimi ekipteki diğer denetçiler başlatmalıdır.'
      )
    }
    return undefined
  }

  if (AUDIT_COLLECTION.test(path) && request.method === 'POST') {
    /*
     * Every place the write names counts: the plan's location AND the
     * location the audit itself names. plan_id has no foreign key, so checking
     * only the plan let a field manager send another location's plan id (or
     * any uuid) with their own location as the audit's — and the audit of
     * their own place was saved.
     */
    const planId = idOf(body.plan_id)
    const locationId = idOf(body.location_id)
    const locationName = str(body.department_name)
    const managers: string[] = []
    if (planId) {
      const rows = await read(
        `select p.status, p.audit_id::text as audit_id, l.field_manager_user_ids
           from main.five_s_audit_plans p
           left join main.five_s_locations l on l.id = p.location_id
          where p.id::text = $1`,
        [planId]
      )
      /*
       * One plan, one audit.
       *
       * A double tap on "Formu Kaydet", or a second tap on a slow connection,
       * sent two audits for the same plan, each with its own answers and
       * findings, and both counted in every report. Once the plan carries an
       * audit or has been sent for approval, the next audit for it is a
       * duplicate. 409 is a refusal to the offline queue, so a replay of an
       * audit that already went through is set aside, not retried.
       *
       * A single finding's carrier row (`source = 'single_finding'`) is not an
       * audit — every report leaves it out — and the offline queue replays it
       * with the plan it was recorded under, possibly after the audit itself.
       * Refusing it would lose the finding, so it is not counted here.
       */
      const plan = rows[0]
      const status = str(plan?.status)
      const carrier = str(body.source) === 'single_finding'
      if (plan && !carrier && (idOf(plan.audit_id) !== '' || status === PENDING_APPROVAL || status === 'completed')) {
        return refuse('Bu plan için denetim zaten gönderilmiş.', 409)
      }
      managers.push(...jsonIds(plan?.field_manager_user_ids))
    }
    if (locationId || locationName) {
      const rows = await read(
        `select field_manager_user_ids from main.five_s_locations
          where ($1::text <> '' and id::text = $1::text)
             or ($2::text <> '' and lower(trim(name)) = lower(trim($2::text)))`,
        [locationId, locationName]
      )
      managers.push(...rows.flatMap((r) => jsonIds(r.field_manager_user_ids)))
    }
    const refusal = await startRefusal([...new Set(managers)])
    if (refusal) return refusal
  }

  const planItem = request.method !== 'POST' ? PLAN_PATH.exec(path) : null
  if (planItem && (str(body.audit_id) !== '' || str(body.status) === PENDING_APPROVAL)) {
    const planId = pathId(planItem[1])
    const rows = str(body.location_id)
      ? await read('select field_manager_user_ids from main.five_s_locations where id::text = $1', [
          idOf(body.location_id),
        ])
      : await read(
          `select l.field_manager_user_ids from main.five_s_audit_plans p
             join main.five_s_locations l on l.id = p.location_id
            where p.id::text = $1`,
          [planId]
        )
    const refusal = await startRefusal(jsonIds(rows[0]?.field_manager_user_ids))
    if (refusal) return refusal
  }

  /*
   * A finished audit is corrected by Merkez Ekip alone (rows 12, 17, 29).
   *
   * Once the plan an audit belongs to is waiting for approval or approved, its
   * scores and answers are the record Merkez Ekip signs off. Müdür holds the
   * write claims on audits and answers for planning-time work, but correcting
   * a sent or approved audit is not theirs, nor anyone else's below Merkez
   * Ekip. The link is either side: the plan's `audit_id`, or the audit's own
   * `plan_id`.
   *
   * The auditor's own submission is untouched: the answers are posted before
   * the plan is stamped, while it is still `planned`.
   */
  const auditItem = request.method !== 'POST' ? AUDIT_PATH.exec(path) : null
  const answerItem = request.method !== 'POST' ? ANSWER_ITEM.exec(path) : null
  const answerCreate = request.method === 'POST' && ANSWER_COLLECTION.test(path)
  if (auditItem || answerItem || answerCreate) {
    const auditIds = new Set<string>()
    if (auditItem) auditIds.add(pathId(auditItem[1]))
    if ((answerItem || answerCreate) && idOf(body.audit_id)) auditIds.add(idOf(body.audit_id))
    if (answerItem) {
      const rows = await read('select audit_id from main.five_s_audit_answers where id::text = $1', [
        pathId(answerItem[1]),
      ])
      if (idOf(rows[0]?.audit_id)) auditIds.add(idOf(rows[0]?.audit_id))
    }
    if (auditIds.size > 0) {
      const ids = [...auditIds]
      const locked = await read(
        `select p.status from main.five_s_audit_plans p
          where coalesce(p.status, '') in ('completed', 'pending_approval')
            and (p.audit_id::text = any($1::text[])
                 or p.id::text in (select a.plan_id::text from main.five_s_audits a where a.id::text = any($1::text[])))
          limit 1`,
        [ids]
      )
      if (locked.length > 0) {
        const refusal = await requireCaller(
          isAdmin,
          'Tamamlanmış ya da onay bekleyen bir denetimi yalnız Merkez Ekip düzeltebilir.',
          403
        )
        if (refusal) return refusal
      }
    }
  }

  /*
   * A finding needs to say what was found, and where.
   *
   * None of description, location_name, finding_type or detected_date is NOT
   * NULL, so POST /fiveSFindings with an empty body answered 200 and created a
   * row. Eight of them existed in the local database with nothing in any
   * column — invisible on the dashboard, which counts through five_s_audits,
   * and meaningless in the register. The audit form and the single-finding
   * modal both require all four.
   */
  if (FINDING_COLLECTION.test(path) && request.method === 'POST') {
    // The number is the database's to give (#22). An identity "BY DEFAULT"
    // takes whatever a client sends, and nothing makes it unique.
    if (present(body, 'finding_no')) {
      return refuse('Bulgu numarasını sistem verir; finding_no gönderilemez.')
    }
    const missing = ['description', 'location_name', 'finding_type', 'detected_date'].filter(
      (k) => !present(body, k)
    )
    if (missing.length > 0) {
      return refuse(`Bulgu kaydedilemedi: ${missing.join(', ')} alanları zorunludur.`)
    }
    // Created already closed: the same evidence rule as closing one later.
    if (str(body.status).toLowerCase() === 'closed' && !hasAfterPhoto(body)) {
      return refuse('Bulgu kapatılamaz: önce "Sonrası Fotoğraf" yüklenmelidir.')
    }
  }

  // Nor can a number be rewritten later — it is how the plant cites a finding.
  if (findingItem && present(body, 'finding_no')) {
    return refuse('Bulgu numarası değiştirilemez.')
  }

  /*
   * A plan is one of two shapes, and "neither" is not one of them.
   *
   * A PERIOD plan carries a quarter and a date range; an AUDIT plan carries a
   * date, a location and a team. Both UI forms require exactly that
   * (submitParentPlan needs quarter + start + end, submitSubPlan needs date +
   * location + team), but none of those columns is NOT NULL, so the API
   * accepted a plan with nothing in it at all. Seven such rows reached the
   * planning screen and rendered as "— ? – ? 0 denetim planı".
   */
  const planCreate = PLAN_COLLECTION.test(path) && request.method === 'POST'

  /*
   * A plan's date is a day, written `YYYY-MM-DD`.
   *
   * The rules below compare the first ten characters, and nucleus parses the
   * value with `new Date()` before it writes it. Those disagree for anything
   * but a plain day: `2026-11-02T23:30:00-12:00` is the 2nd here and the 3rd
   * in the database, so a date moved a day at a time without spending a
   * change; `2026-02-31` is the 31st here and 3 March there. Both screens send
   * the value of a date input, which is always the plain form.
   */
  if ((planCreate || planItem) && body.planned_date !== undefined && body.planned_date !== null) {
    if (!isPlainDate(body.planned_date)) return refuse('Tarih YYYY-AA-GG biçiminde olmalı.')
  }

  if (planCreate) {
    const isPeriod =
      present(body, 'quarter') && present(body, 'date_range_start') && present(body, 'date_range_end')
    const isAudit =
      present(body, 'planned_date') && present(body, 'location_id') && present(body, 'assigned_team_id')
    if (!isPeriod && !isAudit) {
      return refuse(
        'Plan kaydedilemedi: bir dönem planı için çeyrek ve tarih aralığı, bir denetim planı için tarih, lokasyon ve ekip gereklidir.'
      )
    }
  }

  /*
   * A plan belongs to its period. The screen disables "Denetim Planı Oluştur"
   * for a date outside the parent's range; the API accepted 2027-03-15 into a
   * period running 2026-10-01 to 2026-12-31. The quarterly cycle is what the
   * whole 5S programme is reported on, so an audit filed under the wrong
   * quarter is not a cosmetic problem.
   */
  if (planCreate || (PLAN_PATH.test(path) && body.planned_date !== undefined)) {
    // A date move sends only the date; the period is the plan's stored one.
    let parentId = idOf(body.parent_plan_id)
    if (!parentId && !planCreate && planItem) {
      const own = await read('select parent_plan_id from main.five_s_audit_plans where id::text = $1', [
        pathId(planItem[1]),
      ])
      parentId = idOf(own[0]?.parent_plan_id)
    }
    const date = toDateKey(body.planned_date)
    if (parentId && date) {
      const parents = await read(
        'select date_range_start, date_range_end, quarter from main.five_s_audit_plans where id::text = $1',
        [parentId]
      )
      const parent = parents[0]
      if (parent) {
        const from = toDateKey(parent.date_range_start)
        const to = toDateKey(parent.date_range_end)
        if ((from && date < from) || (to && date > to)) {
          return refuse(
            `Denetim tarihi, bağlı olduğu dönemin (${parent.quarter ?? 'dönem'}) ${from} – ${to} aralığı dışında olamaz.`
          )
        }
      }
    }
  }

  /*
   * The location's field manager is not on the team sent to audit it (#13).
   * Checked when an audit plan is created, and when a plan's location or team
   * changes — the stored half fills in whichever the write leaves out.
   */
  const touchesPlacement = 'location_id' in body || 'assigned_team_id' in body
  if ((planCreate || planItem) && touchesPlacement) {
    let locationId = idOf(body.location_id)
    let teamId = idOf(body.assigned_team_id)
    if (planItem && (!locationId || !teamId)) {
      const rows = await read(
        'select location_id, assigned_team_id from main.five_s_audit_plans where id::text = $1',
        [pathId(planItem[1])]
      )
      locationId ||= idOf(rows[0]?.location_id)
      teamId ||= idOf(rows[0]?.assigned_team_id)
    }
    const clash = await fieldManagerOnTeam(read, locationId, teamId)
    if (clash.length > 0) {
      return refuse(
        `${clash.join(', ')} bu lokasyonun saha sorumlusu; kendi lokasyonunu denetleyen ekipte yer alamaz. Başka bir ekip seçin ya da ekibi düzenleyin.`
      )
    }
  }

  /*
   * Only Merkez Ekip finishes an audit (#28).
   *
   * Sending the form used to stamp the plan `completed`. It now stamps it
   * `pending_approval`, and `completed` is what Merkez Ekip's "Onayla" writes.
   * A client that still sends `completed` — an iPad on the old screen — is
   * told why rather than allowed past the approval. "Merkez Ekip" here is
   * Merkez Ekip, Super Admin and the godmin; Müdür plans audits but does not
   * approve them (rows 12, 17, 29).
   */
  if (planCreate && str(body.status) === 'completed') {
    const refusal = await requireCaller(
      isAdmin,
      'Denetim planı tamamlandı olarak oluşturulamaz; tamamlamayı Merkez Ekip onaylar.'
    )
    if (refusal) return refusal
  }

  if (planItem) {
    const touchesFlow = (['status', 'audit_id', 'auditor_attended', 'field_manager_attended'] as const).some(
      (key) => body[key] !== undefined
    )
    const touchesDate = body.planned_date !== undefined || body.date_change_count !== undefined
    if (!touchesFlow && !touchesDate) return undefined

    const rows = await read(
      `select planned_date, date_change_count, status, audit_id, auditor_attended, field_manager_attended,
              assigned_team_id
         from main.five_s_audit_plans where id::text = $1`,
      [pathId(planItem[1])]
    )
    const row = rows[0]
    if (!row) return undefined

    const storedStatus = str(row.status)
    const incomingStatus = body.status === undefined ? undefined : str(body.status)
    const done = storedStatus === 'completed' || storedStatus === PENDING_APPROVAL
    const used = Number(row.date_change_count ?? 0)
    // `null` is written as null, which the screens read as 0 — so it counts as 0.
    const hasCount = body.date_change_count !== undefined
    const incomingCount = Number(body.date_change_count ?? 0)

    // The plan's team, asked once and only when a rule needs it.
    let teamLookup: Promise<{ leader: boolean; member: boolean }> | undefined
    const team = (userId: string) => {
      teamLookup ??= onPlanTeam(read, idOf(row.assigned_team_id), idOf(userId))
      return teamLookup
    }

    if (incomingStatus === 'completed' && storedStatus !== 'completed') {
      const refusal = await requireCaller(
        isAdmin,
        'Denetim Merkez Ekip onayıyla tamamlanır. Denetçi formu gönderdiğinde plan "Onay Bekliyor" durumuna geçer.'
      )
      if (refusal) return refusal
    }
    if (storedStatus === 'completed' && incomingStatus !== undefined && incomingStatus !== 'completed') {
      const refusal = await requireCaller(
        isAdmin,
        'Tamamlanmış bir denetimin durumu yalnız Merkez Ekip tarafından değiştirilebilir.'
      )
      if (refusal) return refusal
    }

    /*
     * An auditor or field manager sends their own team's plan, and that is all.
     *
     * The Auditor role holds the status, audit_id and attendance columns of
     * every plan, so the only check used to be the two above: any auditor could
     * pull another team's audit back out of "Onay Bekliyor" with
     * `{"status":"planned"}`, cancel it, push someone else's plan in with no
     * audit behind it, or rewrite the audit link and attendance of an audit
     * Merkez Ekip had already approved — which moves the plan-compliance
     * report. Below Merkez Ekip and Müdür:
     *
     *   - the one status change is planned -> pending_approval, with the audit;
     *   - a plan already sent or approved keeps its audit link and attendance.
     *     Sending the same stamp again (the offline queue replaying a
     *     submission that already went through) changes nothing and passes;
     *   - and the plan must be their team's: its leader or an active member.
     */
    if (touchesFlow) {
      const caller = await who()
      if (!caller) return unidentified()
      if (!isCentral(caller)) {
        if (incomingStatus !== undefined && incomingStatus !== storedStatus) {
          const sending = isPlannedStatus(storedStatus) && incomingStatus === PENDING_APPROVAL && idOf(body.audit_id) !== ''
          if (!sending) {
            return refuse(
              'Plan yalnız denetimiyle birlikte "Onay Bekliyor" durumuna gönderilebilir; başka durum değişikliğini Merkez Ekip yapar.'
            )
          }
        }
        if (done) {
          const relinks = body.audit_id !== undefined && idOf(body.audit_id) !== idOf(row.audit_id)
          const reattends = (['auditor_attended', 'field_manager_attended'] as const).some(
            (key) => body[key] !== undefined && flag(body[key]) !== flag(row[key])
          )
          if (relinks || reattends) {
            return refuse(
              'Onay bekleyen ya da tamamlanmış bir planın denetim bağlantısı ve katılım bilgisi yalnız Merkez Ekip tarafından değiştirilebilir.'
            )
          }
        }
        const on = await team(caller.userId)
        if (!on.leader && !on.member) {
          return refuse('Bu plan ekibinize atanmamış; planı yalnız atanan ekip gönderebilir.', 403)
        }
      }
    }

    if (!touchesDate) return undefined

    // The two changes a plan is allowed are spent, not refilled — except by
    // the godmin, the install's own account for putting things right.
    if (hasCount && Number.isFinite(incomingCount) && Number.isFinite(used) && incomingCount < used) {
      const refusal = await requireCaller((c) => c.isGod, 'Tarih değiştirme hakkı geri verilemez.')
      if (refusal) return refusal
    }

    const stored = toDateKey(row.planned_date)
    const incoming = body.planned_date === undefined ? stored : toDateKey(body.planned_date)

    if (incoming === stored) {
      /*
       * Writing the same date back is not a change, and it does not spend one.
       * The home page's "Kaydet" sent `used + 1` whether or not the date had
       * moved, so saving an unchanged date took a change away.
       */
      if (hasCount && Number.isFinite(incomingCount) && Number.isFinite(used) && incomingCount > used) {
        const refusal = await requireCaller((c) => c.isGod, 'Tarih değişmedi; değişiklik hakkı kullanılmadı.')
        if (refusal) return refusal
      }
      return undefined
    }

    const caller = await who()
    if (!caller) return unidentified()

    /*
     * The date of an audit that has been carried out is a record, not a plan
     * (#16). Merkez Ekip may correct it; the team leader who could move it
     * while it was planned may not rewrite it afterwards, and neither may
     * Müdür (row 17).
     */
    if (done && !isAdmin(caller)) {
      return refuse('Tamamlanmış denetimin tarihi yalnız Merkez Ekip tarafından değiştirilebilir.')
    }

    /*
     * Below Merkez Ekip and Müdür, only the plan's own team leader moves its
     * date, and only while it is planned. The Auditor role holds the two date
     * columns because the leader is an auditor; this is what keeps them to
     * the leader.
     */
    if (!isCentral(caller)) {
      const leads = isPlannedStatus(storedStatus) && incoming !== '' && (await team(caller.userId)).leader
      if (!leads) return refuse('Planın tarihini yalnız ekip lideri ve Merkez Ekip değiştirebilir.')
    }

    // Clearing a date is not a move and spends nothing (Merkez Ekip only, above).
    if (incoming === '') return undefined

    // #32: the godmin moves any date, any number of times. A correction to a
    // finished audit is not a postponement and does not spend a change — so
    // the counter it carries must stay where it is.
    if (caller.isGod || done) {
      if (hasCount && incomingCount !== used) {
        return refuse('Bu tarih düzeltmesi değiştirme hakkı harcamaz; tarih değiştirme sayısı değiştirilemez.')
      }
      return undefined
    }

    if (Number.isFinite(used) && used >= MAX_DATE_CHANGES) {
      return refuse(`Denetim tarihi en fazla ${MAX_DATE_CHANGES} kez değiştirilebilir; bu plan için hak kalmadı.`)
    }

    /*
     * The counter is the client's to send, so it has to be the right one.
     *
     * The screen sends `date_change_count: used + 1` with the new date, and
     * nucleus writes whatever arrives. A move that left the counter out, or
     * sent it unchanged, kept the plan at "2 hak" forever — the cap counted
     * moves nobody recorded.
     */
    if (!hasCount || incomingCount !== used + 1) {
      return refuse(
        `Tarih değiştirme sayısı uyuşmuyor: bu değişiklik ${used + 1}. hak olarak kaydedilmelidir. Sayfayı yenileyip yeniden deneyin.`
      )
    }
    return undefined
  }

  return undefined
}
