import type { ElysiaRequest } from '@/server'

type CookieOptions = {
  path?: string
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
  maxAge?: number
}

type CookieConfig = {
  accessCookieName: string
  refreshCookieName: string
  defaultPath: string
  defaultSameSite: 'strict' | 'lax' | 'none'
}

function getCookieConfig(): CookieConfig {
  return {
    accessCookieName: process.env.AUTH_V2_ACCESS_COOKIE_NAME ?? 'nucleus_access_token',
    refreshCookieName: process.env.AUTH_V2_REFRESH_COOKIE_NAME ?? 'nucleus_refresh_token',
    defaultPath: '/',
    defaultSameSite:
      (process.env.AUTH_V2_COOKIE_SAME_SITE as 'strict' | 'lax' | 'none' | undefined) ?? 'strict',
  }
}

export function setAuthCookies(
  req: ElysiaRequest,
  accessToken: string,
  refreshToken: string,
  overrides?: CookieOptions
) {
  const { accessCookieName, refreshCookieName, defaultPath, defaultSameSite } = getCookieConfig()

  // In development (localhost), secure cookies won't work over HTTP
  // Only use secure cookies in production or when explicitly set
  const isProduction = process.env.NODE_ENV === 'production'
  const defaultSecure = isProduction

  const baseOptions = {
    path: overrides?.path ?? defaultPath,
    httpOnly: overrides?.httpOnly ?? true,
    secure: overrides?.secure ?? defaultSecure,
    sameSite: overrides?.sameSite ?? defaultSameSite,
  }

  // Set cookies individually to avoid spread issues with Elysia
  if (!req.set.cookie) {
    req.set.cookie = {}
  }

  req.set.cookie[accessCookieName] = {
    value: accessToken,
    ...baseOptions,
    maxAge: overrides?.maxAge ?? undefined,
  }

  req.set.cookie[refreshCookieName] = {
    value: refreshToken,
    ...baseOptions,
    maxAge: overrides?.maxAge ?? undefined,
  }

  // Debug logging (remove in production)
  console.log('🍪 Cookies Set:', {
    accessCookieName,
    refreshCookieName,
    secure: baseOptions.secure,
    sameSite: baseOptions.sameSite,
    maxAge: overrides?.maxAge,
    accessTokenLength: accessToken.length,
    refreshTokenLength: refreshToken.length,
    cookieObjectKeys: Object.keys(req.set.cookie),
  })
}

export function clearAuthCookies(req: ElysiaRequest) {
  const { accessCookieName, refreshCookieName, defaultPath, defaultSameSite } = getCookieConfig()
  const isProduction = process.env.NODE_ENV === 'production'
  const defaultSecure = isProduction

  if (!req.set.cookie) {
    req.set.cookie = {}
  }

  req.set.cookie[accessCookieName] = {
    value: '',
    path: defaultPath,
    httpOnly: true,
    secure: defaultSecure,
    sameSite: defaultSameSite,
    maxAge: 0,
  }

  req.set.cookie[refreshCookieName] = {
    value: '',
    path: defaultPath,
    httpOnly: true,
    secure: defaultSecure,
    sameSite: defaultSameSite,
    maxAge: 0,
  }
}

export function getAuthCookies(req: ElysiaRequest) {
  const { accessCookieName, refreshCookieName } = getCookieConfig()
  const cookiesHeader = req.request.headers.get('cookie') ?? ''
  const cookies = cookiesHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.trim().split('=')
    if (key && value) acc[key] = value
    return acc
  }, {})

  return {
    accessToken: cookies[accessCookieName],
    refreshToken: cookies[refreshCookieName],
  }
}
