/**
 * GitHub OAuth - Callback Handler
 *
 * Handles the OAuth callback from GitHub.
 * Creates or logs in user, or links OAuth to existing user if linkToUserId is present.
 */

import { T_Roles } from '@monorepo/db-entities/schemas/default/role'
import { T_Users } from '@monorepo/db-entities/schemas/default/user'
import { T_UserOAuthProviders } from '@monorepo/db-entities/schemas/default/user_oauth_provider'
import { T_UserRoles } from '@monorepo/db-entities/schemas/default/user_role'
import { getTenantDB } from '@monorepo/drizzle-manager'
import { and, eq } from 'drizzle-orm'
import { withChecks } from '@/controllers/utils'
import type { ElysiaRequest } from '@/server'
import { generateResponse } from '@/utils'
import { getCompanyInfoFromHeaders, issueSessionTokens } from '../../../AuthV2/helpers'
import { exchangeGitHubCode, getGitHubUserProfile } from '../../providers/github'
import { decodeOAuthState, getFrontendRedirectUrl } from '../../utils'

type CallbackQuery = {
  code?: string
  state?: string
  error?: string
}

export async function GitHubCallback(req: ElysiaRequest) {
  return await withChecks({
    operationName: 'OAuth GitHub Callback',
    req,
    endpoint: async function endpoint(req: ElysiaRequest) {
      const query = (req.query ?? {}) as CallbackQuery

      // Handle OAuth error
      if (query.error) {
        const errorUrl = getFrontendRedirectUrl()
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${errorUrl}?oauth=error&message=${encodeURIComponent('Authorization denied')}`,
          },
        })
      }

      if (!query.code || !query.state) {
        const errorUrl = getFrontendRedirectUrl()
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${errorUrl}?oauth=error&message=${encodeURIComponent('Missing parameters')}`,
          },
        })
      }

      // Decode and validate state
      let oauthState: ReturnType<typeof decodeOAuthState>
      try {
        oauthState = decodeOAuthState(query.state)
      } catch {
        const errorUrl = getFrontendRedirectUrl()
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${errorUrl}?oauth=error&message=${encodeURIComponent('Invalid state')}`,
          },
        })
      }

      // Exchange code for token
      const tokenResponse = await exchangeGitHubCode(query.code)
      const userProfile = await getGitHubUserProfile(tokenResponse.access_token)

      const companyInfo = getCompanyInfoFromHeaders(req)
      const tenantDB = await getTenantDB(companyInfo.schema_name || 'main')

      // Case 1: Linking to existing user
      if (oauthState.linkToUserId) {
        // Check if this OAuth provider is already linked to another user
        const existingLink = await tenantDB
          .select()
          .from(T_UserOAuthProviders)
          .where(
            and(
              eq(T_UserOAuthProviders.provider, 'github'),
              eq(T_UserOAuthProviders.provider_user_id, userProfile.providerId)
            )
          )
          .limit(1)

        if (existingLink.length > 0 && existingLink[0]?.user_id !== oauthState.linkToUserId) {
          const errorUrl = getFrontendRedirectUrl(oauthState.returnUrl)
          return new Response(null, {
            status: 302,
            headers: {
              Location: `${errorUrl}?oauth=error&message=${encodeURIComponent('Account already linked')}`,
            },
          })
        }

        // Create or update OAuth link
        await tenantDB
          .insert(T_UserOAuthProviders)
          .values({
            user_id: oauthState.linkToUserId,
            provider: 'github',
            provider_user_id: userProfile.providerId,
            provider_email: userProfile.email,
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token,
            token_expires_at: tokenResponse.expires_in
              ? new Date(Date.now() + tokenResponse.expires_in * 1000)
              : undefined,
            profile_data: userProfile.profileData,
            is_active: true,
          })
          .onConflictDoUpdate({
            target: [T_UserOAuthProviders.provider, T_UserOAuthProviders.provider_user_id],
            set: {
              access_token: tokenResponse.access_token,
              refresh_token: tokenResponse.refresh_token,
              token_expires_at: tokenResponse.expires_in
                ? new Date(Date.now() + tokenResponse.expires_in * 1000)
                : undefined,
              profile_data: userProfile.profileData,
              updated_at: new Date(),
            },
          })

        // Redirect back to frontend
        const redirectUrl = getFrontendRedirectUrl(oauthState.returnUrl)
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${redirectUrl}?oauth=linked`,
          },
        })
      }

      // Case 2: Sign in or Sign up
      // Check if OAuth provider exists
      const existingOAuth = await tenantDB
        .select()
        .from(T_UserOAuthProviders)
        .where(
          and(
            eq(T_UserOAuthProviders.provider, 'github'),
            eq(T_UserOAuthProviders.provider_user_id, userProfile.providerId)
          )
        )
        .limit(1)

      let userId: string

      if (existingOAuth.length > 0) {
        // User exists, log them in
        const oauthRecord = existingOAuth[0]
        if (!oauthRecord) {
          return generateResponse({
            isSuccess: false,
            message: 'OAuth record not found',
            errors: 'Invalid OAuth state',
            status: 500,
            request: req,
          })
        }

        userId = oauthRecord.user_id

        // Ensure user has a role (for existing OAuth users created before role assignment was added)
        const userRoles = await tenantDB
          .select()
          .from(T_UserRoles)
          .where(eq(T_UserRoles.user_id, userId))
          .limit(1)

        if (userRoles.length === 0) {
          // User has no roles, assign default "user" role
          const userRole = await tenantDB
            .select()
            .from(T_Roles)
            .where(eq(T_Roles.name, 'user'))
            .limit(1)

          if (userRole.length > 0 && userRole[0]) {
            await tenantDB.insert(T_UserRoles).values({
              user_id: userId,
              role_id: userRole[0].id,
              is_active: true,
            })
          }
        }

        // Update OAuth token
        await tenantDB
          .update(T_UserOAuthProviders)
          .set({
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token,
            token_expires_at: tokenResponse.expires_in
              ? new Date(Date.now() + tokenResponse.expires_in * 1000)
              : undefined,
            profile_data: userProfile.profileData,
            updated_at: new Date(),
          })
          .where(eq(T_UserOAuthProviders.id, oauthRecord.id))
      } else {
        // New user - create account
        if (!userProfile.email) {
          const errorUrl = getFrontendRedirectUrl(oauthState.returnUrl)
          return new Response(null, {
            status: 302,
            headers: {
              Location: `${errorUrl}?oauth=error&message=${encodeURIComponent('Email required')}`,
            },
          })
        }

        // Check if email already exists
        const existingUser = await tenantDB
          .select()
          .from(T_Users)
          .where(eq(T_Users.email, userProfile.email))
          .limit(1)

        if (existingUser.length > 0 && existingUser[0]) {
          userId = existingUser[0].id

          // Check if user already has a role, if not assign default "user" role
          const userRoles = await tenantDB
            .select()
            .from(T_UserRoles)
            .where(eq(T_UserRoles.user_id, userId))
            .limit(1)

          if (userRoles.length === 0) {
            // User has no roles, assign default "user" role
            const userRole = await tenantDB
              .select()
              .from(T_Roles)
              .where(eq(T_Roles.name, 'user'))
              .limit(1)

            if (userRole.length > 0 && userRole[0]) {
              await tenantDB.insert(T_UserRoles).values({
                user_id: userId,
                role_id: userRole[0].id,
                is_active: true,
              })
            }
          }

          // Link OAuth to existing email user
          await tenantDB.insert(T_UserOAuthProviders).values({
            user_id: userId,
            provider: 'github',
            provider_user_id: userProfile.providerId,
            provider_email: userProfile.email,
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token,
            token_expires_at: tokenResponse.expires_in
              ? new Date(Date.now() + tokenResponse.expires_in * 1000)
              : undefined,
            profile_data: userProfile.profileData,
            is_active: true,
          })
        } else {
          // Create new user
          const newUser = await tenantDB
            .insert(T_Users)
            .values({
              email: userProfile.email,
              is_active: true,
              verified_at: new Date(), // OAuth users are pre-verified
            })
            .returning()

          if (!newUser[0]) {
            const errorUrl = getFrontendRedirectUrl(oauthState.returnUrl)
            return new Response(null, {
              status: 302,
              headers: {
                Location: `${errorUrl}?oauth=error&message=${encodeURIComponent('User creation failed')}`,
              },
            })
          }

          userId = newUser[0].id

          // Assign default "user" role to new OAuth user
          const userRole = await tenantDB
            .select()
            .from(T_Roles)
            .where(eq(T_Roles.name, 'user'))
            .limit(1)

          if (userRole.length > 0 && userRole[0]) {
            await tenantDB.insert(T_UserRoles).values({
              user_id: userId,
              role_id: userRole[0].id,
              is_active: true,
            })
          }

          // Create OAuth link
          await tenantDB.insert(T_UserOAuthProviders).values({
            user_id: userId,
            provider: 'github',
            provider_user_id: userProfile.providerId,
            provider_email: userProfile.email,
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token,
            token_expires_at: tokenResponse.expires_in
              ? new Date(Date.now() + tokenResponse.expires_in * 1000)
              : undefined,
            profile_data: userProfile.profileData,
            is_primary: true,
            is_active: true,
          })
        }
      }

      // Issue session tokens (sets cookies)
      await issueSessionTokens({
        req,
        user: {
          id: userId,
          email: userProfile.email || '',
        },
      })

      // Get cookies from req.set.cookie that were set by issueSessionTokens
      const cookies = req.set.cookie
      const cookieHeaders: string[] = []

      if (cookies) {
        for (const [name, cookieOptions] of Object.entries(cookies)) {
          if (typeof cookieOptions === 'object' && cookieOptions.value) {
            const parts = [`${name}=${cookieOptions.value}`]
            if (cookieOptions.path) parts.push(`Path=${cookieOptions.path}`)
            if (cookieOptions.maxAge) parts.push(`Max-Age=${cookieOptions.maxAge}`)
            if (cookieOptions.httpOnly) parts.push('HttpOnly')
            if (cookieOptions.secure) parts.push('Secure')
            // Use Lax for OAuth redirect - strict blocks cross-site cookies
            parts.push('SameSite=Lax')
            cookieHeaders.push(parts.join('; '))
          }
        }
      }

      // Redirect to frontend with success and cookies
      const redirectUrl = getFrontendRedirectUrl(oauthState.returnUrl)
      const headers = new Headers({
        Location: `${redirectUrl}?oauth=success`,
      })

      // Add each cookie as a separate Set-Cookie header
      for (const cookieHeader of cookieHeaders) {
        headers.append('Set-Cookie', cookieHeader)
      }

      console.log('🍪 OAuth Redirect Headers:', {
        location: redirectUrl,
        cookieCount: cookieHeaders.length,
        cookies: cookieHeaders,
      })

      return new Response(null, {
        status: 302,
        headers,
      })
    },
  })
}
