/**
 * Whether the correction screen may open (R30).
 *
 * The plan decides what saving a correction does: on a rejected plan it sends
 * the audit again, on any other it only saves. The home page names the plan in
 * the address (`?planId=`), so an address that names one and a plan that was
 * not read (the read failed, or returned nothing) is not "an audit without a
 * plan": opened anyway, the form would show the plain banner and a save that
 * never resends. It is not opened; the person is told and can retry.
 *
 * An address without `planId` (an audit whose plan was deleted, opened by its
 * own address) still opens: nothing says a plan is missing.
 */

/** The sentence the screen leads with; it is also what the person should do. */
export const EDIT_PLAN_UNREADABLE_TEXT = 'Denetimin planı okunamadı; sayfayı yenileyip yeniden deneyin.'

/** What it means that the screen did not open, and why it is not worked around. */
export const EDIT_PLAN_UNREADABLE_WHY =
  'Plan okunmadan düzeltme açılmaz: reddedilmiş bir denetim burada kaydedilse bile onaya yeniden gönderilemezdi.'

export type EditPlanVerdict = 'open' | 'unreadable'

export function editPlanVerdict(input: {
  /** `planId` from the address, as written there. */
  addressPlanId: string | null | undefined
  /** The plan row that was read, null when it was not. */
  plan: { id: string } | null | undefined
}): EditPlanVerdict {
  const named = String(input.addressPlanId ?? '').trim() !== ''
  return named && !input.plan ? 'unreadable' : 'open'
}
