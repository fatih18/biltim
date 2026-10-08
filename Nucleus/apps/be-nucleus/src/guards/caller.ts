import { createHmac, timingSafeEqual } from 'node:crypto'
import { query } from '../db'

/**
 * Who is making this request, for the rules that depend on it.
 *
 * The business-rule guard runs as the host's `onRequest`, which nucleus chains
 * AHEAD of its own auth middleware — so `x-user-id` is not set yet when the
 * rules run, and any value a client put there is still on the request. The
 * identity has to be read from the credential itself.
 *
 * It is read the way nucleus reads it, or a rule could be fooled by a request
 * that nucleus authenticates as somebody else:
 *
 *   - an API key wins over every token in nucleus (and is never godmin), so a
 *     request carrying one is treated as nobody in particular here;
 *   - the access-token cookie wins over the Authorization header
 *     (`parseTokenValuesFromHeaders`), so the same order is used;
 *   - the token's signature and expiry are checked with the same secret. An
 *     unsigned token naming the godmin would otherwise unlock the godmin-only
 *     paths below, and nucleus would then authenticate the request through the
 *     session cookie as its real owner.
 *
 * When the token cannot be verified (expired, and about to be silently renewed
 * by nucleus) the caller is unknown, which only ever means "no exception to the
 * rule" — never more access.
 */

/** Same names config.json gives nucleus (`authentication.accessToken`). */
const ACCESS_COOKIE = 'nucleus_access_token'
const ACCESS_SECRET_ENV = 'ACCESS_TOKEN_SECRET'

const API_KEY = /^nk_(live|test)_[a-f0-9]{64}$/

export type Caller = {
  userId: string
  isGod: boolean
  /** Lower-cased role names, e.g. 'content manager core team'. */
  roles: string[]
}

function cookieValue(header: string | null, name: string): string | undefined {
  for (const part of (header ?? '').split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq > 0 && trimmed.slice(0, eq) === name) return trimmed.slice(eq + 1)
  }
  return undefined
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
  nowSeconds: number = Math.floor(Date.now() / 1000)
): string | null {
  if (!secret) return null
  const headers = request.headers
  if (carriesApiKey(headers)) return null

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

export async function resolveCaller(request: Request, read: Read = query): Promise<Caller | null> {
  const userId = verifiedSubject(request)
  if (!userId) return null
  return callerById(userId, read)
}

export async function callerById(userId: string, read: Read = query): Promise<Caller | null> {
  if (!userId) return null
  const users = await read('select is_god from main.users where id::text = $1', [userId])
  if (!users[0]) return null
  const roles = await read(
    `select r.name from main.user_roles ur join main.roles r on r.id = ur.role_id
      where ur.user_id::text = $1`,
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
 * Merkez Ekip and above: the people who plan, approve and correct audits.
 *
 * Same list the screens use for "privileged" (`isPrivilegedUser`), plus the
 * godmin, whom the screens forgot.
 */
export const CENTRAL_ROLES = ['content manager core team', 'super admin', 'manager'] as const

export function isCentral(caller: Caller | null): boolean {
  if (!caller) return false
  return caller.isGod || caller.roles.some((r) => (CENTRAL_ROLES as readonly string[]).includes(r))
}

/** Who may undo evidence: Merkez Ekip and Super Admin, not a plant manager. */
export const ADMIN_ROLES = ['content manager core team', 'super admin'] as const

export function isAdmin(caller: Caller | null): boolean {
  if (!caller) return false
  return caller.isGod || caller.roles.some((r) => (ADMIN_ROLES as readonly string[]).includes(r))
}
