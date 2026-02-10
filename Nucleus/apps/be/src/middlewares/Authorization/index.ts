import type { OnRequest } from '@server'
import {
  type EffectiveClaim,
  getUserEffectiveClaims,
  hasClaimForEndpoint,
  isGodAdmin,
} from '@/services/Authorization'
import type { CompanyInfo } from '../Identity'

function nowMs() {
  return Date.now()
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function normalizePathForAuth(inputPath: string) {
  // keep query out
  const p0 = (inputPath || '').split('?')[0]!.split('#')[0]!
  // collapse slashes
  let p = p0.replace(/\/{2,}/g, '/')
  // ensure /api prefix (your system expects claims under /api)
  p = p.startsWith('/api') ? p : `/api${p.startsWith('/') ? '' : '/'}${p}`
  // remove trailing slash (except root)
  if (p.length > 1) p = p.replace(/\/+$/, '')
  return p
}

/**
 * Check if user is accessing their own data
 * Users can always read/update their own profile, files, addresses, phones without specific claims
 */
function checkOwnDataAccess(
  path: string,
  method: string,
  userId: string,
  request: Request
): boolean {
  const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  if (!allowedMethods.includes(method)) return false

  const pathParts = path.split('/').filter(Boolean)

  if (pathParts.includes('users') && pathParts.includes(userId)) return true

  const ownDataResources = ['profiles', 'files', 'addresses', 'phones', 'user_oauth_providers']
  const hasOwnDataResource = ownDataResources.some((resource) => path.includes(`/${resource}`))

  const isOAuthMeEndpoint = path.includes('/oauth/me/')
  if (isOAuthMeEndpoint && method === 'GET') return true

  if (hasOwnDataResource) {
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        // biome-ignore lint/suspicious/noExplicitAny: <>
        const body = (request as any).body
        if (body && typeof body === 'object') {
          if (body.user_id === userId || !body.user_id) return true
        }
      } catch {
        // fall through
      }
    }

    if (['GET', 'DELETE'].includes(method)) return true
  }

  return false
}

const publicPaths = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/v2/auth/login',
  '/v2/auth/register',
  '/v2/auth/refresh',
  '/v2/auth/logout',
  '/auth/me',
  '/v2/auth/me',
  '/health',
  '/oauth/github/auth-url',
  '/oauth/github/callback',
  '/oauth/azure/auth-url',
  '/oauth/azure/callback',
  '/oauth/azure/drive/files',
  '/oauth/azure/drive/items/:itemId/download-url',
  '/pocs/vorion',
]

// simple debug gate (set AUTH_DEBUG=1 to enable)
const AUTH_DEBUG = process.env.AUTH_DEBUG === '1'

function dbg(traceId: string, msg: string, data?: unknown) {
  if (!AUTH_DEBUG) return
  // keep logs compact but readable
  if (data !== undefined) console.log(`[AUTH][${traceId}] ${msg}`, data)
  else console.log(`[AUTH][${traceId}] ${msg}`)
}

