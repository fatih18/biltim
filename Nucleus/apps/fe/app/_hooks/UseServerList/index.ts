'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type SortCondition = { field: string; direction: 'asc' | 'desc' }
/** The map dialect UseNucleusApi already translates into nucleus's array form. */
export type FilterMap = Record<string, unknown>

type GenericAction = {
  start: (args: {
    payload?: Record<string, unknown>
    onAfterHandle?: (data: unknown) => void
    onErrorHandle?: (error: unknown) => void
  }) => void
}

export type UseServerListOptions = {
  /** The generated action, e.g. actions.GET_FIVE_S_FINDINGS. */
  action: GenericAction | undefined
  pageSize?: number
  /** Free-text search. Debounced here; the server does the matching. */
  search?: string
  /** Columns the search applies to. Omit to let the server decide. */
  searchFields?: string[]
  sort?: SortCondition[]
  filters?: FilterMap
  /** Extra payload merged into every request (e.g. a fixed scope). */
  extraPayload?: Record<string, unknown>
  enabled?: boolean
  searchDebounceMs?: number
}

export type UseServerListReturn<T> = {
  rows: T[]
  total: number | null
  hasMore: boolean
  isLoading: boolean
  isLoadingMore: boolean
  error: unknown
  loadMore: () => void
  reload: () => void
}

const idOf = (row: unknown): string | undefined =>
  typeof row === 'object' && row !== null ? (row as { id?: string }).id : undefined

export type ListCriteria = {
  search: string
  searchFields?: string[] | null
  sort?: SortCondition[] | null
  filters?: FilterMap | null
  extraPayload?: Record<string, unknown> | null
  pageSize: number
}

/** What the server is asked for. Pure, so it can be checked without a browser. */
export function buildListPayload(criteria: ListCriteria, page: number): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    page,
    limit: criteria.pageSize,
    ...(criteria.extraPayload ?? {}),
  }
  if (criteria.search.trim()) {
    payload.search = criteria.search.trim()
    if (criteria.searchFields && criteria.searchFields.length > 0) {
      payload.searchFields = criteria.searchFields.join(',')
    }
  }
  if (criteria.sort && criteria.sort.length > 0) payload.sort = JSON.stringify(criteria.sort)
  if (criteria.filters && Object.keys(criteria.filters).length > 0) payload.filters = criteria.filters
  return payload
}

/** Reads a list body in either the translated or the raw nucleus shape. */
export function readListResponse<T>(data: unknown): {
  items: T[]
  hasNext: boolean
  total: number | null
} {
  const body = (data ?? {}) as {
    data?: unknown
    items?: unknown
    pagination?: Record<string, unknown>
    meta?: Record<string, unknown>
  }
  const raw = Array.isArray(body.data) ? body.data : Array.isArray(body.items) ? body.items : []
  const meta = (body.pagination ?? body.meta ?? {}) as {
    hasNext?: boolean
    hasNextPage?: boolean
    total?: number
    totalItems?: number
  }
  return {
    items: raw as T[],
    hasNext: Boolean(meta.hasNext ?? meta.hasNextPage),
    total: (meta.total ?? meta.totalItems ?? null) as number | null,
  }
}

/**
 * Appends a page, dropping rows already held.
 *
 * A row can legitimately arrive twice: page 2 is read after someone inserted a
 * row that shifts the offset, and the boundary row comes back on both pages.
 * Without this the same finding renders twice and React warns about the key.
 */
export function mergePages<T>(prev: T[], next: T[]): T[] {
  const seen = new Set(prev.map(idOf).filter(Boolean))
  return [...prev, ...next.filter((row) => !seen.has(idOf(row)))]
}

/**
 * One server-driven list, for every list screen.
 *
 * Each screen used to fetch `limit: 500` (or 1000) and then filter, search and
 * sort the result in the browser. That is wrong twice over: it moves the whole
 * table across the wire on every visit, and it silently answers from the first
 * 500 rows only — so a search on a customer with 3000 findings quietly misses
 * most of them and the screen looks like it worked.
 *
 * Paging, searching, filtering and ordering all belong to the server, which
 * already supports them (page/limit, search+searchFields, sort, filters), and
 * this hook is the only thing that talks to them. It accumulates pages for
 * infinite scroll and starts over whenever the criteria change.
 */
export function useServerList<T = Record<string, unknown>>({
  action,
  pageSize = 25,
  search = '',
  searchFields,
  sort,
  filters,
  extraPayload,
  enabled = true,
  searchDebounceMs = 300,
}: UseServerListOptions): UseServerListReturn<T> {
  const [rows, setRows] = useState<T[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const pageRef = useRef(1)
  /*
   * A page that was in flight when the criteria changed must not be allowed to
   * land: it would append rows that do not match what the screen now shows.
   * Every response carries the request id it belongs to.
   */
  const requestRef = useRef(0)

  const [debouncedSearch, setDebouncedSearch] = useState(search)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), searchDebounceMs)
    return () => clearTimeout(timer)
  }, [search, searchDebounceMs])

  // Criteria are compared by value; a screen re-rendering must not refetch.
  const criteriaKey = useMemo(
    () =>
      JSON.stringify({
        s: debouncedSearch,
        sf: searchFields ?? null,
        so: sort ?? null,
        f: filters ?? null,
        x: extraPayload ?? null,
        n: pageSize,
      }),
    [debouncedSearch, searchFields, sort, filters, extraPayload, pageSize]
  )

  const buildPayload = useCallback(
    (page: number): Record<string, unknown> => {
      const c = JSON.parse(criteriaKey) as {
        s: string
        sf: string[] | null
        so: SortCondition[] | null
        f: FilterMap | null
        x: Record<string, unknown> | null
        n: number
      }
      return buildListPayload(
        {
          search: c.s,
          searchFields: c.sf,
          sort: c.so,
          filters: c.f,
          extraPayload: c.x,
          pageSize: c.n,
        },
        page
      )
    },
    [criteriaKey]
  )

  const read = useCallback((data: unknown) => readListResponse<T>(data), [])

  const fetchPage = useCallback(
    (page: number, mode: 'replace' | 'append') => {
      if (!action || !enabled) return
      const requestId = ++requestRef.current
      if (mode === 'replace') setIsLoading(true)
      else setIsLoadingMore(true)
      setError(null)

      action.start({
        payload: buildPayload(page),
        onAfterHandle: (data: unknown) => {
          if (requestRef.current !== requestId) return
          const { items, hasNext, total: totalItems } = read(data)
          setRows((prev) => (mode === 'replace' ? items : mergePages(prev, items)))
          setHasMore(hasNext)
          setTotal(totalItems)
          pageRef.current = page
          setIsLoading(false)
          setIsLoadingMore(false)
        },
        onErrorHandle: (err: unknown) => {
          if (requestRef.current !== requestId) return
          setError(err)
          setIsLoading(false)
          setIsLoadingMore(false)
        },
      })
    },
    [action, enabled, buildPayload, read]
  )

  // Any change of criteria starts the list over at page 1.
  useEffect(() => {
    pageRef.current = 1
    fetchPage(1, 'replace')
  }, [fetchPage])

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || isLoadingMore) return
    fetchPage(pageRef.current + 1, 'append')
  }, [hasMore, isLoading, isLoadingMore, fetchPage])

  const reload = useCallback(() => {
    pageRef.current = 1
    fetchPage(1, 'replace')
  }, [fetchPage])

  return { rows, total, hasMore, isLoading, isLoadingMore, error, loadMore, reload }
}
