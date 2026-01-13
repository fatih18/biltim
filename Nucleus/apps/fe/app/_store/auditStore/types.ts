// Claims enum for authorization

import type { ListReturn } from '@monorepo/db-entities/schemas/default/audit'

export type StoreProps = {
  audits: ListReturn | undefined
  search: string
  page: number
  limit: number
  orderBy: string
  orderDirection: string
  filters: {
    entity_name?: string
    entity_id?: string
    user_id?: string
    operation_type?: string
  }
}

export type StoreMethods = {
  test: () => string
}
