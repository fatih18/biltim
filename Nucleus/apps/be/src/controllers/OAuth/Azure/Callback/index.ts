/**
 * Azure OAuth - Callback Handler
 *
 * Handles the OAuth callback from Azure.
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
import { getCompanyInfoFromHeaders, issueSessionTokens } from '../../../AuthV2/helpers'
import { exchangeAzureCode, getAzureUserProfile } from '../../providers/azure'
import { decodeOAuthState, getFrontendRedirectUrl } from '../../utils'

type AzureCallbackQuery = {
  code?: string
  state?: string
  error?: string
  error_description?: string
}

export async function AzureCallback(req: ElysiaRequest) {
  return await withChecks({
    operationName: 'OAuth Azure Callback',
    req,
    endpoint: async function endpoint(req: ElysiaRequest) {
      const query = req.query as AzureCallbackQuery

      // Handle OAuth errors
      if (query.error) {
        const errorUrl = getFrontendRedirectUrl('/')
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${errorUrl}?oauth=error&message=${encodeURIComponent(query.error_description || query.error)}`,
          },
        })
      }

      if (!query.code || !query.state) {
        const errorUrl = getFrontendRedirectUrl('/')
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${errorUrl}?oauth=error&message=${encodeURIComponent('Missing code or state')}`,
          },
        })
      }

      // Decode OAuth state
      const oauthState = decodeOAuthState(query.state)
      if (!oauthState) {
        const errorUrl = getFrontendRedirectUrl('/')
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${errorUrl}?oauth=error&message=${encodeURIComponent('Invalid state')}`,
          },
        })
      }

      const companyInfo = getCompanyInfoFromHeaders(req)
      const tenantDB = await getTenantDB(companyInfo.schema_name || 'main')

      try {
        // Exchange code for access token
        const tokenResponse = await exchangeAzureCode(query.code)

        // Get user profile from Azure
        const userProfile = await getAzureUserProfile(tokenResponse.access_token)

        console.log('🔐 Azure OAuth:', {
          providerId: userProfile.providerId,
          email: userProfile.email,
          name: userProfile.name,
        })

        let userId: string

        // Check if this Azure account is already linked
        const existingOAuth = await tenantDB
          .select()
          .from(T_UserOAuthProviders)
          .where(
            and(
              eq(T_UserOAuthProviders.provider, 'azure'),
              eq(T_UserOAuthProviders.provider_user_id, userProfile.providerId)
            )
          )
          .limit(1)

        if (oauthState.linkToUserId) {
          // LINK MODE: Link Azure to existing authenticated user
          console.log('🔗 Linking Azure to user:', oauthState.linkToUserId)

          // Check if Azure account is already linked to a different user
          if (existingOAuth.length > 0 && existingOAuth[0]?.user_id !== oauthState.linkToUserId) {
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
              provider: 'azure',
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
                provider_user_id: userProfile.providerId,
                provider_email: userProfile.email,
                access_token: tokenResponse.access_token,
                refresh_token: tokenResponse.refresh_token,
                token_expires_at: tokenResponse.expires_in
                  ? new Date(Date.now() + tokenResponse.expires_in * 1000)
                  : undefined,
                profile_data: userProfile.profileData,
                is_active: true,
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

        // LOGIN/REGISTER MODE
        if (existingOAuth.length > 0 && existingOAuth[0]) {
          // User with this Azure account exists - update token and login
          userId = existingOAuth[0].user_id

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
            .where(eq(T_UserOAuthProviders.id, existingOAuth[0].id))
        } else {
          // Check if user with this email exists
          const existingUser = await tenantDB
            .select()
            .from(T_Users)
            .where(eq(T_Users.email, userProfile.email))
            .limit(1)

          if (existingUser.length > 0 && existingUser[0]) {
            // User exists with this email - link Azure to it
            userId = existingUser[0].id

            // Check if already linked to prevent duplicate
            const alreadyLinked = await tenantDB
              .select()
              .from(T_UserOAuthProviders)
              .where(
                and(
                  eq(T_UserOAuthProviders.user_id, userId),
                  eq(T_UserOAuthProviders.provider, 'azure')
                )
              )
              .limit(1)

            if (alreadyLinked.length === 0) {
              // Link OAuth to existing email user
              await tenantDB.insert(T_UserOAuthProviders).values({
                user_id: userId,
                provider: 'azure',
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
            }
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
              })
            }

            // Link OAuth to new user
            await tenantDB.insert(T_UserOAuthProviders).values({
              user_id: userId,
              provider: 'azure',
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
          }
        }

        // Get user for session
        const user = await tenantDB.select().from(T_Users).where(eq(T_Users.id, userId)).limit(1)

        if (!user[0]) {
          const errorUrl = getFrontendRedirectUrl(oauthState.returnUrl)
          return new Response(null, {
            status: 302,
            headers: {
              Location: `${errorUrl}?oauth=error&message=${encodeURIComponent('User not found')}`,
            },
          })
        }

        // Issue session tokens (sets cookies as side effect)
        await issueSessionTokens({
          req,
          user: {
            id: user[0].id,
            email: user[0].email || userProfile.email,
          },
        })

        // Prepare cookies
        const cookieHeaders: string[] = []
        if (req.set?.cookie) {
          for (const [cookieName, cookieValue] of Object.entries(req.set.cookie)) {
            if (typeof cookieValue === 'object' && 'value' in cookieValue) {
              const parts = [`${cookieName}=${cookieValue.value}`]
              const cookieOptions = cookieValue as {
                value: string
                path?: string
                domain?: string
                maxAge?: number
                httpOnly?: boolean
                secure?: boolean
                sameSite?: string
              }
              if (cookieOptions.path) parts.push(`Path=${cookieOptions.path}`)
              if (cookieOptions.domain) parts.push(`Domain=${cookieOptions.domain}`)
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

        console.log('🍪 Azure OAuth Redirect Headers:', {
          location: redirectUrl,
          cookieCount: cookieHeaders.length,
          cookies: cookieHeaders,
        })

        return new Response(null, {
          status: 302,
          headers,
        })
      } catch (error) {
        console.error('Azure OAuth error:', error)
        const errorUrl = getFrontendRedirectUrl(oauthState.returnUrl)
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${errorUrl}?oauth=error&message=${encodeURIComponent('Azure OAuth failed')}`,
          },
        })
      }
    },
  })
}
