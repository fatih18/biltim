import { readListResponse, type SortCondition } from '@/app/_hooks/UseServerList'

/**
 * Every row a list read matches, page by page.
 *
 * nucleus gives at most 200 rows a page whatever `limit` says, and says nothing
 * about the rest: a read that asks for `limit: 1000` and keeps the first answer
 * silently works from 200 rows. A screen that decides something from the whole
 * list (who is busy on a day, who is on a team) must read every page, and must
 * know when one failed: a partial list is never handed on as the whole one.
 */

/** nucleus gives at most this many rows a page, whatever `limit` says. */
export const LIST_PAGE_SIZE = 200
/** 200 x 100 rows is far past any real list: a guard against a loop, not a limit. */
export const LIST_MAX_PAGES = 100
/** Ids in one `in` condition. The filter travels in the URL, which has a length limit. */
export const IDS_PER_READ = 50

/** A tie-breaking order: no row moves between two pages. */
export const BY_ID: SortCondition[] = [{ field: 'id', direction: 'asc' }]
/** Oldest first, ties by id: a stable order for paging a list that is shown as it was created. */
export const OLDEST_FIRST: SortCondition[] = [
  { field: 'created_at', direction: 'asc' },
  { field: 'id', direction: 'asc' },
]
/** Newest first, ties by id. */
export const NEWEST_FIRST: SortCondition[] = [
  { field: 'created_at', direction: 'desc' },
  { field: 'id', direction: 'asc' },
]

export type JsonValue = string | number | boolean | null | undefined | JsonValue[] | { [key: string]: JsonValue }

/** One row as a list read returns it. */
export type ListRow = { [key: string]: JsonValue }

export type Condition = {
  field: string
  operator: string
  value: string | boolean | readonly string[]
}

export type ReadPayload = {
  filters?: readonly Condition[]
  sort?: readonly SortCondition[]
}

export type PageRequest = {
  payload: ReadPayload & { page: number; limit: number }
  onAfterHandle: (response: object) => void
  onErrorHandle: (error: object) => void
}

/** A generated list action's `start`. */
export type PageStarter = (request: PageRequest) => void

/** A request cancelled by the browser is not a failure worth reporting. */
export function isAbortError(error: object): boolean {
  return 'name' in error && error.name === 'AbortError'
}

export type PagedRead = {
  start: PageStarter
  /** Filters and sort. The page and the limit are set here. */
  payload: ReadPayload
  onDone: (rows: ListRow[]) => void
  onError: (error: object) => void
}

/** Reads page after page until the server runs out; `onError` once if any page fails. */
export function readAllPages({ start, payload, onDone, onError }: PagedRead): void {
  const rows: ListRow[] = []
  const seen = new Set<string>()

  const readPage = (page: number) => {
    start({
      payload: { ...payload, page, limit: LIST_PAGE_SIZE },
      onAfterHandle: (response) => {
        const { items, hasNext } = readListResponse<ListRow>(response)
        for (const row of items) {
          const id = row.id === undefined || row.id === null ? '' : String(row.id)
          if (id && seen.has(id)) continue
          if (id) seen.add(id)
          rows.push(row)
        }
        // A short page is the last one, whether or not the meta says so.
        if (items.length === 0 || (!hasNext && items.length < LIST_PAGE_SIZE)) {
          onDone(rows)
          return
        }
        if (page >= LIST_MAX_PAGES) {
          onError(new Error(`The list is longer than ${LIST_MAX_PAGES} pages; it was not read in full.`))
          return
        }
        readPage(page + 1)
      },
      onErrorHandle: onError,
    })
  }

  readPage(1)
}

export type IdRead = {
  start: PageStarter
  /** The column the ids belong to, e.g. `id` or `team_id`. */
  field: string
  ids: readonly string[]
  /** Conditions that go with the ids, e.g. only active rows. */
  filters?: readonly Condition[]
  onDone: (rows: ListRow[]) => void
  onError: (error: object) => void
}

/**
 * Every row whose `field` is one of `ids`.
 *
 * The ids go out in groups (IDS_PER_READ), each group read page by page, so a
 * long id list neither overruns the URL nor loses rows past the first page.
 * `onError` is called once, however many groups fail.
 */
export function readByIds({ start, field, ids, filters = [], onDone, onError }: IdRead): void {
  const unique = [...new Set(ids.filter((id) => id !== ''))]
  if (unique.length === 0) {
    onDone([])
    return
  }

  const groups: string[][] = []
  for (let from = 0; from < unique.length; from += IDS_PER_READ) {
    groups.push(unique.slice(from, from + IDS_PER_READ))
  }

  const found: ListRow[][] = []
  let waiting = groups.length
  let failed = false

  for (const group of groups) {
    readAllPages({
      start,
      payload: { sort: BY_ID, filters: [...filters, { field, operator: 'in', value: group }] },
      onDone: (rows) => {
        if (failed) return
        found.push(rows)
        waiting -= 1
        if (waiting === 0) onDone(found.flat())
      },
      onError: (error) => {
        if (failed) return
        failed = true
        onError(error)
      },
    })
  }
}
