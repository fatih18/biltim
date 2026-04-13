import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.AUTH_API_URL || ''

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params

  if (!fileId) {
    return NextResponse.json({ message: 'File ID required' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const accessToken = cookieStore.get('nucleus_access_token')?.value

  if (!accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const beRes = await fetch(`${BACKEND_URL}/files/${fileId}`, {
    headers: {
      Cookie: `nucleus_access_token=${accessToken}`,
    },
  })

  if (!beRes.ok) {
    return NextResponse.json({ message: 'File not found' }, { status: beRes.status })
  }

  const contentType = beRes.headers.get('Content-Type') ?? 'application/octet-stream'
  const contentDisposition = beRes.headers.get('Content-Disposition')
  const body = await beRes.arrayBuffer()

  const resHeaders: HeadersInit = { 'Content-Type': contentType }
  if (contentDisposition) resHeaders['Content-Disposition'] = contentDisposition

  return new NextResponse(body, { status: 200, headers: resHeaders })
}
