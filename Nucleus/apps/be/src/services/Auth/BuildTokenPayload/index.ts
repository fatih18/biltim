export type TokenPayloadInput = {
  userId: string
  email: string
  roles?: string[]
  sessionId: string
  deviceFingerprint?: string
  [key: string]: unknown
}

export type StandardTokenPayload = {
  sub: string
  email: string
  roles: string[]
  session_id: string
  device_fingerprint?: string
  iat?: number
  exp?: number
  iss?: string
  aud?: string | string[]
  [key: string]: unknown
}

export function BuildTokenPayload(input: TokenPayloadInput): StandardTokenPayload {
  const { userId, email, roles = ['user'], sessionId, deviceFingerprint, ...extra } = input

  return {
    sub: userId,
    email,
    roles,
    session_id: sessionId,
    device_fingerprint: deviceFingerprint,
    ...extra,
  }
}
