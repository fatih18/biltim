'use client'

import { createStore } from 'h-state'
import type { MethodCreators } from 'h-state/dist/types'
import type { StoreMethods, StoreProps } from './types'

const storeMethodCreators: MethodCreators<StoreProps, StoreMethods> = {
  test: (_store: StoreProps) => {
    return () => {
      return 'test'
    }
  },
}

const initialStore: StoreProps = {
  audits: undefined,
  search: '',
  page: 1,
  limit: 10,
  orderBy: 'timestamp',
  orderDirection: 'desc',
  filters: {},
}

const { useStore } = createStore<StoreProps, StoreMethods>(initialStore, storeMethodCreators)

export { useStore as useAuditStore }
