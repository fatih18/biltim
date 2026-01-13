'use client'

import type { ListReturn, Read } from '@monorepo/db-entities/schemas/default/tenants'
import type { OrderDirection } from '@monorepo/db-entities/types/shared'
import { createStore } from 'h-state'
import type { MethodCreators } from 'h-state/dist/types'
import type { StoreMethods, StoreProps, TenantsFilters } from './types'

const defaultFilters: TenantsFilters = {
  subdomain: '',
  schemaName: '',
  companyName: '',
  godAdminEmail: '',
}

const initialStore: StoreProps = {
  tenants: undefined,
  search: '',
  page: 1,
  limit: 10,
  orderBy: 'created_at',
  orderDirection: 'desc',
  filters: { ...defaultFilters },
  needsRefresh: false,
  modals: {
    create: false,
    edit: false,
    delete: false,
    details: false,
  },
  selectedTenantId: null,
}

const storeMethodCreators: MethodCreators<StoreProps, StoreMethods> = {
  setTenants(store) {
    function setTenantsAction(tenants: ListReturn | undefined) {
      store.tenants = tenants
      store.needsRefresh = false
      if (tenants) {
        store.page = tenants.pagination.page
        store.limit = tenants.pagination.limit
        if (store.selectedTenantId) {
          const exists = tenants.data.some((tenant) => tenant.id === store.selectedTenantId)
          if (!exists) {
            store.selectedTenantId = null
          }
        }
      } else {
        store.selectedTenantId = null
      }
    }
    return setTenantsAction
  },
  setSearch(store) {
    function setSearchAction(search: string) {
      store.search = search
      store.page = 1
    }
    return setSearchAction
  },
  setPage(store) {
    function setPageAction(page: number) {
      store.page = page
    }
    return setPageAction
  },
  setLimit(store) {
    function setLimitAction(limit: number) {
      store.limit = limit
      store.page = 1
    }
    return setLimitAction
  },
  setOrder(store) {
    function setOrderAction(orderBy: NonNullable<Read['orderBy']>, orderDirection: OrderDirection) {
      store.orderBy = orderBy
      store.orderDirection = orderDirection
      store.page = 1
    }
    return setOrderAction
  },
  setFilters(store) {
    function setFiltersAction(filters: TenantsFilters) {
      store.filters = filters
      store.page = 1
    }
    return setFiltersAction
  },
  resetFilters(store) {
    function resetFiltersAction() {
      store.filters = { ...defaultFilters }
      store.page = 1
    }
    return resetFiltersAction
  },
  setNeedsRefresh(store) {
    function setNeedsRefreshAction(needsRefresh: boolean) {
      store.needsRefresh = needsRefresh
    }
    return setNeedsRefreshAction
  },
  setModalVisibility(store) {
    function setModalVisibilityAction(modal: keyof StoreProps['modals'], value: boolean) {
      store.modals = {
        ...store.modals,
        [modal]: value,
      }
    }
    return setModalVisibilityAction
  },
  setSelectedTenantId(store) {
    function setSelectedTenantIdAction(tenantId: string | null) {
      store.selectedTenantId = tenantId
    }
    return setSelectedTenantIdAction
  },
  addTenant(store) {
    function addTenantAction(tenant: ListReturn['data'][number]) {
      if (!store.tenants) {
        store.tenants = {
          data: [tenant],
          pagination: {
            page: 1,
            limit: store.limit,
            total: 1,
            totalPages: 1,
            hasPrev: false,
            hasNext: false,
          },
        }
        return
      }

      store.tenants = {
        ...store.tenants,
        data: [tenant, ...store.tenants.data],
        pagination: {
          ...store.tenants.pagination,
          total: store.tenants.pagination.total + 1,
        },
      }
    }
    return addTenantAction
  },
  updateTenant(store) {
    function updateTenantAction(tenant: ListReturn['data'][number]) {
      if (!store.tenants) {
        store.needsRefresh = true
        return
      }

      const exists = store.tenants.data.some((existing) => existing.id === tenant.id)
      if (!exists) {
        store.needsRefresh = true
        return
      }

      store.tenants = {
        ...store.tenants,
        data: store.tenants.data.map((existing) => (existing.id === tenant.id ? tenant : existing)),
      }
    }
    return updateTenantAction
  },
  removeTenant(store) {
    function removeTenantAction(tenantId: string) {
      if (!store.tenants) {
        return
      }
      store.tenants = {
        ...store.tenants,
        data: store.tenants.data.filter((tenant) => tenant.id !== tenantId),
        pagination: {
          ...store.tenants.pagination,
          total: Math.max(store.tenants.pagination.total - 1, 0),
        },
      }
    }
    return removeTenantAction
  },
}

const { useStore } = createStore<StoreProps, StoreMethods>(initialStore, storeMethodCreators)

export { useStore as useTenantsStore }
