import { createHmac, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { query } from '../db'

/**
 * Who is making this request, for the rules that depend on it.
 *
 * The business-rule guard runs as the host's `onRequest`, which nucleus chains
 * AHEAD of its own auth middleware — so `x-user-id` is not set yet when the
 * rules run, and any value a client put there is still on the request. The
 * identity has to be read from the credential itself.
 *
 * It is read the way nucleus 0.10.115 reads it in full mode, or a rule could be
 * fooled by a request that nucleus authenticates as somebody else:
 *
 *   - an API key wins over every token in nucleus (and is never godmin), so a
 *     request carrying one is treated as nobody in particular here — but only
 *     when the install switched API keys on (`authentication.apiKeys.enabled`).
 *     Biltim has not, so nucleus ignores `x-api-key` and so does this;
 *   - the access-token cookie wins over the Authorization header
 *     (`parseTokenValuesFromHeaders`), so the same order is used, and like
 *     nucleus's cookie map the LAST cookie of a name is the one that counts;
 *   - the token's signature and expiry are checked with the same secret. An
 *     unsigned token naming the godmin would otherwise unlock the godmin-only
 *     paths below;
 *   - full mode authenticates every request through the SESSION cookie, not
 *     the access token. The access token lives 30 minutes; after that the
 *     browser holds only `nucleus_session_token` and nucleus keeps answering
 *     from the session. Reading only the token made the guard see nobody from
 *     minute 31 on, and Merkez Ekip's "Onayla" was refused as if they were an
 *     auditor. So the session is looked up as nucleus looks it up, and a valid
 *     access token must name the session's own user — nucleus answers 401 when
 *     they disagree, and here that is "unknown".
 *
 * Whenever the caller cannot be established the answer is "unknown", which
 * only ever means "no exception to the rule" — never more access.
 */

type AuthConfig = {
  mode?: string
  apiKeys?: { enabled?: boolean }
  accessToken?: { secret?: string; name?: string }
  sessionToken?: { name?: string }
}

/**
 * The install's own `authentication` block, read once at load.
 *
 * `null` when config.json cannot be read; each setting below then takes the
 * side that grants nothing (API keys assumed on, session assumed required).
 */
function loadAuthConfig(): AuthConfig | null {
  try {
    const raw = JSON.parse(readFileSync(new URL('../../config.json', import.meta.url), 'utf8'))
    const auth = raw?.authentication
    return auth && typeof auth === 'object' ? (auth as AuthConfig) : {}
  } catch {
    return null
  }
}

const AUTH = loadAuthConfig()

/** Same names config.json gives nucleus (`authentication.accessToken` / `sessionToken`). */
const ACCESS_COOKIE = AUTH?.accessToken?.name || 'nucleus_access_token'
const SESSION_COOKIE = AUTH?.sessionToken?.name || 'nucleus_session_token'
/** config.json names the env var that holds the secret, not the secret. */
const ACCESS_SECRET_ENV = AUTH?.accessToken?.secret || 'ACCESS_TOKEN_SECRET'

/** nucleus reads an API key only when `authentication.apiKeys.enabled` is set. */
export const API_KEYS_ENABLED = AUTH ? AUTH.apiKeys?.enabled === true : true

/**
 * Anything but `consumer` is full mode in nucleus, and full mode refuses a
 * request with no session cookie before it looks at the access token.
 */
export const SESSION_REQUIRED = AUTH ? AUTH.mode !== 'consumer' : true

const API_KEY = /^nk_(live|test)_[a-f0-9]{64}$/

export type Caller = {
  userId: string
  isGod: boolean
  /** Lower-cased role names, e.g. 'content manager core team'. */
  roles: string[]
}

/**
 * One cookie's value. Duplicates resolve to the LAST occurrence, because
 * nucleus builds a map of the header and a later key overwrites an earlier
 * one; reading the first would let `a=forged; a=real` mean different people
 * here and there.
 */
export function cookieValue(header: string | null, name: string): string | undefined {
  let found: string | undefined
  for (const part of (header ?? '').split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq > 0 && trimmed.slice(0, eq) === name) found = trimmed.slice(eq + 1)
  }
  return found
}

