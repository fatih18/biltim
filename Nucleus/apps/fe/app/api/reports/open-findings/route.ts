import { authCookieHeader } from '@/lib/api/forwardAuth'
import { type NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.AUTH_API_URL || ''

export async function GET(req: NextRequest) {
  const authCookie = await authCookieHeader()

  if (!authCookie) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const search = req.nextUrl.search || ''
  const beRes = await fetch(`${BACKEND_URL}/reports/open-findings.xlsx${search}`, {
    headers: {
      Cookie: authCookie,
    },
  })

  if (!beRes.ok) {
    return NextResponse.json({ message: 'Excel raporu alınamadı' }, { status: beRes.status })
  }

  const contentType =
    beRes.headers.get('Content-Type') ??
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  const contentDisposition = beRes.headers.get('Content-Disposition')
  const body = await beRes.arrayBuffer()

  const resHeaders: HeadersInit = { 'Content-Type': contentType }
  if (contentDisposition) resHeaders['Content-Disposition'] = contentDisposition

  return new NextResponse(body, { status: 200, headers: resHeaders })
}
