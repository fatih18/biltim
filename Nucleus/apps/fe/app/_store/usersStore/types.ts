import type {
  ClaimJSON,
  ListReturn as ClaimListReturn,
} from '@monorepo/db-entities/schemas/default/claim'
import type { ListReturn, Read, UserJSON } from '@monorepo/db-entities/schemas/default/user'
import type { OrderDirection } from '@monorepo/db-entities/types/shared'

export type StoreProps = {
  users: ListReturn | undefined
  search: string
  page: number
  limit: number
  orderBy: NonNullable<Read['orderBy']>
  orderDirection: OrderDirection
  filters: {
    status: '' | 'active' | 'inactive'
    locked: '' | 'locked' | 'unlocked'
  }
  needsRefresh: boolean
  modals: {
    create: boolean
    validateEmail: boolean
    details: boolean
    delete: boolean
    manageClaims: boolean
  }
  selectedUserId: string | null
  claimModal: {
    search: string
    page: number
    limit: number
    hasNext: boolean
    claims: ClaimJSON[]
    isLoading: boolean
    isLoadingMore: boolean
    assignedClaimIds: string[]
    pendingClaimIds: string[]
    assignmentMap: Record<string, string>
  }
}

export type StoreMethods = {
  setUsers: (users: ListReturn | undefined) => void
  setSearch: (search: string) => void
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setOrder: (orderBy: NonNullable<Read['orderBy']>, orderDirection: OrderDirection) => void
  setFilters: (filters: StoreProps['filters']) => void
  resetFilters: () => void
  setNeedsRefresh: (needsRefresh: boolean) => void
  mergeUser: (user: UserJSON | UserJSON) => void
  removeUser: (userId: string) => void
  setModalVisibility: (modal: keyof StoreProps['modals'], value: boolean) => void
  setSelectedUserId: (userId: string | null) => void
  resetClaimModal: (payload: {
    assignedClaimIds: string[]
    assignmentMap: Record<string, string>
  }) => void
  setClaimModalSearch: (search: string) => void
  setClaimModalLoading: (isLoading: boolean) => void
  setClaimModalLoadingMore: (isLoadingMore: boolean) => void
  setClaimModalResults: (payload: {
    claims: ClaimListReturn['data']
    hasNext: ClaimListReturn['pagination']['hasNext']
    page: ClaimListReturn['pagination']['page']
    append?: boolean
  }) => void
  setClaimModalAssignedIds: (ids: string[]) => void
  addClaimModalAssignedId: (id: string) => void
  removeClaimModalAssignedId: (id: string) => void
  addClaimModalPendingId: (id: string) => void
  removeClaimModalPendingId: (id: string) => void
  clearClaimModalPendingIds: () => void
  setClaimModalAssignment: (claimId: string, assignmentId: string) => void
  removeClaimModalAssignment: (claimId: string) => void
}