/**
 * Whether the request carries anything nucleus could authenticate it by: the
 * session cookie, the access-token cookie, an Authorization header or an API
 * key. Without any of them nucleus answers 401 for every guarded route, so the
 * guard has nothing to judge and must not read the body or the database for
 * it — that only handed anonymous callers row-dependent answers and a free
 * JSON parse of whatever they sent. Any value counts here, valid or not: this
 * decides only whether the guard runs, never what it lets through.
 */
export function carriesCredentials(request: Request): boolean {
  const headers = request.headers
  const cookie = headers.get('cookie')
  if (cookieValue(cookie, SESSION_COOKIE) || cookieValue(cookie, ACCESS_COOKIE)) return true
  if ((headers.get('authorization') ?? '').trim()) return true
  return !!(headers.get('x-api-key') ?? '').trim()
}

function carriesApiKey(headers: Headers): boolean {
  const key = headers.get('x-api-key')
  if (key && API_KEY.test(key)) return true
  const auth = headers.get('authorization') ?? ''
  const bearer = /^Bearer\s+(\S+)$/.exec(auth)?.[1]
  return !!bearer && API_KEY.test(bearer)
}

function decodeJson(segment: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'))
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

const HMAC: Record<string, string> = { HS256: 'sha256', HS384: 'sha384', HS512: 'sha512' }

/** The token's subject, only when nucleus itself would accept the token. */
export function verifiedSubject(
  request: Request,
  secret: string | undefined = process.env[ACCESS_SECRET_ENV],
  nowSeconds: number = Math.floor(Date.now() / 1000),
  apiKeysEnabled: boolean = API_KEYS_ENABLED
): string | null {
  if (!secret) return null
  const headers = request.headers
  if (apiKeysEnabled && carriesApiKey(headers)) return null

  const token =
    cookieValue(headers.get('cookie'), ACCESS_COOKIE) || headers.get('authorization')?.split(' ')[1]
  if (!token) return null

  const parts = token.split('.')
  if (parts.length !== 3 || parts.some((p) => !p)) return null
  const [head, body, signature] = parts as [string, string, string]

  const header = decodeJson(head)
  const algorithm = header && header.typ === 'JWT' ? HMAC[String(header.alg)] : undefined
  if (!algorithm) return null

  const expected = Buffer.from(createHmac(algorithm, secret).update(`${head}.${body}`).digest('base64url'))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null

  const payload = decodeJson(body)
  if (!payload) return null
  const exp = Number(payload.exp)
  if (payload.exp !== undefined && Number.isFinite(exp) && exp < nowSeconds) return null
  const iat = Number(payload.iat)
  if (payload.iat !== undefined && Number.isFinite(iat) && iat > nowSeconds + 60) return null

  const sub = typeof payload.sub === 'string' ? payload.sub.trim() : ''
  return sub || null
}

type Read = (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>

/**
 * The user a live session belongs to, judged the way nucleus judges it on
 * every request: the `user_sessions` row must exist, be active, not revoked
 * and not past its expiry, and the account behind it must not be switched off.
 *
 * nucleus also requires the Redis copy of the session (and its idle timeout).
 * Those can only make nucleus STRICTER than this, and when they do nucleus
 * answers 401 after the guard has run, so the guard's verdict is never used.
 * The row is the record — logout, revocation and eviction all land on it — and
 * its `user_id` is written from the same login as the Redis copy's `userId`,
 * so for any request nucleus lets through the two name the same person.
 */
export async function sessionUserFromDb(
  sessionId: string,
  read: Read = query,
  now: Date = new Date()
): Promise<string | null> {
  if (!sessionId) return null
  // `::text` so a cookie that is not a uuid answers "no session" instead of a 500.
  const rows = await read(
    `select s.user_id, s.is_active, s.revoked_at, s.expires_at, u.is_active as account_active
       from main.user_sessions s left join main.users u on u.id = s.user_id
      where s.id::text = $1`,
    [sessionId]
  )
  const row = rows[0]
  if (!row) return null
  if (row.is_active === false) return null
  if (row.revoked_at !== null && row.revoked_at !== undefined) return null
  if (row.expires_at) {
    const expires = new Date(row.expires_at as string | Date)
    if (!Number.isNaN(expires.getTime()) && expires < now) return null
  }
  // Only an explicit false denies; nucleus logs a missing users row and goes on.
  if (row.account_active === false) return null
  const userId = String(row.user_id ?? '').trim()
  return userId || null
}

export type CallerOptions = {
  secret?: string
  nowSeconds?: number
  apiKeysEnabled?: boolean
  sessionRequired?: boolean
  /** The session's owner, or null when nucleus would refuse it. Injected by tests. */
  sessionUser?: (sessionId: string) => Promise<string | null>
}

export async function resolveCaller(
  request: Request,
  read: Read = query,
  options: CallerOptions = {}
): Promise<Caller | null> {
  const apiKeysEnabled = options.apiKeysEnabled ?? API_KEYS_ENABLED
  if (apiKeysEnabled && carriesApiKey(request.headers)) return null

  const tokenSubject = verifiedSubject(
    request,
    options.secret ?? process.env[ACCESS_SECRET_ENV],
    options.nowSeconds ?? Math.floor(Date.now() / 1000),
    apiKeysEnabled
  )

  const sessionId = cookieValue(request.headers.get('cookie'), SESSION_COOKIE)
  let userId: string | null
  if (sessionId) {
    const lookup = options.sessionUser ?? ((id: string) => sessionUserFromDb(id, read))
    const owner = await lookup(sessionId)
    if (!owner) return null
    // nucleus: "Access token subject does not match session" -> 401.
    if (tokenSubject && tokenSubject !== owner) return null
    userId = owner
  } else {
    // Full mode answers 401 "No session token" before it reads the token.
    if (options.sessionRequired ?? SESSION_REQUIRED) return null
    userId = tokenSubject
  }
  if (!userId) return null
  return callerById(userId, read)
}

export async function callerById(userId: string, read: Read = query): Promise<Caller | null> {
  if (!userId) return null
  const users = await read('select is_god from main.users where id::text = $1', [userId])
  if (!users[0]) return null
  const roles = await read(
    // A switched-off grant (is_active = false) is revoked for nucleus; it is
    // revoked here too. NULL counts as active, as in nucleus's activeRows rule.
    `select r.name from main.user_roles ur join main.roles r on r.id = ur.role_id
      where ur.user_id::text = $1 and ur.is_active is not false`,
    [userId]
  )
  const names = roles.map((r) => String(r.name ?? '').trim().toLowerCase()).filter(Boolean)
  return {
    userId,
    isGod: users[0].is_god === true || names.includes('godmin'),
    roles: names,
  }
}

/**
 * The people who plan audits and see all of them: Merkez Ekip, Super Admin and
 * Müdür (Manager), plus the godmin.
 *
 * Same list the screens use for "privileged" (`isPrivilegedUser`), plus the
 * godmin, whom the screens forgot. Planning is not finishing: approving an
 * audit, reopening one, and correcting a finished one belong to `isAdmin`.
 */
export const CENTRAL_ROLES = ['content manager core team', 'super admin', 'manager'] as const

export function isCentral(caller: Caller | null): boolean {
  if (!caller) return false
  return caller.isGod || caller.roles.some((r) => (CENTRAL_ROLES as readonly string[]).includes(r))
}

/**
 * Merkez Ekip, Super Admin and the godmin — not Müdür.
 *
 * The customer's notes (rows 12, 17, 29): approving an audit, reopening a
 * completed one, moving the date of a finished one and correcting its scores
 * or answers are Merkez Ekip's alone. So is undoing evidence on a closed
 * finding.
 */
export const ADMIN_ROLES = ['content manager core team', 'super admin'] as const

export function isAdmin(caller: Caller | null): boolean {
  if (!caller) return false
  return caller.isGod || caller.roles.some((r) => (ADMIN_ROLES as readonly string[]).includes(r))
}

/** Every 5S role that does more than audit. */
const BEYOND_AUDIT: readonly string[] = ['field manager', ...CENTRAL_ROLES]

/**
 * A caller whose only 5S role is Auditor.
 *
 * The auditor records findings; they do not edit them afterwards (trace R9).
 * Someone who is also a field manager, a manager or above keeps what those
 * roles allow, and the godmin is never "only" anything.
 */
export function isAuditorOnly(caller: Caller | null): boolean {
  if (!caller || caller.isGod) return false
  return caller.roles.includes('auditor') && !caller.roles.some((r) => BEYOND_AUDIT.includes(r))
}
