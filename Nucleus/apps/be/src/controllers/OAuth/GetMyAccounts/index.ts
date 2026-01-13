/**
 * OAuth - Get My Linked Accounts
 *
 * Returns OAuth accounts linked to the authenticated user
 */

import { T_UserOAuthProviders } from '@monorepo/db-entities/schemas/default/user_oauth_provider'
import { getTenantDB } from '@monorepo/drizzle-manager'
import { eq } from 'drizzle-orm'
import { withChecks } from '@/controllers/utils'
import type { ElysiaRequest } from '@/server'
import { generateResponse } from '@/utils'
import { getCompanyInfoFromHeaders, getProfileFromHeaders } from '../../AuthV2/helpers'

export async function GetMyOAuthAccounts(req: ElysiaRequest) {
  return await withChecks({
    operationName: 'OAuth GetMyAccounts',
    req,
    endpoint: async function endpoint(req: ElysiaRequest) {
      const companyInfo = getCompanyInfoFromHeaders(req)
      const profile = getProfileFromHeaders(req)

      if (!profile?.sub) {
        return generateResponse({
          isSuccess: false,
          message: 'Authentication required',
          errors: 'User not authenticated',
          status: 401,
          request: req,
        })
      }

      const userId = String(profile.sub)
      const tenantDB = await getTenantDB(companyInfo.schema_name || 'main')

      // Fetch user's OAuth accounts
      const accounts = await tenantDB
        .select()
        .from(T_UserOAuthProviders)
        .where(eq(T_UserOAuthProviders.user_id, userId))
        .orderBy(T_UserOAuthProviders.created_at)

      return generateResponse({
        isSuccess: true,
        message: 'OAuth accounts fetched',
        data: {
          data: accounts,
          pagination: {
            page: 1,
            limit: accounts.length,
            total: accounts.length,
            totalPages: 1,
          },
        },
        status: 200,
        request: req,
      })
    },
  })
}
