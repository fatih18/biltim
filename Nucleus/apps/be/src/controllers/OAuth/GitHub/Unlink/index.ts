/**
 * GitHub OAuth - Unlink Account
 *
 * Unlinks a GitHub OAuth account from the authenticated user.
 */

import { T_UserOAuthProviders } from '@monorepo/db-entities/schemas/default/user_oauth_provider'
import { getTenantDB } from '@monorepo/drizzle-manager'
import { and, eq } from 'drizzle-orm'
import { withChecks } from '@/controllers/utils'
import type { ElysiaRequest } from '@/server'
import { generateResponse } from '@/utils'
import { getCompanyInfoFromHeaders, getProfileFromHeaders } from '../../../AuthV2/helpers'

export async function UnlinkGitHub(req: ElysiaRequest) {
  return await withChecks({
    operationName: 'OAuth GitHub Unlink',
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

      // Delete the OAuth link
      const result = await tenantDB
        .delete(T_UserOAuthProviders)
        .where(
          and(eq(T_UserOAuthProviders.user_id, userId), eq(T_UserOAuthProviders.provider, 'github'))
        )
        .returning()

      if (result.length === 0) {
        return generateResponse({
          isSuccess: false,
          message: 'GitHub account not linked',
          errors: 'Account not found',
          status: 404,
          request: req,
        })
      }

      return generateResponse({
        isSuccess: true,
        message: 'GitHub account unlinked successfully',
        data: { unlinked: true },
        status: 200,
        request: req,
      })
    },
  })
}
