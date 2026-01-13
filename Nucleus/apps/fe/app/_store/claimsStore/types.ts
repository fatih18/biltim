// Claims enum for authorization

import type { ClaimJSON, ListReturn, Read } from '@monorepo/db-entities/schemas/default/claim'
import type { OrderDirection } from '@monorepo/db-entities/types/shared'

export type StoreProps = {
  claims: ListReturn | undefined
  search: string
  page: number
  limit: number
  orderBy: NonNullable<Read['orderBy']>
  orderDirection: OrderDirection
  filters: {
    action: string
    path: string
    method: string
    mode: string
    is_active: '' | 'true' | 'false'
  }
  draft: {
    modeOptions: ClaimJSON['mode'][]
  }
}

export type StoreMethods = {
  setSearch: (search: string) => void
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setOrder: (orderBy: NonNullable<Read['orderBy']>, orderDirection: OrderDirection) => void
  setFilters: (filters: StoreProps['filters']) => void
  resetFilters: () => void
}
