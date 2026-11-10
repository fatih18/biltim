/**
 * The statuses a finding can have, as the findings export reads them (R48).
 *
 * The export's `status` parameter used to take one status. The Bulgular page
 * offers "Açık ve devam eden / Kapalı / Tümü", and the first choice is every
 * finding that is not closed: `open` and `in_progress` (reports.ts counts
 * overdue actions and the location form counts open findings the same way; the
 * label says "ve devam eden" because elsewhere "Açık" is status open only). One
 * parameter now carries a list, `status=open,in_progress`, so the whole choice
 * is one request.
 */
export const FINDING_STATUSES: readonly string[] = ['open', 'in_progress', 'closed']

/**
 * The known statuses a `status` parameter names, once each, in the order given.
 * What is not a status is dropped (as a lone unknown status always was), so a
 * value naming none of them filters nothing.
 */
export function parseStatuses(value: string): string[] {
  const named = value
    .split(',')
    .map((token) => token.trim())
    .filter((token) => FINDING_STATUSES.includes(token))
  return [...new Set(named)]
}