export async function AuthorizationMiddleware(ctx: OnRequest) {
  const { request, path: rawPath, set } = ctx as OnRequest & { path: string; method: string }

  const traceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const method = request.method
  const path = rawPath

  const normalizedPath = normalizePathForAuth(path)

  // --- public skip checks
  const isAzureHelperPath =
    path.startsWith('/oauth/azure/drive/') || path.startsWith('/oauth/azure/mail/')

  const isPublic =
    publicPaths.includes(path) ||
    path.startsWith('/files/') ||
    isAzureHelperPath ||
    path.startsWith('/notifications')

  dbg(traceId, 'Incoming', { method, rawPath: path, normalizedPath, isPublic })

  if (isPublic) {
    // NOTE: publicPaths has :itemId pattern which includes() won't match.
    // We keep behavior same, but we log it so you notice if it’s the reason.
    if (AUTH_DEBUG && path.includes('/oauth/azure/drive/items/')) {
      dbg(traceId, '⚠️ Possible public path pattern mismatch (:itemId). raw path not in publicPaths.', {
        path,
        example: '/oauth/azure/drive/items/:itemId/download-url',
      })
    }
    return
  }

  // --- identity headers
  const profileHeader = request.headers.get('profile')
  if (!profileHeader) {
    dbg(traceId, 'No profile header (unauthenticated?) -> skip (Identity should handle)')
    return
  }

  const companyInfoHeader = request.headers.get('company_info')
  if (!companyInfoHeader) {
    dbg(traceId, '❌ Missing company_info header -> 500')
    set.status = 500
    return new Error('Company info not found in headers')
  }

  const profile = safeJsonParse<{ sub: string; email: string; roles?: string[] }>(profileHeader)
  const companyInfo = safeJsonParse<CompanyInfo>(companyInfoHeader)

  if (!profile || !companyInfo) {
    dbg(traceId, '❌ Header JSON parse failed -> 500', { profileOk: !!profile, companyOk: !!companyInfo })
    set.status = 500
    return new Error('Invalid auth headers (profile/company_info) JSON')
  }

  const userId = profile.sub
  const schemaName = companyInfo.schema_name

  dbg(traceId, 'Identity resolved', {
    userId,
    email: profile.email,
    rolesInToken: profile.roles ?? [],
    schemaName,
  })

  const authzPermissive =
    process.env.AUTHZ_PERMISSIVE === '1' ||
    process.env.AUTHZ_ALLOW_ALL === '1' ||
    String(process.env.AUTHZ_PERMISSIVE || '').toLowerCase() === 'true' ||
    String(process.env.AUTHZ_ALLOW_ALL || '').toLowerCase() === 'true'

  dbg(traceId, 'Permissive mode resolved', {
    authzPermissive,
    AUTHZ_PERMISSIVE: process.env.AUTHZ_PERMISSIVE,
    AUTHZ_ALLOW_ALL: process.env.AUTHZ_ALLOW_ALL,
  })

  if (authzPermissive) {
    dbg(traceId, '✅ Authorization permissive mode - bypass', { userId, method, normalizedPath })
    return
  }

  // 1) God admin bypass
  const t0 = nowMs()
  const isGod = await isGodAdmin({ userId, schemaName })
  dbg(traceId, 'isGodAdmin result', { isGod, ms: nowMs() - t0 })

  if (isGod) {
    dbg(traceId, '✅ God admin - bypass', { userId, method, normalizedPath })
    return
  }

  // 2) own data bypass
  const isOwnDataAccess = checkOwnDataAccess(path, method, userId, request)
  if (isOwnDataAccess) {
    dbg(traceId, '✅ Own data access - bypass', { userId, method, normalizedPath })
    return
  }

  // 3) effective claims
  const t1 = nowMs()
  const effectiveClaims = (await getUserEffectiveClaims({ userId, schemaName })) as EffectiveClaim[]
  const claimMs = nowMs() - t1

  dbg(traceId, 'Effective claims loaded', {
    userId,
    schemaName,
    count: effectiveClaims?.length ?? 0,
    ms: claimMs,
    sample: (effectiveClaims ?? []).slice(0, 5).map((c) => ({
      action: c.action,
      method: c.method,
      path: c.path,
      mode: c.mode,
    })),
  })

  // 4) check claim
  const hasClaim = hasClaimForEndpoint({
    effectiveClaims,
    path: normalizedPath,
    method,
  })

  if (!hasClaim) {
    // help debug: list candidates that might have matched
    const sameMethod = (effectiveClaims ?? []).filter(
      (c) => (c.method || '').toUpperCase() === method.toUpperCase()
    )

    const reqNoApi = normalizedPath.replace(/^\/api/, '') // to detect “/api double” issues
    const maybePrefix = sameMethod.filter((c) => {
      const cp = normalizePathForAuth(c.path || '')
      return normalizedPath === cp || normalizedPath.startsWith(cp + '/') || reqNoApi.startsWith(cp + '/')
    })

    dbg(traceId, '❌ Authorization failed - no claim', {
      userId,
      schemaName,
      method,
      rawPath: path,
      normalizedPath,
      claimCount: effectiveClaims.length,
      firstClaims: effectiveClaims.slice(0, 20).map((c) => ({
        action: c.action,
        method: c.method,
        path: c.path,
        mode: c.mode,
      })),
      maybePrefixMatches: maybePrefix.slice(0, 10).map((c) => ({
        action: c.action,
        method: c.method,
        path: c.path,
        mode: c.mode,
      })),
      note:
        'If claimCount>0 but maybePrefixMatches empty, likely path normalization/mode mismatch. If claimCount=0, likely schema/role-claim lookup issue.',
    })

    set.status = 403
    return new Error('Forbidden: You do not have permission to access this resource')
  }

  dbg(traceId, '✅ Authorization successful', { userId, method, normalizedPath })
  return
}
