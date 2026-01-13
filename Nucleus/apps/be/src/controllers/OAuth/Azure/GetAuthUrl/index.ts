/**
 * Azure OAuth - Get Authorization URL
 *
 * Generates the Azure OAuth authorization URL for initiating the OAuth flow
 */

import { withChecks } from '@/controllers/utils'
import type { ElysiaRequestWOBody } from '@/server'
import { generateResponse } from '@/utils'
import { buildAzureAuthUrl } from '../../providers/azure'
import { encodeOAuthState } from '../../utils'

type GetAzureAuthUrlQuery = {
  returnUrl?: string
  linkToUserId?: string
}

export async function GetAzureAuthUrl(req: ElysiaRequestWOBody) {
  return await withChecks({
    operationName: 'OAuth Azure GetAuthUrl',
    req,
    endpoint: async function endpoint(req: ElysiaRequestWOBody) {
      const query = req.query as GetAzureAuthUrlQuery
      const returnUrl = query.returnUrl || '/'
      const linkToUserId = query.linkToUserId

      // Encode state with returnUrl and optional linkToUserId
      const state = encodeOAuthState({
        returnUrl,
        linkToUserId,
        timestamp: Date.now(),
      })

      // Generate Azure OAuth URL
      const authUrl = buildAzureAuthUrl(state)

      return generateResponse({
        isSuccess: true,
        message: 'Azure auth URL generated',
        data: {
          authUrl,
          state,
        },
        status: 200,
        request: req,
      })
    },
  })
}
