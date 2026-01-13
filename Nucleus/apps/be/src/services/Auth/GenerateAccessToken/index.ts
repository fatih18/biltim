import jwt from 'jsonwebtoken'
import type { StringValue } from 'ms'

const DEFAULT_ACCESS_TTL: StringValue = '30m'

export function GenerateAccessToken(payload: Record<string, unknown>) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured')

  const expiresIn = (process.env.JWT_EXPIRES_IN as StringValue | undefined) ?? DEFAULT_ACCESS_TTL

  const options: jwt.SignOptions = {
    expiresIn,
    issuer: process.env.JWT_ISSUER ?? 'nucleus-auth',
    audience: process.env.JWT_AUDIENCE,
    algorithm: (process.env.JWT_ALGORITHM as jwt.Algorithm | undefined) ?? 'HS256',
  }

  return jwt.sign(payload, secret, options)
}
