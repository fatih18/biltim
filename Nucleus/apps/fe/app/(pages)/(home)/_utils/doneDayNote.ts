/**
 * The sentences said under the home list about audits that appear twice (R43).
 * Plain text out of plain numbers, so what the person is told can be checked
 * without a browser.
 */

/**
 * Which repeat is which, and that the counts take each audit once; null when no
 * audit is repeated, so an ordinary list stays as it was.
 *
 * `audits` is the plan rows of the list, `repeats` every repeat, `outside` the
 * repeats whose plan is not on the list (planned long before it was done).
 */
export function doneDayNote(audits: number, repeats: number, outside: number): string | null {
  if (repeats === 0) return null
  const inPage = repeats - outside
  const parts = [`Listede ${audits} denetim var.`]
  if (inPage > 0) {
    parts.push(`${inPage} tanesi planlandığından farklı bir günde yapıldığı için yapıldığı günde de görünür.`)
  }
  if (outside > 0) {
    parts.push(`${outside} denetimin planı bu sayfanın dışında kaldığı için yalnız yapıldığı günde görünür.`)
  }
  parts.push('Tekrar satırları mavi çizgilidir ("Aynı denetim"); sekmelerdeki sayılar ve toplamlar her denetimi bir kez sayar.')
  return parts.join(' ')
}

/** Said when the read of the plans outside the page failed: what is wrong, what it means, what to do. */
export const REPEATS_UNAVAILABLE_NOTE =
  'Planı bu sayfanın dışında kalan denetimler okunamadı; bunlar yapıldıkları günde listelenmemiş olabilir. Sayfayı yenileyin.'
