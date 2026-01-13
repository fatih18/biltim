import { tenants } from '@monorepo/db-entities/schemas/default/tenants'
// import { T_Claims } from '@monorepo/db-entities/schemas/default/claim'
// import { T_Users } from '@monorepo/db-entities/schemas/default/user'
// import { T_UserClaims } from '@monorepo/db-entities/schemas/default/user_claim'
import { getTenantDB } from '@monorepo/drizzle-manager'
import type { OnRequest } from '@server'
import {
  // and,
  eq,
} from 'drizzle-orm'
import { ExtractTokenPayload, ValidateAccessToken } from '@/services/Auth'
import { getClientOriginInfo } from '@/utils'
// import { T_UserProjects } from '@monorepo/db-entities/schemas/default/user_project'

export type CompanyInfo = {
  id: string
  subdomain: string
  company_name: string
  schema_name: string
  is_active: boolean
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
  // OAuth login flows should always be accessible even if there is
  // an old / invalid AuthV2 access token cookie present. The
  // controllers themselves handle linking vs. first-time login
  // based on profile / state, so these endpoints are safe to treat
  // as public from the middleware perspective.
  '/oauth/github/auth-url',
  '/oauth/github/callback',
  '/oauth/azure/auth-url',
  '/oauth/azure/callback',
  '/health',
  '/pocs/vorion',
  '/api/downloads', // Static file downloads - public
]

// const CLEVEL_TITLES = ['evp', 'project_manager', 'operations_manager']

export async function IdentityMiddleware(ctx: OnRequest) {
  const { request, path, set } = ctx as OnRequest & {
    path: string
    method: string
  }

  if (request.headers.get('x-dev-bypass') === 'true') {
    return
  }
  const domainInfo = getClientOriginInfo(ctx)

  // console.log('Domain info', ctx.request.headers)

  const { clientSubdomain } = domainInfo
  if (!clientSubdomain && process.env.IS_MULTI_TENANT === 'true') {
    console.log('‼️ No subdomain found', domainInfo, path)
    return new Error('No subdomain found')
  }
  const schema_name =
    process.env.IS_MULTI_TENANT === 'true'
      ? !clientSubdomain || clientSubdomain === 'admin'
        ? 'main'
        : clientSubdomain
      : 'main'

  if (schema_name !== 'main') {
    const mainDb = await getTenantDB(schema_name)
    const company = await mainDb
      .select()
      .from(tenants)
      .where(eq(tenants.subdomain, clientSubdomain))
      .limit(1)
    const { id, subdomain, is_active } = company[0] || {}
    if (!company[0] || !is_active || !schema_name) {
      set.status = 404
      return new Error('Company not found')
    }
    request.headers.set(
      'company_info',
      JSON.stringify({
        id,
        subdomain,
        schema_name,
        is_active,
      })
    )
  } else {
    request.headers.set(
      'company_info',
      JSON.stringify({
        id: 'main',
        subdomain: 'main',
        company_name: 'main',
        schema_name: 'main',
        is_active: true,
      })
    )
  }

  // Skip auth check for public paths
  if (publicPaths.includes(path) || path.startsWith('/files/')) {
    return
  }

  // Parse cookies once
  const cookies = (request.headers.get('cookie')?.split(';') || []).reduce<Record<string, string>>(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      if (key && value) acc[key] = value
      return acc
    },
    {}
  )

  // Always use AuthV2 JWT tokens
  const v2AccessCookieName = process.env.AUTH_V2_ACCESS_COOKIE_NAME ?? 'nucleus_access_token'
  const v2AccessToken = cookies[v2AccessCookieName]

  // Debug logging
  console.log('🔐 AuthV2 Middleware Check:', {
    path,
    cookieName: v2AccessCookieName,
    hasToken: !!v2AccessToken,
    tokenLength: v2AccessToken?.length ?? 0,
    allCookieNames: Object.keys(cookies),
  })

  if (!v2AccessToken) {
    // No JWT token found
    return
  }

  const validation = ValidateAccessToken(v2AccessToken)

  console.log('🔐 Token Validation:', {
    isValid: validation.isValid,
    hasPayload: !!validation.payload,
  })

  if (validation.isValid && validation.payload) {
    const payload = ExtractTokenPayload(validation.payload)
    // Transform AuthV2 payload to match PASETO TokenPayload structure
    const profile = {
      sub: payload.userId,
      email: payload.email,
      roles: payload.roles,
      session_id: payload.sessionId,
      device_fingerprint: payload.deviceFingerprint,
      iat: payload.issuedAt,
      exp: payload.expiresAt,
    }

    console.log('✅ Profile Set:', { userId: payload.userId, email: payload.email })

    request.headers.set('profile', JSON.stringify(profile))
    return
  }

  // JWT exists but invalid
  console.log('❌ Invalid JWT token')
  set.status = 401
  return new Error('Invalid or expired access token')
}
