type Dict = Record<string, unknown>

/**
 * `filters` — the one translation that decides whether the app works at all.
 *
 * Every list screen here was written against the old backend's filter dialect,
 * a plain map:
 *
 *     filters: { user_id: id }                     field = value
 *     filters: { age: { operator: 'gte', value } } an explicit operator
 *     filters: { status: ['a','b'] }               a list means IN
 *
 * nucleus wants an ARRAY of conditions instead:
 *
 *     filters: [{ field: 'user_id', operator: 'eq', value: id }]
 *
 * On 0.9 the difference was invisible in the worst possible way: a map was not
 * an array, the server could not read it, and it answered 200 WITH EVERY ROW —
 * an ignored filter looks like a working screen right up until someone trusts
 * the count. 0.10 answers 400 instead, which is correct and which is why
 * thirteen screens stop dead the moment the backend is upgraded: the home
 * dashboard, bulgular, the user and role editors, the RBAC claims editor, the
 * audit log, denetim's draft restore and the verification flow. Measured
 * against a live 0.10.8:
 *
 *     ?filters={"is_active":true}                                400
 *     ?filters=[{"field":"is_active","operator":"eq","value":1}] 200
 *
 * Translating here rather than in thirteen call sites is the same choice the
 * rest of this file already makes for envelopes and snake_case: the screens
 * speak the old dialect, one seam speaks both.
 */

/** Legacy operator names that nucleus spells differently. */
const OPERATOR_ALIASES: Record<string, string> = { ne: 'neq', notin: 'notIn' }

/*
 * Only `_gte` and `_lte`, and only because they are the only two suffixes any
 * screen actually sends (bulgular's date window). They were never a real
 * feature: the old backend read `detected_date_gte` as a COLUMN NAME, found
 * none, and dropped the clause — so that date filter has silently done nothing
 * since it was written. nucleus refuses an unknown field outright ("Unknown
 * field in filter"), so leaving them alone would turn a dead filter into a dead
 * SCREEN. Kept deliberately short: a generic suffix rule would mis-split a real
 * column that happens to end in one.
 */
const SUFFIX_OPERATORS = ['_gte', '_lte'] as const

export function toFilterCondition(key: string, raw: unknown): Dict | null {
  // The screens write `value || undefined` for "not set"; an empty text input
  // means the same thing. Neither should become `field = ''`.
  if (raw === undefined || raw === '') return null

  let field = key
  let operator = 'eq'
  let value: unknown = raw

  for (const suffix of SUFFIX_OPERATORS) {
    if (field.length > suffix.length && field.endsWith(suffix)) {
      operator = suffix.slice(1)
      field = field.slice(0, -suffix.length)
      break
    }
  }

  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw) && 'operator' in raw) {
    const explicit = raw as { operator?: unknown; value?: unknown }
    operator = String(explicit.operator ?? operator)
    value = explicit.value
    if (value === undefined || value === '') return null
  } else if (Array.isArray(raw)) {
    if (raw.length === 0) return null
    operator = 'in'
  } else if (raw === null) {
    operator = 'isNull'
    value = true
  }

  const lower = operator.toLowerCase()
  return { field, operator: OPERATOR_ALIASES[lower] ?? operator, value }
}

export function normalizeFilters(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload
  const source = payload as Dict
  if (!('filters' in source)) return payload

  const filters = source.filters
  // Already nucleus's shape, or explicitly cleared — leave it exactly as it is.
  if (filters === undefined || filters === null || Array.isArray(filters)) return payload
  if (typeof filters !== 'object') return payload

  const conditions: Dict[] = []
  for (const [key, raw] of Object.entries(filters as Dict)) {
    const condition = toFilterCondition(key, raw)
    if (condition) conditions.push(condition)
  }

  // An all-empty filter map is "no filter", not "match nothing".
  return { ...source, filters: conditions.length > 0 ? conditions : undefined }
}
