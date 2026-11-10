import { query } from '../db'
import { callerById, isCentral } from '../guards/caller'
import { managedSpellings, type Read } from './locationMatch'

/**
 * A field manager's reports are narrowed to their own locations (#7/#24).
 *
 * Findings and audits name their place in TEXT (`location_name`,
 * `department_name`), so the narrowing is a list of the spellings those columns
 * hold for the manager's places, found by `locationKey` in JS
 * (locationMatch.ts), and `column = any(list)` in SQL. It used to be
 * lower(trim(column)) on both sides, which Postgres does ASCII-wise: a location
 * stored with a non-breaking space, a double space or "ı" for "I" kept the
 * manager's own findings out of their report. Plans name their place by id and
 * keep the user id for that.
 *
 * (An earlier JS attempt lowercased with toLowerCase and lost "İdari", which
 * becomes "i" plus a combining dot there. `locationKey` folds with the Turkish
 * locale and drops the dot, so that spelling matches too.)
 */

export type FieldScope = {
  userId: string
  /** Every stored spelling of the manager's places; empty = they manage none. */
  spellings: string[]
}

/**
 * The scope of a caller who is a field manager and nothing more; null = no
 * narrowing (Merkez Ekip and above, or anyone not a field manager).
 */
export async function fieldManagerScope(request: Request, read: Read = query): Promise<FieldScope | null> {
  const caller = await callerById(request.headers.get('x-user-id') ?? '', read)
  if (!caller || isCentral(caller) || !caller.roles.includes('field manager')) return null
  return { userId: caller.userId, spellings: await managedSpellings(caller.userId, read) }
}

/**
 * ` AND <column> is one of the spellings in parameter $n`.
 *
 * Managing no location matches nothing: the narrowed report is empty, never
 * the whole plant's.
 */
export function inManagedLocations(column: string, paramIndex: number): string {
  return ` AND ${column} = ANY($${paramIndex}::text[])`
}

/** A query's scope clause and params together, like `dateRange`; no spellings = no narrowing. */
export function scoped(spellings: string[] | null, params: unknown[]) {
  if (!spellings) return { on: (_column: string) => '', params }
  const index = params.length + 1
  return { on: (column: string) => inManagedLocations(column, index), params: [...params, spellings] }
}
