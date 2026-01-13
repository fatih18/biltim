export type ExtractedPayload = {
  userId: string
  email: string
  roles: string[]
  sessionId: string
  deviceFingerprint?: string
  issuedAt?: number
  expiresAt?: number
  [key: string]: unknown
}

export function ExtractTokenPayload(decodedToken: Record<string, unknown>): ExtractedPayload {
  return {
    userId: decodedToken.sub as string,
    email: decodedToken.email as string,
    roles: (decodedToken.roles as string[]) ?? ['user'],
    sessionId: decodedToken.session_id as string,
    deviceFingerprint: decodedToken.device_fingerprint as string | undefined,
    issuedAt: decodedToken.iat as number | undefined,
    expiresAt: decodedToken.exp as number | undefined,
    ...decodedToken,
  }
}
