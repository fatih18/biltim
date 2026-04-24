'use client'

import type { AuditJSON, Read } from '@monorepo/db-entities/schemas/default/audit'
import { useEffect, useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
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
        auditStore.audits = data
      },
      onErrorHandle: (error) => {
        console.log('error', error)
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
        auditStore.audits = data
      },
      onErrorHandle: (error) => {
        console.log('error', error)
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
        auditStore.audits = data
      },
      onErrorHandle: (error) => {
        console.log('error', error)
      },
    })
  }

  const errorMessage = actions.GET_AUDIT_LOGS?.state?.errors
  const showInitialLoader = actions.GET_AUDIT_LOGS?.state?.isPending

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
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
          <div className="bg-white border border-red-200 text-red-700 rounded-xl shadow-lg p-6">
            {errorMessage}
          </div>
        )}

        {showInitialLoader ? (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-center gap-3 py-12 text-gray-600">
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
              Loglar yükleniyor...
            </div>
          </div>
        ) : (
          <LogsTable logs={logs} onLogSelect={setSelectedLog} />
        )}

        {auditStore.audits && totalItems > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            startIndex={startIndex}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleLimitChange}
          />
        )}

        <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      </div>
    </div>
  )
}
