import type { CompanyInfo } from '@/middlewares'
import type { ElysiaRequest } from '@/server'
import {
  type AuthSessionRecord,
  BuildTokenPayload,
  GenerateAccessToken,
  GenerateDeviceFingerprint,
  GenerateRefreshToken,
  GenerateSessionId,
  getSessionTtlSeconds,
  HashRefreshToken,
  SaveSession,
  setAuthCookies,
  UpdateSession,
} from '@/services/Auth'
import { getClientOriginInfo } from '@/utils'

export function getCompanyInfoFromHeaders(req: ElysiaRequest): CompanyInfo {
  return JSON.parse(req.request.headers.get('company_info') || '{}') as CompanyInfo
}

export function getProfileFromHeaders(req: ElysiaRequest) {
  const profileHeader = req.request.headers.get('profile')
  if (!profileHeader) return undefined
  try {
    return JSON.parse(profileHeader) as Record<string, unknown>
  } catch (_error) {
    return undefined
  }
}

type IssueSessionTokensInput = {
  req: ElysiaRequest
  user: {
    id: string
    email: string
    roles?: string[]
  }
  session?: AuthSessionRecord
}

export async function issueSessionTokens({ req, user, session }: IssueSessionTokensInput) {
  const clientInfo = getClientOriginInfo(req)
  const deviceFingerprint =
    session?.deviceFingerprint ??
    GenerateDeviceFingerprint({
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    })

  const sessionId = session?.sessionId ?? GenerateSessionId()

  const payload = BuildTokenPayload({
    userId: user.id,
    email: user.email,
    roles: user.roles,
    sessionId,
    deviceFingerprint,
  })

  const accessToken = GenerateAccessToken(payload)
  const refreshToken = GenerateRefreshToken(payload)
  const refreshTokenHash = HashRefreshToken(refreshToken)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + getSessionTtlSeconds() * 1000).toISOString()

  if (session) {
    await UpdateSession(sessionId, {
      refreshTokenHash,
      lastActiveAt: now.toISOString(),
      expiresAt,
    })
  } else {
    await SaveSession({
      sessionId,
      userId: user.id,
      refreshTokenHash,
      deviceFingerprint,
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      createdAt: now.toISOString(),
      lastActiveAt: now.toISOString(),
      expiresAt,
    })
  }

  setAuthCookies(req, accessToken, refreshToken, {
    maxAge: getSessionTtlSeconds(),
  })

  return {
    sessionId,
    accessToken,
    refreshToken,
    payload,
  }
}
