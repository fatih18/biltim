import { AddAuditLog, type FiltersRecord } from '@monorepo/generics'
import type { ElysiaRequest, ElysiaRequestWOBody } from '@/server'
import type { ApiResponse } from '@/types/shared'
import { generateResponse } from '@/utils'

export async function withChecks<S, E, T, TReq extends ElysiaRequest | ElysiaRequestWOBody>({
  req,
  endpoint,
  operationName,
}: {
  req: TReq
  endpoint: (req: TReq) => Promise<ApiResponse<S, E, T> | S>
  operationName: string
}) {
  try {
    const result = await endpoint(req)
    return result
  } catch (error) {
    console.log('❗❌❌❌ Error in withChecks:', error)
    const anyErr = error as any
    const pgCode = anyErr?.code ?? anyErr?.cause?.code
    const isConflict = pgCode === '23503' || pgCode === '23505'
    const status = isConflict ? 409 : 500
    if (req) req.set.status = status
    const profile = JSON.parse(req.request.headers.get('profile') || '{}')

    const isUuid = (value: unknown): value is string =>
      typeof value === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

    const candidateEntityId = (req as any)?.params?.id
    const entity_id = isUuid(candidateEntityId) ? candidateEntityId : undefined

    try {
      await AddAuditLog({
        input: {
          entity_name: operationName,
          operation_type: 'ERROR',
          user_agent: req.request.headers.get('user-agent') || undefined,
          ip_address: req.server?.requestIP(req.request)?.address || 'unknown',
          summary: `Failed to ${operationName}: ${error instanceof Error ? error.message : String(error)
            }`,
          user_id: profile.sub,
          entity_id,
        },
      })
    } catch (auditErr) {
      console.warn('⚠️ Failed to add audit log (ignored):', auditErr)
    }

    return generateResponse({
      isSuccess: false,
      message: `Failed to ${operationName}: ${error instanceof Error ? error.message : String(error)
        }`,
      errors: [error],
      status,
      request: req,
    })
  }
}

export function parseFiltersFromQuery(
  query: Partial<Record<string, string | string[]>>
): FiltersRecord | undefined {
  const explicitFilters = (query.filters as unknown as FiltersRecord) ?? undefined
  const dottedFilters: FiltersRecord = {}

  for (const [key, raw] of Object.entries(query)) {
    if (!key.startsWith('filters.') && !key.startsWith('filters[')) continue

    const field = key.startsWith('filters[')
      ? key.slice('filters['.length, -1)
      : key.slice('filters.'.length)

    if (field.length === 0) continue

    dottedFilters[field] = Array.isArray(raw)
      ? raw
      : raw?.includes(',')
        ? raw.split(',')
        : (raw as string)
  }

  return (
    explicitFilters ??
    (Object.keys(dottedFilters).length > 0 ? (dottedFilters as FiltersRecord) : undefined)
  )
}

type SchemaModule = {
  tablename?: string
  SearchConfig?: { table_name?: string }
  [key: string]: unknown
}

export function resolveSchemaEntityKey(schema: SchemaModule): string {
  const visited = new Set<string>()
  const candidates = [...Object.keys(schema), ...Object.getOwnPropertyNames(schema)]

  for (const key of candidates) {
    if (visited.has(key) || !key.startsWith('T_')) continue
    visited.add(key)

    const value = schema[key]
    if (typeof value !== 'object' || value === null) continue

    if ('$inferSelect' in (value as Record<string, unknown>)) {
      return key
    }
  }

  const fallback = schema.SearchConfig?.table_name
  if (typeof fallback === 'string' && fallback.length > 0) {
    return fallback
  }

  throw new Error(`No table export found for schema ${schema.tablename ?? 'unknown'}`)
}
