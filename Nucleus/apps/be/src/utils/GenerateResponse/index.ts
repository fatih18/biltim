import type { ApiResponse } from '@/types/shared'

export function generateResponse<S, E, T = unknown>({
  isSuccess = true,
  data,
  errors = null,
  status = 200,
  message,
  request,
}: ApiResponse<S, E, T>) {
  if (request) request.set.status = status
  return {
    isSuccess,
    data,
    errors,
    status,
    message,
  }
}
