'use server'

import { cookies } from 'next/headers'
import { checkDailyPassword } from '@/app/api/check-daily-pass/pass'
import { DailyPasswordGateClient } from './client'

export async function DailyPasswordGate({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const dailyPassword = cookieStore.get('Xcv1NeUe9')?.value

  if (dailyPassword && checkDailyPassword(dailyPassword)) return children

  return <DailyPasswordGateClient />
}
