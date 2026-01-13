import type { ElysiaRequest, OnRequest } from '@/server'

export function getClientOriginInfo(ctx: OnRequest | ElysiaRequest) {
  const ip = ctx.server?.requestIP(ctx.request)?.address || 'unknown'
  const userAgent = ctx.request.headers.get('user-agent') || ''
  // Origin header - CORS isteklerde ve POST/PUT/DELETE'de gelir
  const origin = ctx.request.headers.get('origin')

  // Referer header - hangi sayfadan geldiği bilgisi
  const referer = ctx.request.headers.get('referer') || ctx.request.headers.get('referrer')

  // X-Forwarded headers - Next.js rewrite'dan geliyor
  const xForwardedFor = ctx.request.headers.get('x-forwarded-for')
  const xForwardedHost = ctx.request.headers.get('x-forwarded-host')
  const xForwardedProto = ctx.request.headers.get('x-forwarded-proto')

  let clientDomain = ''
  let clientSubdomain = ''
  let clientProtocol = ''
  let clientPort = ''
  let sourceUrl: string | null = null

  // Önce x-forwarded-host'a bak (Next.js rewrite'dan geliyorsa)
  if (xForwardedHost) {
    const protocol = xForwardedProto || 'http'
    sourceUrl = `${protocol}://${xForwardedHost}`
  }
  // Yoksa origin veya referer'a bak
  else {
    sourceUrl = origin || referer
  }

  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl)
      const parts = url.hostname.split('.')

      clientProtocol = url.protocol.replace(':', '')
      clientPort = url.port || (url.protocol === 'https:' ? '443' : '80')

      if (parts.length > 2) {
        clientSubdomain = parts.slice(0, -2).join('.')
        clientDomain = parts.slice(-2).join('.')
      } else {
        clientDomain = url.hostname
      }
    } catch (error) {
      console.log('URL parse error:', error)
    }
  }

  return {
    origin,
    referer,
    clientDomain,
    clientSubdomain,
    clientProtocol,
    clientPort,
    clientFullUrl: sourceUrl,
    xForwardedFor,
    hasClientInfo: Boolean(sourceUrl),
    ip,
    userAgent,
  }
}
