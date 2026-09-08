/**
 * Comparing Turkish text without losing the dotted i.
 *
 * `toLowerCase()` is the wrong tool here: it maps I to i, so a search for
 * "ismail" never matches "İSMAİL" and "Idari" never matches "İdari". The
 * locale-aware form gets the pair right — İ→i and I→ı — which is exactly why
 * it also cannot be used on identifiers, where i must stay i.
 *
 * The fold is deliberately one-way and only for comparison; nothing here is
 * ever shown to anyone.
 */
export function foldTr(value: unknown): string {
  return String(value ?? '')
    .toLocaleLowerCase('tr')
    .trim()
}

/** True when `haystack` contains `needle`, compared the Turkish way. */
export function containsTr(haystack: unknown, needle: string): boolean {
  const n = foldTr(needle)
  if (!n) return true
  return foldTr(haystack).includes(n)
}
