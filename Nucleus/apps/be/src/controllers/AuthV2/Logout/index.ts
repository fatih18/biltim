import { withChecks } from '@/controllers/utils'
import type { ElysiaRequest } from '@/server'
import {
  clearAuthCookies,
  DeleteSession,
  ExtractTokenPayload,
  getAuthCookies,
  ValidateAccessToken,
} from '@/services/Auth'
import { generateResponse } from '@/utils'

type LogoutErrors = {
  message?: string
}

type LogoutResponseData = {
  message: string
}

export async function LogoutV2(req: ElysiaRequest) {
  return await withChecks({
    operationName: 'AuthV2 Logout',
    req,
    endpoint: async function endpoint(req: ElysiaRequest) {
      const { accessToken } = getAuthCookies(req)

      if (!accessToken) {
        clearAuthCookies(req)
        return generateResponse<LogoutResponseData, LogoutErrors>({
          isSuccess: true,
          message: 'Already logged out',
          data: { message: 'No active session found' },
          request: req,
        })
      }

      const validation = ValidateAccessToken(accessToken)
      if (validation.isValid && validation.payload) {
        const payload = ExtractTokenPayload(validation.payload)
        const { sessionId } = payload

        if (sessionId) {
          await DeleteSession(sessionId)
        }
      }

      clearAuthCookies(req)

      return generateResponse<LogoutResponseData, LogoutErrors>({
        isSuccess: true,
        message: 'Logout successful',
        data: { message: 'Session cleared successfully' },
        request: req,
      })
    },
  })
}
