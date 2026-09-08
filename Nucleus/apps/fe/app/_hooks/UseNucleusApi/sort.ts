type Dict = Record<string, unknown>

/**
 * `orderBy` — the second dialect the screens were written against.
 *
 * The old backend took ordering as either a column name with a direction
 * beside it, or a list of `{column, direction}`:
 *
 *     orderBy: 'created_at', orderDirection: 'desc'
 *     orderBy: [{ column: 'meeting_date', direction: 'desc' }]
 *
 * nucleus wants `sort`, keyed by `field`:
 *
 *     sort: [{ field: 'created_at', direction: 'desc' }]
 *
 * It does not answer 400 for the old shape — it ignores it and returns rows in
 * natural order, so every ordered list in the app has silently been unordered.
 * Measured against the live backend: `orderBy=[{"column":"finding_no",
 * "direction":"desc"}]` returned 3, 4, 5 while the equivalent `sort` returned
 * 5, 4, 3. Forty-eight call sites across twenty-three files ask this way.
 *
 * Translating here, next to `normalizeFilters`, is the same choice this file
 * already makes for envelopes and snake_case: the screens keep their dialect
 * and the seam speaks nucleus.
 */

const DIRECTIONS = new Set(['asc', 'desc'])

function toDirection(raw: unknown, fallback: 'asc' | 'desc' = 'asc'): 'asc' | 'desc' {
  const value = String(raw ?? '').toLowerCase()
  return DIRECTIONS.has(value) ? (value as 'asc' | 'desc') : fallback
}

function toCondition(raw: unknown, fallback: 'asc' | 'desc'): Dict | null {
  if (typeof raw === 'string') {
    return raw.trim() ? { field: raw.trim(), direction: fallback } : null
  }
  if (!raw || typeof raw !== 'object') return null
  const entry = raw as { field?: unknown; column?: unknown; direction?: unknown }
  const field = String(entry.field ?? entry.column ?? '').trim()
  if (!field) return null
  return { field, direction: toDirection(entry.direction, fallback) }
}

export function normalizeSort(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload
  const source = payload as Dict
  if (!('orderBy' in source) && !('orderDirection' in source)) return payload

  const { orderBy, orderDirection, ...rest } = source

  // An explicit `sort` wins; the caller already speaks nucleus.
  if (Array.isArray(rest.sort) && rest.sort.length > 0) return rest

  const fallback = toDirection(orderDirection)
  const raw = Array.isArray(orderBy) ? orderBy : [orderBy]
  const conditions = raw
    .map((entry) => toCondition(entry, fallback))
    .filter((entry): entry is Dict => entry !== null)

  // Nothing orderable was named — send no ordering rather than an empty one.
  if (conditions.length === 0) return rest
  return { ...rest, sort: JSON.stringify(conditions) }
}
