import { NEWEST_FIRST, readAllPages, type ListRow, type PageStarter } from '@/app/_utils/readAllPages'

/*
 * The audit teams, every page of them.
 *
 * nucleus gives at most 200 rows a page whatever `limit` says. The teams were
 * read once with `limit: 2000`, so a team past the 200th was not found: its
 * leader and members got no "Ekip" field and no "Ekip:" line. They are read
 * with the shared page reader now, in a tie-breaking order so no team moves
 * between two pages.
 */

/** Makes the error the page's offline fallback reads (page.tsx → apiCallError): the body plus the HTTP code. */
export type ErrorOf = (body: object, code: number | null | undefined) => Error

/** `start` with the HTTP code kept: the shared reader hands its `onError` the body alone. */
export function keepingStatus(start: PageStarter, errorOf: ErrorOf): PageStarter {
  return (request) =>
    start({
      ...request,
      onErrorHandle: (body: object, code?: number | null) => request.onErrorHandle(errorOf(body, code)),
    })
}

/** Every team row; rejects with `errorOf`'s error when any page fails, never with a partial list. */
export function readAllTeams(start: PageStarter, errorOf: ErrorOf): Promise<ListRow[]> {
  return new Promise((resolve, reject) => {
    readAllPages({
      start: keepingStatus(start, errorOf),
      payload: { sort: NEWEST_FIRST },
      onDone: resolve,
      onError: reject,
    })
  })
}
