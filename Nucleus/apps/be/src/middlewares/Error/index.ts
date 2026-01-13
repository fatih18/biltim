import type { OnError } from '@server'
import { generateResponse } from '@/utils'

export async function ErrorMiddleware(ctx: OnError) {
  const { set } = ctx
  const status = ctx.error.status ?? 500
  const message = ctx.error.message ?? 'Internal Server Error'
  set.status = status
  return Response.json(
    generateResponse({
      isSuccess: false,
      message,
      status,
      errors: [(ctx as { error: Error }).error],
      data: null,
    })
  )
}
