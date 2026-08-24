import { authCookieHeader } from '@/lib/api/forwardAuth'
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

  const authCookie = await authCookieHeader()

  if (!authCookie) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  /*
   * `/cdn/:id`, not `/files/:id`.
   *
   * They look interchangeable and are not. `/files/:id` is the generated CRUD
   * read for the `files` TABLE — it answers the row as JSON (name, size, mime,
   * owner), which is why it sits beside `/files/bulk` and
   * `/files/distinct/:field`. The bytes are served by the storage route, which
   * the running server tags separately: `/files/{id}` is tagged Storage
   * "Get files by ID", `/cdn/{id}` is tagged CDN "Get file by ID", and only the
   * latter sets a real Content-Type, honours Range requests and serves the
   * resized derivatives.
   *
   * Proxying the CRUD row meant this handler answered `application/json` for
   * every photo, so each <img> got a JSON body and rendered broken — on the 5S
   * finding gallery, the denetim photos and the before/after report panel.
   */
  const beRes = await fetch(`${BACKEND_URL}/cdn/${fileId}`, {
    headers: {
      Cookie: authCookie,
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
