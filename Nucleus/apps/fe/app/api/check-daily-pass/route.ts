'use server'

import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import { checkDailyPassword } from './pass'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const cookieStore = await cookies()

  const isValid = checkDailyPassword(password)

  if (isValid) {
    cookieStore.set('Xcv1NeUe9', password, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
  }

  return NextResponse.json({
    isValid,
    message: isValid ? 'Password is valid' : 'Password is invalid',
  })
}
