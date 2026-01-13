// app/api/processMail/route.ts

import { NextResponse } from 'next/server'
import { processMail } from '@/app/(pages)/(pocs)/pocs/telekom/_actions/ProcessMail'

export async function POST(req: Request) {
  try {
    const { plainText } = await req.json()
    const result = await processMail(plainText)

    return NextResponse.json(result)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'OpenAI processing failed' }, { status: 500 })
  }
}
