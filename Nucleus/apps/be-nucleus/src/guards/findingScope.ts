import { query as dbQuery } from '../db'
import { isScopedFieldManager } from '../routes/auditReport'
import { locationKey, nameOf, spellingsInKeys } from '../routes/locationMatch'
import { readBody, refuse } from './businessRules'
import { type Caller, type Read, carriesCredentials, resolveCaller } from './caller'
import { FINDING_LOCATION_SQL, FINDING_SPELLINGS_SQL, MANAGED_LOCATIONS_SQL, type Target, classifyFindingRequest } from './findingScopeRoutes'
import {
  FINDING_BULK_MESSAGE,
  FINDING_DISTINCT_MESSAGE,
  FINDING_FILTER_FORM_MESSAGE,
  FINDING_READ_MESSAGE,
  FINDING_WRITE_MESSAGE,
  UNIDENTIFIED_MESSAGE,
} from './findingScopeMessages'
import { BRACKET_FILTERS, isPlaceLookup, parseFilters } from './findingScopeFilters'
import { carriesClosingKey, rejectedPlanTeamsOfFinding } from './rejectedPlan'

/**
 * A field manager's findings stop at their own locations (customer notes, row
 * 49: "Saha sorumlusu raporlarda yalnız kendi bölgesinin verisini görür").
 *
 * The register screen narrowed the list and hid the close button, and nothing
 * else did: `GET /fiveSFindings` returned every finding of the plant and
 * `PATCH /fiveSFindings/<id>` closed one of another location. This guard puts
 * the same limit on the generic routes, in front of `enforceBusinessRules`
 * (requestGuard.ts runs the two in that order).
 *
 * Whose locations: `five_s_locations.field_manager_user_ids`, the notion the
 * reports use (`managedSpellings`). Which findings belong to them: the finding's
 * `location_name` text, compared through `locationKey` (Turkish fold, spaces,
 * zero-width marks, dotted and dotless i), exactly as the reports compare it.
 *
 * Who is limited: a field manager and nothing above (`isScopedFieldManager`).
 * Merkez Ekip, Super Admin, Müdür and the godmin are not; an auditor-only
 * caller is not a field manager and keeps the rules of `isAuditorOnly`.
 *   - Writes (PUT, PATCH, DELETE): every scoped field manager, an auditor who is
 *     also one included. Closing is the field manager's job and stops at their
 *     places; the audit screens never PUT a finding.
 *   - Reads (list, one finding, distinct): every scoped field manager. An
 *     auditor who is also one keeps only the two list reads the audit form
 *     makes (`isPlaceLookup`): the open findings of the place being audited
 *     (`location_name`) and the offline replay's duplicate check
 *     (`client_finding_id`). Any other read of theirs (an unfiltered list,
 *     distinct, a finding of a foreign place) is limited like a pure field
 *     manager's: they see their own region only (row 49).
 */

/** The query the router hands a guard: the same object the generic route's handler reads. */
export type FindingQuery = Record<string, string | undefined>

export type ScopeContext = {
  request: Request
  /** Narrowed in place for a field manager's list read (see `narrowFindingQuery`). */
  query: FindingQuery
  /** Injected by tests. */
  read?: Read
  /** Injected by tests; left undefined it is read from the session. */
  caller?: Caller | null
}

export type ScopeResult = {
  refusal?: Response
  /** Set once the caller was looked up, so the rules after this one need not look again. */
  caller?: Caller | null
}

/** A closing is a few keys; a body this large is not one, so it never counts as one. */
const CORRECTION_BODY_MAX = 256 * 1024

/** The `locationKey` of every place the user field-manages; empty when they manage none. */
async function managedKeys(read: Read, userId: string): Promise<Set<string>> {
  const own = await read(MANAGED_LOCATIONS_SQL, [userId])
  return new Set(own.map((row) => locationKey(nameOf(row))).filter((key) => key !== ''))
}

const isOwn = (keys: ReadonlySet<string>, location: string): boolean => {
  const key = locationKey(location)
  return key !== '' && keys.has(key)
}

/** The finding's `location_name`; undefined when there is no such finding. */
async function findingLocation(read: Read, id: string): Promise<string | undefined> {
  const rows = await read(FINDING_LOCATION_SQL, [id])
  return rows[0] ? nameOf({ name: rows[0].location_name }) : undefined
}

