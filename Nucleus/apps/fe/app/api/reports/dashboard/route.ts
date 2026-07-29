import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.AUTH_API_URL || ''

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('nucleus_access_token')?.value

  if (!accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const search = req.nextUrl.search || ''
  const beRes = await fetch(`${BACKEND_URL}/reports/dashboard${search}`, {
    headers: {
      Cookie: `nucleus_access_token=${accessToken}`,
    },
    cache: 'no-store',
  })

  const data = await beRes.json().catch(() => null)

  if (!beRes.ok) {
    return NextResponse.json(data ?? { message: 'Rapor verisi alınamadı' }, {
      status: beRes.status,
    })
  }

  return NextResponse.json(data, { status: 200 })
}
