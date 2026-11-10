/**
 * The paging rule of the location picker, as pure functions.
 *
 * nucleus gives at most 200 rows a page, so the picker reads page after page
 * until the list says there is no next one. The rule used to live in an effect
 * that re-ran whenever one of three flags changed and ignored errors: with
 * more than 200 locations a refused second page left `hasMore` true, the
 * loading flag fell back to false, the effect ran again and asked for the same
 * page again, for ever. A failure now ends the reading, and the picker says so.
 */

export type PagingState = {
  /** The last page read said another one follows. */
  hasMore: boolean
  /** The first page (or a reload) is on its way. */
  isLoading: boolean
  /** A later page is on its way. */
  isLoadingMore: boolean
  /** The last request was refused or never answered. */
  failed: boolean
}

/**
 * read   = ask for the next page now
 * wait   = a request is in flight, ask nothing
 * done   = every page is in
 * failed = a request failed: ask nothing until the person reloads
 */
export type PagingStep = 'read' | 'wait' | 'done' | 'failed'

export function nextPagingStep(state: PagingState): PagingStep {
  if (state.failed) return 'failed'
  if (state.isLoading || state.isLoadingMore) return 'wait'
  return state.hasMore ? 'read' : 'done'
}

export type PickerStatusInput = {
  list: PagingState
  /** False until the first effect has run: nothing is loading yet and "empty" would flash. */
  requested: boolean
  /** The roles, or a field manager's own locations, are still being read. */
  waitingForScope: boolean
  /** The caller is a field manager and nothing more. */
  scoped: boolean
  scopeFailed: boolean
}

/**
 * What the picker shows. A failed read is not "still loading": with a page
 * refused, `hasMore` stays true, and counting it would keep the picker on
 * "yükleniyor" for ever instead of reaching the error state.
 */
export function pickerStatus(input: PickerStatusInput): { loading: boolean; failed: boolean } {
  const { list } = input
  const failed = list.failed || (input.scoped && input.scopeFailed)
  const reading = list.isLoading || list.isLoadingMore || (list.hasMore && !list.failed)
  return { loading: !input.requested || reading || input.waitingForScope, failed }
}
