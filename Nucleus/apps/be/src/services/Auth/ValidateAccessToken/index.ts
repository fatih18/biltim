import jwt from 'jsonwebtoken'

type TokenResult<T> = {
  isValid: boolean
  payload?: T
  error?: Error
}

export function ValidateAccessToken<TPayload = Record<string, unknown>>(
  token: string
): TokenResult<TPayload> {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    return {
      isValid: false,
      error: new Error('JWT_SECRET is not configured'),
    }
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: [(process.env.JWT_ALGORITHM as jwt.Algorithm | undefined) ?? 'HS256'],
      audience: process.env.JWT_AUDIENCE,
      issuer: process.env.JWT_ISSUER ?? 'nucleus-auth',
    }) as TPayload

    return {
      isValid: true,
      payload: decoded,
    }
  } catch (error) {
    return {
      isValid: false,
      error: error as Error,
    }
  }
}