/**
 * Adds `location_name in <spellings>` to the list request's own `filters`.
 *
 * nucleus ANDs every top-level condition, so what the caller asked for is kept
 * and the location limit comes on top; an empty `spellings` (a field manager of
 * no place) is `in ()`, which nucleus builds as `false`: an empty list, never
 * the plant's. A `filters` nucleus cannot read is left alone, because nucleus
 * answers 400 for it before any row is read. The bracket form
 * (`filters[0][field]=…`) would override a `filters` written here, and nothing
 * in the product sends it, so a field manager's request in that form is refused.
 */
export function narrowFindingQuery(query: FindingQuery, spellings: string[]): Response | undefined {
  if (Object.keys(query).some((key) => BRACKET_FILTERS.test(key))) return refuse(FINDING_FILTER_FORM_MESSAGE, 400)
  const asked = parseFilters((query.filters ?? '').trim())
  if (asked === null) return undefined
  query.filters = JSON.stringify([...asked, { field: 'location_name', operator: 'in', value: spellings }])
  return undefined
}

async function narrowList(query: FindingQuery, read: Read, caller: Caller): Promise<Response | undefined> {
  const keys = await managedKeys(read, caller.userId)
  const stored = keys.size === 0 ? [] : await read(FINDING_SPELLINGS_SQL, [])
  return narrowFindingQuery(query, spellingsInKeys(stored.map(nameOf), keys))
}

async function readRefusal(read: Read, caller: Caller, id: string): Promise<Response | undefined> {
  const location = await findingLocation(read, id)
  if (location === undefined) return undefined
  return isOwn(await managedKeys(read, caller.userId), location) ? undefined : refuse(FINDING_READ_MESSAGE, 403)
}

/**
 * A finding of a plan sent back for correction, written as a correction: that
 * is the plan's team's and Merkez Ekip's (`rejectedRefusal`, which runs after
 * this guard), whoever else the writer is. Closing it stays the field manager's
 * job and is never a correction here: a body that sets the status or any
 * closing key is a closing, even when it carries other keys as well.
 */
async function isTeamCorrection(ctx: ScopeContext, read: Read, id: string): Promise<boolean> {
  if ((await rejectedPlanTeamsOfFinding(read, id)).length === 0) return false
  if (ctx.request.method === 'DELETE') return true
  const declared = Number(ctx.request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > CORRECTION_BODY_MAX) return false
  return !carriesClosingKey(await readBody({ request: ctx.request, body: undefined }))
}

async function writeRefusal(ctx: ScopeContext, read: Read, caller: Caller, id: string): Promise<Response | undefined> {
  const location = await findingLocation(read, id)
  // No such finding: the route answers 404 in its own words.
  if (location === undefined) return undefined
  if (isOwn(await managedKeys(read, caller.userId), location)) return undefined
  if (await isTeamCorrection(ctx, read, id)) return undefined
  return refuse(FINDING_WRITE_MESSAGE, 403)
}

async function scopedRefusal(ctx: ScopeContext, read: Read, caller: Caller, target: Target) {
  const auditor = caller.roles.includes('auditor')
  switch (target.kind) {
    case 'write':
      return writeRefusal(ctx, read, caller, target.id)
    case 'bulk':
      return refuse(FINDING_BULK_MESSAGE, 403)
    case 'distinct':
      return refuse(FINDING_DISTINCT_MESSAGE, 403)
    case 'read':
      return readRefusal(read, caller, target.id)
    case 'list':
      return auditor && isPlaceLookup(ctx.query) ? undefined : narrowList(ctx.query, read, caller)
  }
}

export async function enforceFindingScope(ctx: ScopeContext): Promise<ScopeResult> {
  const { request } = ctx
  const target = classifyFindingRequest(request.method, new URL(request.url).pathname)
  // Nothing to judge without a credential: nucleus answers 401 for the route.
  if (!target || !carriesCredentials(request)) return {}

  const read: Read = ctx.read ?? dbQuery
  const caller = ctx.caller !== undefined ? ctx.caller : await resolveCaller(request, read).catch(() => null)
  // Like every caller rule here: a caller nobody can identify is asked to sign in again (401, which the offline queue keeps).
  if (!caller) return { caller, refusal: refuse(UNIDENTIFIED_MESSAGE, 401) }
  if (!isScopedFieldManager(caller)) return { caller }
  return { caller, refusal: await scopedRefusal(ctx, read, caller, target) }
}
