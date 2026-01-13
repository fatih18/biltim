'use client'

import { createStore } from 'h-state'
import type { MethodCreators } from 'h-state/dist/types'
import type { StoreMethods, StoreProps } from './types'

const defaultFilters: StoreProps['filters'] = {
  action: '',
  path: '',
  method: '',
  mode: '',
  is_active: '',
}

const storeMethodCreators: MethodCreators<StoreProps, StoreMethods> = {
  setSearch: (store) => {
    return (search) => {
      store.search = search
      store.page = 1
    }
  },
  setPage: (store) => {
    return (page) => {
      store.page = page
    }
  },
  setLimit: (store) => {
    return (limit) => {
      store.limit = limit
      store.page = 1
    }
  },
  setOrder: (store) => {
    return (orderBy, orderDirection) => {
      store.orderBy = orderBy
      store.orderDirection = orderDirection
    }
  },
  setFilters: (store) => {
    return (filters) => {
      store.filters = filters
      store.page = 1
    }
  },
  resetFilters: (store) => {
    return () => {
      store.filters = { ...defaultFilters }
      store.page = 1
    }
  },
}

const initialStore: StoreProps = {
  claims: undefined,
  search: '',
  page: 1,
  limit: 10,
  orderBy: 'created_at',
  orderDirection: 'desc',
  filters: { ...defaultFilters },
  draft: {
    modeOptions: ['exact', 'startsWith'],
  },
}

const { useStore } = createStore<StoreProps, StoreMethods>(initialStore, storeMethodCreators)

export { useStore as useClaimsStore }
