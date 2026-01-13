import type { ListReturn, Read, TenantJSON } from '@monorepo/db-entities/schemas/default/tenants'
import type { OrderDirection } from '@monorepo/db-entities/types/shared'

export type TenantsFilters = {
  subdomain: string
  schemaName: string
  companyName: string
  godAdminEmail: string
}

export type StoreProps = {
  tenants: ListReturn | undefined
  search: string
  page: number
  limit: number
  orderBy: NonNullable<Read['orderBy']>
  orderDirection: OrderDirection
  filters: TenantsFilters
  needsRefresh: boolean
  modals: {
    create: boolean
    edit: boolean
    delete: boolean
    details: boolean
  }
  selectedTenantId: string | null
}

export type StoreMethods = {
  setTenants: (tenants: ListReturn | undefined) => void
  setSearch: (search: string) => void
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setOrder: (orderBy: NonNullable<Read['orderBy']>, orderDirection: OrderDirection) => void
  setFilters: (filters: TenantsFilters) => void
  resetFilters: () => void
  setNeedsRefresh: (needsRefresh: boolean) => void
  setModalVisibility: (modal: keyof StoreProps['modals'], value: boolean) => void
  setSelectedTenantId: (tenantId: string | null) => void
  addTenant: (tenant: TenantJSON) => void
  updateTenant: (tenant: TenantJSON) => void
  removeTenant: (tenantId: string) => void
}
