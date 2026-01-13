import { withChecks } from '@/controllers/utils'
import type { ElysiaRequest } from '@/server'
import {
  CompareRefreshToken,
  ExtractTokenPayload,
  GetSession,
  getAuthCookies,
  ValidateDeviceFingerprint,
  ValidateRefreshToken,
} from '@/services/Auth'
import { generateResponse, getClientOriginInfo } from '@/utils'
import { issueSessionTokens } from '../helpers'

type RefreshErrors = {
  token?: string
  session?: string
}

type RefreshResponseData = {
  accessToken: string
  sessionId: string
}

export async function RefreshV2(req: ElysiaRequest) {
  return await withChecks({
    operationName: 'AuthV2 Refresh',
    req,
    endpoint: async function endpoint(req: ElysiaRequest) {
      const { refreshToken } = getAuthCookies(req)

      if (!refreshToken) {
        return generateResponse<RefreshResponseData, RefreshErrors>({
          isSuccess: false,
          message: 'Refresh token is required',
          errors: { token: 'Missing refresh token' },
          status: 401,
          request: req,
        })
      }

      const validation = ValidateRefreshToken(refreshToken)
      if (!validation.isValid) {
        return generateResponse<RefreshResponseData, RefreshErrors>({
          isSuccess: false,
          message: 'Invalid or expired refresh token',
          errors: { token: validation.error?.message || 'Token validation failed' },
          status: 401,
          request: req,
        })
      }

      if (!validation.payload) {
        return generateResponse<RefreshResponseData, RefreshErrors>({
          isSuccess: false,
          message: 'Token payload missing',
          errors: { token: 'Unable to extract token payload' },
          status: 401,
          request: req,
        })
      }

      const payload = ExtractTokenPayload(validation.payload)
      const { sessionId, deviceFingerprint } = payload

      const session = await GetSession(sessionId)
      if (!session) {
        return generateResponse<RefreshResponseData, RefreshErrors>({
          isSuccess: false,
          message: 'Session not found or expired',
          errors: { session: 'Invalid session' },
          status: 401,
          request: req,
        })
      }

      const isRefreshValid = CompareRefreshToken(refreshToken, session.refreshTokenHash)
      if (!isRefreshValid) {
        return generateResponse<RefreshResponseData, RefreshErrors>({
          isSuccess: false,
          message: 'Refresh token mismatch',
          errors: { token: 'Token does not match session' },
          status: 401,
          request: req,
        })
      }

      if (deviceFingerprint && session.deviceFingerprint) {
        const clientInfo = getClientOriginInfo(req)
        const isDeviceValid = ValidateDeviceFingerprint(session.deviceFingerprint, {
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
        })

        if (!isDeviceValid) {
          return generateResponse<RefreshResponseData, RefreshErrors>({
            isSuccess: false,
            message: 'Device fingerprint mismatch',
            errors: { session: 'Device verification failed' },
            status: 403,
            request: req,
          })
        }
      }

      const tokens = await issueSessionTokens({
        req,
        user: {
          id: session.userId,
          email: payload.email,
          roles: payload.roles,
        },
        session,
      })

      return generateResponse<RefreshResponseData, RefreshErrors>({
        isSuccess: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: tokens.accessToken,
          sessionId: tokens.sessionId,
        },
        request: req,
      })
    },
  })
}
