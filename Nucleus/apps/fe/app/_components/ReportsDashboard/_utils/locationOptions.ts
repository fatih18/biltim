import { foldTr } from '@/app/_utils/textSearch'

/**
 * The locations the report pickers offer.
 *
 * Findings and audits are linked to a location by its NAME, and the server
 * matches them with the same key (be-nucleus routes/locationMatch.ts), so the
 * picker lists one entry per key: "Isı Merkezi" and "ISI MERKEZİ" are one
 * place, not two entries that download the same file.
 */

export type LocationRow = { name?: string | null }

/** One key per place: composed, zero-width marks dropped, one space between words, Turkish-folded, i and ı alike. */
export function locationKey(value: string): string {
  return foldTr(
    value
      .normalize('NFC')
      .replace(/[\u200B-\u200D\u2060\uFEFF\u0307]/g, '')
      .replace(/\s+/g, ' ')
  ).replace(/ı/g, 'i')
}

/** A name with one space between words and none at the ends. */
export const cleanLocationName = (value: string | null | undefined): string => (value ?? '').replace(/\s+/g, ' ').trim()

/**
 * Names to offer, one per place, in Turkish alphabetical order. `onlyThese`
 * narrows the list to those places (a field manager's own); null = no
 * narrowing. An empty `onlyThese` offers nothing, never everything.
 */
export function offeredLocations(rows: readonly LocationRow[], onlyThese: readonly string[] | null): string[] {
  const allowed = onlyThese ? new Set(onlyThese.map(locationKey)) : null
  const seen = new Set<string>()
  const names: string[] = []
  for (const row of rows) {
    const name = cleanLocationName(row.name)
    const key = locationKey(name)
    if (!name || seen.has(key)) continue
    if (allowed && !allowed.has(key)) continue
    seen.add(key)
    names.push(name)
  }
  return names.sort((a, b) => a.localeCompare(b, 'tr'))
}
