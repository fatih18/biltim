import type { FindingQuery } from './findingScope'

/**
 * Reading the `filters` of a findings list request (findingScope.ts).
 *
 * The audit form of an auditor who is also a field manager reads findings in
 * exactly two ways, and `isPlaceLookup` is how the limit tells them from every
 * other list read:
 *   - the open findings of the place being audited: `location_name` equal to
 *     the place (the form sends `ilike` with the name's `%`, `_` and `\`
 *     escaped, so the name is taken literally);
 *   - the offline replay's duplicate check: `client_finding_id` equal to the
 *     queued finding's id.
 */

/** `filters[0][field]=…`: nucleus lets it override a JSON `filters`, so a request in that form is never read here. */
export const BRACKET_FILTERS = /^filters\[/

/** `\x` in an ILIKE pattern is the character x taken literally (PostgreSQL's default escape character). */
const ESCAPED_CHARACTER = /\\./gsu

/**
 * `ilike` is a pattern: `%` is any text and `_` any one character, so a value
 * names one place only when no wildcard is left once the escaped characters
 * are taken out. A place called "Hat_1" or "Yüzde%" is looked up as `Hat\_1`
 * and `Yüzde\%` (the audit form escapes the name, `ilikeLiteral.ts`). A
 * backslash left over after that pairing ends the pattern, which PostgreSQL
 * refuses; it is no lookup either.
 */
const WILDCARD_OR_LONE_ESCAPE = /[%_\\]/

export function isPlainIlike(value: string): boolean {
  return !WILDCARD_OR_LONE_ESCAPE.test(value.replace(ESCAPED_CHARACTER, ''))
}

/** The conditions of a JSON `filters` array; `[]` for none and null when nucleus cannot read it. */
export function parseFilters(raw: string): ReadonlyArray<object> | null {
  if (raw === '') return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** A top-level condition that pins the list to one place or to one client finding id. */
function isPlaceCondition(condition: object): boolean {
  if (!('field' in condition) || !('operator' in condition) || !('value' in condition)) return false
  const { field, operator, value } = condition
  if (typeof value !== 'string' || value.trim() === '') return false
  if (field === 'client_finding_id') return operator === 'eq'
  if (field === 'location_name') return operator === 'eq' || (operator === 'ilike' && isPlainIlike(value))
  return false
}

/**
 * Whether the list request carries a place or client-finding equality filter.
 *
 * nucleus ANDs every top-level condition, so such a condition always narrows
 * the list to that place (or that one finding), whatever else is asked. A
 * condition inside an `or` group does not count, nor does an operator that
 * could match many places (`in`, `like`, an `ilike` with an unescaped wildcard), nor a
 * `filters` that is not a JSON array.
 */
export function isPlaceLookup(query: FindingQuery): boolean {
  if (Object.keys(query).some((key) => BRACKET_FILTERS.test(key))) return false
  const asked = parseFilters((query.filters ?? '').trim())
  return asked !== null && asked.some(isPlaceCondition)
}
