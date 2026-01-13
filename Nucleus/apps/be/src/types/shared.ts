import type { PgTransaction } from 'drizzle-orm/pg-core'
import type { ElysiaRequest, ElysiaRequestWOBody } from '@/server'

export type StandardResponse<S, E> = {
  isSuccess: boolean
  errors?: E | null
  message: string
  data?: S
}

export type ApiResponse<S, E, T = unknown> = StandardResponse<S, E> & {
  data?: S
  status?: number
  request?: ElysiaRequest<T> | ElysiaRequestWOBody
}

export type SharedPayload = {
  ip_address: string
  user_agent: string
  action_type: 'UPDATE' | 'INSERT' | 'DELETE' | 'TOGGLE'
  // biome-ignore lint/suspicious/noExplicitAny: <>
  tx?: PgTransaction<any, any, any>
  user_id: string
  schema_name: string
}
