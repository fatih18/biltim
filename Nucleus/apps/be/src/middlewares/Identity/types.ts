export type TokenPayload<T = Record<string, unknown>> = {
  sub: string | number
  iat: number
  exp: number
  device_signature?: string
  ip_address?: string
  data?: T
}
