import { authCookieHeader } from '@/lib/api/forwardAuth'
import { type NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.AUTH_API_URL || ''

export async function POST(req: NextRequest) {
  try {
    const authCookie = await authCookieHeader()

    const incoming = await req.formData()
    const file = incoming.get('files')
    const type = incoming.get('type') ?? 'image'

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ isSuccess: false, message: 'No file provided' }, { status: 400 })
    }

    const outgoing = new FormData()
    outgoing.append('files', file, file.name)
    outgoing.append('type', String(type))

    const backendHeaders: HeadersInit = {}
    if (authCookie) {
      backendHeaders['Cookie'] = authCookie
    }

    const beRes = await fetch(`${BACKEND_URL}/files/`, {
      method: 'POST',
      body: outgoing,
      headers: backendHeaders,
    })

    const data = await beRes.json()
    return NextResponse.json(data, { status: beRes.status })
  } catch (err) {
    console.error('[upload-file] Error:', err)
    return NextResponse.json({ isSuccess: false, message: 'Upload failed' }, { status: 500 })
  }
}
