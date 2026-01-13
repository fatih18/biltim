'use client'
import type { Read, TenantJSON } from '@monorepo/db-entities/schemas/default/tenants'
import { useEffect, useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { useTenantsStore } from '@/app/_store/tenantsStore'
import { Pagination } from '../../(shared)/logs/components/Pagination'
import { TenantsCreateModal } from './components/TenantsCreateModal'
import { TenantsDeleteModal } from './components/TenantsDeleteModal'
import { TenantsDetailsModal } from './components/TenantsDetailsModal'
import { TenantsFilters } from './components/TenantsFilters'
import { TenantsHeader } from './components/TenantsHeader'
import { TenantsTable } from './components/TenantsTable'

export default function TenantsPage() {
  const tenantsStore = useTenantsStore()
  const [showFilters, setShowFilters] = useState(false)
  const actions = useGenericApiActions()
  const getTenantsState = actions.GET_TENANTS?.state
  const createTenantSchemaState = actions.GENERATE_TENANT_SCHEMAS?.state
  const deleteTenantState = actions.DELETE_TENANT?.state

  useEffect(() => {
    const trimmedSearch = tenantsStore.search.trim()
    const activeFilters: NonNullable<Read['filters']> = {}

    if (tenantsStore.filters.subdomain.trim().length > 0) {
      activeFilters.subdomain = tenantsStore.filters.subdomain.trim()
    }

    if (tenantsStore.filters.schemaName.trim().length > 0) {
      activeFilters.schema_name = tenantsStore.filters.schemaName.trim()
    }

    if (tenantsStore.filters.companyName.trim().length > 0) {
      activeFilters.company_name = tenantsStore.filters.companyName.trim()
    }

    if (tenantsStore.filters.godAdminEmail.trim().length > 0) {
      activeFilters.god_admin_email = tenantsStore.filters.godAdminEmail.trim()
    }

    const payload: Read = {
      page: tenantsStore.page,
      limit: tenantsStore.limit,
      search: trimmedSearch.length > 0 ? trimmedSearch : undefined,
      orderBy: tenantsStore.orderBy,
      orderDirection: tenantsStore.orderDirection,
      filters: Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
    }

    actions.GET_TENANTS?.start({
      payload,
      onAfterHandle: (data) => {
        if (!data) return
        tenantsStore.setTenants(data)
      },
      onErrorHandle: (error) => {
        console.error('Failed to fetch tenants:', error)
      },
    })
  }, [
    tenantsStore.page,
    tenantsStore.limit,
    tenantsStore.search,
    tenantsStore.orderBy,
    tenantsStore.orderDirection,
    tenantsStore.filters.subdomain,
    tenantsStore.filters.schemaName,
    tenantsStore.filters.companyName,
    tenantsStore.filters.godAdminEmail,
    tenantsStore.needsRefresh,
  ])

  const paginationInfo = tenantsStore.tenants?.pagination
  const currentPage = paginationInfo?.page ?? tenantsStore.page
  const itemsPerPage = paginationInfo?.limit ?? tenantsStore.limit
  const totalItems = paginationInfo?.total ?? 0
  const totalPages =
    paginationInfo?.totalPages ?? Math.max(Math.ceil(totalItems / itemsPerPage) || 1, 1)
  const startIndex = (currentPage - 1) * itemsPerPage
  const hasPrevious = paginationInfo?.hasPrev ?? currentPage > 1
  const hasNext = paginationInfo?.hasNext ?? currentPage < totalPages

  const selectedTenant =
    tenantsStore.selectedTenantId && tenantsStore.tenants?.data
      ? (tenantsStore.tenants.data.find(
          (tenant) => tenant.id === tenantsStore.selectedTenantId
        ) as TenantJSON & { god_admin_email: string; god_admin_password: string })
      : null

  function handleCreateTenant(payload: {
    companyName: string
    subdomain: string
    schemaName: string
    godAdminEmail: string
    godAdminPassword: string
    taxId?: string
    w9: File | null
  }) {
    if (!payload.w9) {
      console.error('W9 file is required')
      return
    }

    actions.GENERATE_TENANT_SCHEMAS?.start({
      payload: {
        company_name: payload.companyName,
        subdomain: payload.subdomain,
        schema_name: payload.schemaName,
        godmin_email: payload.godAdminEmail,
        godmin_password: payload.godAdminPassword,
        tax_id: payload.taxId || '',
        w9: payload.w9,
      },
      onAfterHandle: () => {
        tenantsStore.setModalVisibility('create', false)
        tenantsStore.setNeedsRefresh(true)
      },
      onErrorHandle: (error) => {
        console.error('Failed to create tenant schema:', error)
      },
    })
  }

  function handleDeleteTenant() {
    if (!tenantsStore.selectedTenantId) return
    actions.DELETE_TENANT?.start({
      payload: { _id: tenantsStore.selectedTenantId },
      onAfterHandle: () => {
        tenantsStore.setModalVisibility('delete', false)
        tenantsStore.setSelectedTenantId(null)
        tenantsStore.setNeedsRefresh(true)
      },
      onErrorHandle: (error) => {
        console.error('Failed to delete tenant:', error)
      },
    })
  }

  function handleRequestDeleteFromDetails() {
    tenantsStore.setModalVisibility('details', false)
    tenantsStore.setModalVisibility('delete', true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <TenantsHeader
          onCreate={() => tenantsStore.setModalVisibility('create', true)}
          onRefresh={() => tenantsStore.setNeedsRefresh(true)}
          isRefreshing={getTenantsState?.isPending ?? false}
        />

        <TenantsFilters
          search={tenantsStore.search}
          onSearchChange={tenantsStore.setSearch}
          filters={tenantsStore.filters}
          onFiltersChange={tenantsStore.setFilters}
          onResetFilters={tenantsStore.resetFilters}
          isFiltersVisible={showFilters}
          onToggleFilters={() => setShowFilters((prev) => !prev)}
        />

        <TenantsTable
          tenants={tenantsStore.tenants}
          onSelectDetails={(tenantId) => {
            tenantsStore.setSelectedTenantId(tenantId)
            tenantsStore.setModalVisibility('details', true)
          }}
        />

        {tenantsStore.tenants && tenantsStore.tenants.data.length > 0 ? (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            startIndex={startIndex}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            onPageChange={tenantsStore.setPage}
            onItemsPerPageChange={tenantsStore.setLimit}
          />
        ) : null}

        <TenantsCreateModal
          isOpen={tenantsStore.modals.create}
          onClose={() => tenantsStore.setModalVisibility('create', false)}
          onSubmit={handleCreateTenant}
          isSubmitting={createTenantSchemaState?.isPending ?? false}
        />

        <TenantsDetailsModal
          tenant={selectedTenant}
          isOpen={tenantsStore.modals.details}
          onClose={() => {
            tenantsStore.setModalVisibility('details', false)
            tenantsStore.setSelectedTenantId(null)
          }}
          onRequestDelete={handleRequestDeleteFromDetails}
          onTenantUpdated={() => tenantsStore.setNeedsRefresh(true)}
        />

        <TenantsDeleteModal
          isOpen={tenantsStore.modals.delete}
          onClose={() => {
            tenantsStore.setModalVisibility('delete', false)
            tenantsStore.setSelectedTenantId(null)
          }}
          onConfirm={handleDeleteTenant}
          isSubmitting={deleteTenantState?.isPending ?? false}
          tenantName={selectedTenant?.subdomain}
        />
      </div>
    </div>
  )
}
