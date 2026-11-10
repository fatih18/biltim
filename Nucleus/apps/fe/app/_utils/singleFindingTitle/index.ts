import { foldTr } from '@/app/_utils/textSearch'

/**
 * The "Ana Denetim" a finding raised on its own carries (#3).
 *
 * Both the audit screen (which writes it) and the findings register (which
 * reads it back to group twins) need it, so it lives here and not under either
 * page.
 */
export const SINGLE_FINDING_TITLE = 'Tekil Bulgu'

/** A real audit name from a finding's `form_title`; "" for none or the plain "Tekil Bulgu". */
export function auditNameOfTitle(formTitle: string | null | undefined): string {
  const title = (formTitle ?? '').trim()
  return title && foldTr(title) !== foldTr(SINGLE_FINDING_TITLE) ? title : ''
}
