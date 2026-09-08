'use client'
import { type ActorLookup, SYSTEM_ACTOR_ID } from './labels'
import { InfiniteScroll } from '@/app/_components/Global/InfiniteScroll'
import { toast } from 'sonner'

import type { AuditJSON, Read } from '@monorepo/db-entities/schemas/default/audit'
import { useEffect, useMemo, useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseNucleusApi'
import { useAuditStore } from '@/app/_store'
import { LogDetailModal } from './components/LogDetailModal'
import { LogsHeader } from './components/LogsHeader'
import { LogsTable } from './components/LogsTable'
import { Pagination } from './components/Pagination'
import { SearchAndFilters, type SearchFilters } from './components/SearchAndFilters'

export default function LogsPage() {
  const auditStore = useAuditStore()
  const actions = useGenericApiActions()
  const [selectedLog, setSelectedLog] = useState<AuditJSON | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    actions.GET_AUDIT_LOGS?.start({
      payload: buildPayload(),
      onAfterHandle: (data) => {
        if (!data) {
          return
        }
        // Page 1 replaces (a changed filter or a refresh); later pages extend,
        // because the list scrolls rather than turning pages now.
        const incoming = data as NonNullable<typeof auditStore.audits>
        const previous = auditStore.audits
        const isFirstPage = (incoming.pagination?.page ?? 1) <= 1
        auditStore.audits =
          isFirstPage || !previous
            ? incoming
            : {
                ...incoming,
                data: [
                  ...previous.data,
                  ...incoming.data.filter(
                    (row) => !previous.data.some((held) => held.id === row.id)
                  ),
                ],
              }
      },
      onErrorHandle: (error) => {
        // This swallowed the failure into console.log: the list stayed as it
        // was and the screen said nothing, so a log that could not be READ
        // looked like a log with nothing IN it.
        console.error('GET_AUDIT_LOGS error', error)
        toast.error('Denetim logları yüklenirken bir hata oluştu.')
      },
    })
  }, [])

  function buildPayload(): Read {
    const trimmedSearch = auditStore.search.trim()
    const activeFilters: NonNullable<Read['filters']> = {}

    if (auditStore.filters.entity_name?.trim()) {
      activeFilters.entity_name = auditStore.filters.entity_name.trim()
    }

    if (auditStore.filters.operation_type?.trim()) {
      activeFilters.operation_type = auditStore.filters.operation_type.trim()
    }

    if (auditStore.filters.user_id?.trim()) {
      activeFilters.user_id = auditStore.filters.user_id.trim()
    }

    if (auditStore.filters.entity_id?.trim()) {
      activeFilters.entity_id = auditStore.filters.entity_id.trim()
    }

    return {
      page: auditStore.page,
      limit: auditStore.limit,
      search: trimmedSearch.length > 0 ? trimmedSearch : undefined,
      orderBy: (auditStore.orderBy || 'created_at') as Read['orderBy'],
      orderDirection: (auditStore.orderDirection || 'desc') as Read['orderDirection'],
      filters: Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
    }
  }

  useEffect(() => {
    const payload = buildPayload()
    actions.GET_AUDIT_LOGS?.start({
      payload,
      onAfterHandle: (data) => {
        if (!data) {
          return
        }
        // Page 1 replaces (a changed filter or a refresh); later pages extend,
        // because the list scrolls rather than turning pages now.
        const incoming = data as NonNullable<typeof auditStore.audits>
        const previous = auditStore.audits
        const isFirstPage = (incoming.pagination?.page ?? 1) <= 1
        auditStore.audits =
          isFirstPage || !previous
            ? incoming
            : {
                ...incoming,
                data: [
                  ...previous.data,
                  ...incoming.data.filter(
                    (row) => !previous.data.some((held) => held.id === row.id)
                  ),
                ],
              }
      },
      onErrorHandle: (error) => {
        // This swallowed the failure into console.log: the list stayed as it
        // was and the screen said nothing, so a log that could not be READ
        // looked like a log with nothing IN it.
        console.error('GET_AUDIT_LOGS error', error)
        toast.error('Denetim logları yüklenirken bir hata oluştu.')
      },
    })
  }, [
    auditStore.page,
    auditStore.limit,
    auditStore.orderBy,
    auditStore.orderDirection,
    auditStore.search,
    auditStore.filters.entity_name,
    auditStore.filters.entity_id,
    auditStore.filters.operation_type,
    auditStore.filters.user_id,
  ])

  const logs = auditStore.audits?.data ?? []

  /*
   * The log records an actor id and nothing else — no name, no email, and
   * user_id carries no foreign key to users, so the server cannot expand it.
   * Roughly three rows in four name no person at all (the zero uuid), so only
   * the real ids are worth asking about: they are collected from the rows on
   * screen and fetched once, not one request per row.
   */
  const actorIds = useMemo(() => {
    const ids = new Set<string>()
    for (const log of logs) {
      const id = log.user_id
      if (id && id !== SYSTEM_ACTOR_ID) ids.add(String(id))
    }
    return [...ids].sort()
  }, [logs])

  const actorKey = actorIds.join(',')
  const [actors, setActors] = useState<ActorLookup>(new Map())

  useEffect(() => {
    if (!actorKey) return
    const wanted = actorKey.split(',')
    const missing = wanted.filter((id: string) => !actors.has(id))
    if (missing.length === 0) return

    actions.GET_USERS?.start({
      payload: { page: 1, limit: missing.length, filters: { id: missing } },
      onAfterHandle: (data) => {
        const rows = ((data as { data?: unknown })?.data ?? []) as Array<{
          id?: string
          email?: string
          profile?: { first_name?: string | null; last_name?: string | null } | null
        }>
        setActors((prev) => {
          const next = new Map(prev)
          for (const row of rows) {
            if (!row?.id) continue
            const name = [row.profile?.first_name, row.profile?.last_name]
              .filter(Boolean)
              .join(' ')
              .trim()
            next.set(String(row.id), { name, email: row.email ?? null })
          }
          // Anything still unanswered is an id whose user is gone; remembering
          // that stops this asking again on every page of results.
          for (const id of missing) if (!next.has(id)) next.set(id, {})
          return next
        })
      },
      onErrorHandle: (error) => {
        console.error('audit actor lookup failed', error)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorKey])
  const paginationInfo = auditStore.audits?.pagination

  const currentPage = paginationInfo?.page ?? auditStore.page
  const itemsPerPage = paginationInfo?.limit ?? auditStore.limit
  const totalItems = paginationInfo?.total ?? 0
  const totalPages =
    paginationInfo?.totalPages ?? Math.max(Math.ceil(totalItems / itemsPerPage) || 1, 1)
  const startIndex = (currentPage - 1) * itemsPerPage
  const hasPrevious = paginationInfo?.hasPrev ?? currentPage > 1
  const hasNext = paginationInfo?.hasNext ?? currentPage < totalPages

  const searchTerm = auditStore.search
  const filterValues: SearchFilters = {
    entity_name: auditStore.filters.entity_name ?? '',
    operation_type: auditStore.filters.operation_type ?? '',
    user_id: auditStore.filters.user_id ?? '',
    entity_id: auditStore.filters.entity_id ?? '',
  }

  function handleSearch(value: string) {
    auditStore.search = value
    auditStore.page = 1
  }

  function handleFilterChange<Key extends keyof SearchFilters>(key: Key, value: string) {
    const trimmed = value.trim()
    const nextFilters = { ...auditStore.filters }

    if (trimmed.length > 0) {
      nextFilters[key] = trimmed
    } else {
      delete nextFilters[key]
    }

    auditStore.filters = nextFilters
    auditStore.page = 1
  }

  function handlePageChange(newPage: number) {
    if (newPage >= 1 && newPage !== auditStore.page) {
      auditStore.page = newPage
    }
  }

  function handleLimitChange(newLimit: number) {
    if (newLimit !== auditStore.limit) {
      auditStore.limit = newLimit
      auditStore.page = 1
    }
  }

  function handleRefresh() {
    const payload = buildPayload()
    actions.GET_AUDIT_LOGS?.start({
      payload,
      onAfterHandle: (data) => {
        if (!data) {
          return
        }
        // Page 1 replaces (a changed filter or a refresh); later pages extend,
        // because the list scrolls rather than turning pages now.
        const incoming = data as NonNullable<typeof auditStore.audits>
        const previous = auditStore.audits
        const isFirstPage = (incoming.pagination?.page ?? 1) <= 1
        auditStore.audits =
          isFirstPage || !previous
            ? incoming
            : {
                ...incoming,
                data: [
                  ...previous.data,
                  ...incoming.data.filter(
                    (row) => !previous.data.some((held) => held.id === row.id)
                  ),
                ],
              }
      },
      onErrorHandle: (error) => {
        // This swallowed the failure into console.log: the list stayed as it
        // was and the screen said nothing, so a log that could not be READ
        // looked like a log with nothing IN it.
        console.error('GET_AUDIT_LOGS error', error)
        toast.error('Denetim logları yüklenirken bir hata oluştu.')
      },
    })
  }

  const errorMessage = actions.GET_AUDIT_LOGS?.state?.error?.message
  const showInitialLoader = actions.GET_AUDIT_LOGS?.state?.isPending

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 dark:from-slate-900 to-slate-100 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <LogsHeader onRefresh={handleRefresh} isLoading={showInitialLoader} />

        <SearchAndFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearch}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          filters={filterValues}
          onFilterChange={handleFilterChange}
        />

        {errorMessage && (
          <div className="bg-white dark:bg-slate-900 border border-red-200 text-red-700 rounded-xl shadow-lg p-6">
            {errorMessage}
          </div>
        )}

        {showInitialLoader ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-center gap-3 py-12 text-gray-600">
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
              Loglar yükleniyor...
            </div>
          </div>
        ) : (
          <LogsTable logs={logs} onLogSelect={setSelectedLog} users={actors} />
        )}

        {auditStore.audits && totalItems > 0 && (
          <InfiniteScroll
            hasMore={hasNext}
            isLoadingMore={Boolean(actions.GET_AUDIT_LOGS?.state?.isPending)}
            onLoadMore={() => handlePageChange(currentPage + 1)}
            endLabel={`${totalItems} kaydın tamamı gösteriliyor`}
          />
        )}

        <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      </div>
    </div>
  )
}
