/**
 * GitHub OAuth - Get Authorization URL
 *
 * Returns the GitHub OAuth authorization URL for the client to redirect to.
 * Optionally accepts linkToUserId to link OAuth to existing logged-in user.
 */

import { withChecks } from '@/controllers/utils'
import type { ElysiaRequestWOBody } from '@/server'
import { generateResponse } from '@/utils'
import { buildGitHubAuthUrl } from '../../providers/github'
import type { OAuthState } from '../../types'
import { encodeOAuthState } from '../../utils'

type GetAuthUrlQuery = {
  returnUrl?: string
  linkToUserId?: string
}

export async function GetGitHubAuthUrl(req: ElysiaRequestWOBody) {
  return await withChecks({
    operationName: 'OAuth GitHub GetAuthUrl',
    req,
    endpoint: async function endpoint(req: ElysiaRequestWOBody) {
      const query = (req.query ?? {}) as GetAuthUrlQuery

      const state: OAuthState = {
        returnUrl: query.returnUrl,
        linkToUserId: query.linkToUserId,
        timestamp: Date.now(),
      }

      const encodedState = encodeOAuthState(state)
      const authUrl = buildGitHubAuthUrl(encodedState)

      return generateResponse({
        isSuccess: true,
        message: 'GitHub auth URL generated',
        data: { authUrl, state: encodedState },
        status: 200,
        request: req,
      })
    },
  })
}
