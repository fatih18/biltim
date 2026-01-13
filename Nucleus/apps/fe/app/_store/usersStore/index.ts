'use client'

import type { ListReturn as ClaimListReturn } from '@monorepo/db-entities/schemas/default/claim'
import type { ListReturn, Read, UserJSON } from '@monorepo/db-entities/schemas/default/user'
import type { OrderDirection } from '@monorepo/db-entities/types/shared'
import { createStore } from 'h-state'
import type { MethodCreators } from 'h-state/dist/types'
import type { StoreMethods, StoreProps } from './types'

const defaultFilters: StoreProps['filters'] = {
  status: '',
  locked: '',
}

const defaultClaimModalState: StoreProps['claimModal'] = {
  search: '',
  page: 1,
  limit: 10,
  hasNext: true,
  claims: [],
  isLoading: false,
  isLoadingMore: false,
  assignedClaimIds: [],
  pendingClaimIds: [],
  assignmentMap: {},
}

const storeMethodCreators: MethodCreators<StoreProps, StoreMethods> = {
  setUsers(store) {
    function setUsersAction(users: ListReturn | undefined) {
      store.users = users
      store.needsRefresh = false
      if (users) {
        store.page = users.pagination.page
        store.limit = users.pagination.limit
        if (store.selectedUserId) {
          const exists = users.data.some((user) => user.id === store.selectedUserId)
          if (!exists) {
            store.selectedUserId = null
          }
        }
      } else {
        store.selectedUserId = null
      }
    }
    return setUsersAction
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
    function setFiltersAction(filters: StoreProps['filters']) {
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
  mergeUser(store) {
    function mergeUserAction(user: UserJSON | UserJSON) {
      if (!store.users) {
        store.needsRefresh = true
        return
      }
      const existingIndex = store.users.data.findIndex(function findUser(existing) {
        return existing.id === user.id
      })
      if (existingIndex === -1) {
        store.needsRefresh = true
      } else {
        store.users = {
          ...store.users,
          data: store.users.data.map(function mapUser(existing) {
            if (existing.id !== user.id) {
              return existing
            }
            return {
              ...existing,
              ...user,
              profile: 'profile' in user && user.profile ? user.profile : existing.profile,
              address:
                'address' in user && Array.isArray(user.address) ? user.address : existing.address,
              phone: 'phone' in user && Array.isArray(user.phone) ? user.phone : existing.phone,
              files: 'files' in user && Array.isArray(user.files) ? user.files : existing.files,
            }
          }),
        }
      }
    }
    return mergeUserAction
  },
  removeUser(store) {
    function removeUserAction(userId: string) {
      if (!store.users) {
        return
      }
      store.users = {
        ...store.users,
        data: store.users.data.filter(function filterUser(existing) {
          return existing.id !== userId
        }),
        pagination: {
          ...store.users.pagination,
          total: Math.max(store.users.pagination.total - 1, 0),
          hasNext: store.users.pagination.hasNext,
          hasPrev: store.users.pagination.hasPrev,
        },
      }
    }
    return removeUserAction
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
  setSelectedUserId(store) {
    function setSelectedUserIdAction(userId: string | null) {
      store.selectedUserId = userId
    }
    return setSelectedUserIdAction
  },
  resetClaimModal(store) {
    function resetClaimModalAction(payload: {
      assignedClaimIds: string[]
      assignmentMap: Record<string, string>
    }) {
      store.claimModal = {
        ...defaultClaimModalState,
        assignedClaimIds: [...payload.assignedClaimIds],
        assignmentMap: { ...payload.assignmentMap },
      }
    }
    return resetClaimModalAction
  },
  setClaimModalSearch(store) {
    function setClaimModalSearchAction(search: string) {
      store.claimModal = {
        ...store.claimModal,
        search,
        page: 1,
      }
    }
    return setClaimModalSearchAction
  },
  setClaimModalLoading(store) {
    function setClaimModalLoadingAction(isLoading: boolean) {
      store.claimModal = {
        ...store.claimModal,
        isLoading,
      }
    }
    return setClaimModalLoadingAction
  },
  setClaimModalLoadingMore(store) {
    function setClaimModalLoadingMoreAction(isLoadingMore: boolean) {
      store.claimModal = {
        ...store.claimModal,
        isLoadingMore,
      }
    }
    return setClaimModalLoadingMoreAction
  },
  setClaimModalResults(store) {
    function setClaimModalResultsAction(payload: {
      claims: ClaimListReturn['data']
      hasNext: ClaimListReturn['pagination']['hasNext']
      page: ClaimListReturn['pagination']['page']
      append?: boolean
    }) {
      const nextClaims = payload.append
        ? [...store.claimModal.claims, ...payload.claims]
        : [...payload.claims]

      const nextAssignmentMap = { ...store.claimModal.assignmentMap }
      for (const claim of payload.claims) {
        const relationId = (claim as unknown as { relation?: { id?: string } }).relation?.id
        if (relationId) {
          nextAssignmentMap[claim.id] = relationId
        }
      }

      store.claimModal = {
        ...store.claimModal,
        claims: nextClaims,
        hasNext: payload.hasNext,
        page: payload.page,
        assignmentMap: nextAssignmentMap,
      }
    }
    return setClaimModalResultsAction
  },
  setClaimModalAssignment(store) {
    function setClaimModalAssignmentAction(claimId: string, assignmentId: string) {
      store.claimModal = {
        ...store.claimModal,
        assignmentMap: {
          ...store.claimModal.assignmentMap,
          [claimId]: assignmentId,
        },
      }
    }
    return setClaimModalAssignmentAction
  },
  removeClaimModalAssignment(store) {
    function removeClaimModalAssignmentAction(claimId: string) {
      if (!(claimId in store.claimModal.assignmentMap)) {
        return
      }

      const { [claimId]: _removed, ...rest } = store.claimModal.assignmentMap
      store.claimModal = {
        ...store.claimModal,
        assignmentMap: rest,
      }
    }
    return removeClaimModalAssignmentAction
  },
  setClaimModalAssignedIds(store) {
    function setClaimModalAssignedIdsAction(ids: string[]) {
      store.claimModal = {
        ...store.claimModal,
        assignedClaimIds: [...ids],
      }
    }
    return setClaimModalAssignedIdsAction
  },
  addClaimModalAssignedId(store) {
    function addClaimModalAssignedIdAction(id: string) {
      if (store.claimModal.assignedClaimIds.includes(id)) {
        return
      }

      store.claimModal = {
        ...store.claimModal,
        assignedClaimIds: [...store.claimModal.assignedClaimIds, id],
      }
    }
    return addClaimModalAssignedIdAction
  },
  removeClaimModalAssignedId(store) {
    function removeClaimModalAssignedIdAction(id: string) {
      if (!store.claimModal.assignedClaimIds.includes(id)) {
        return
      }

      store.claimModal = {
        ...store.claimModal,
        assignedClaimIds: store.claimModal.assignedClaimIds.filter(
          (existingId) => existingId !== id
        ),
      }
    }
    return removeClaimModalAssignedIdAction
  },
  addClaimModalPendingId(store) {
    function addClaimModalPendingIdAction(id: string) {
      if (store.claimModal.pendingClaimIds.includes(id)) {
        return
      }

      store.claimModal = {
        ...store.claimModal,
        pendingClaimIds: [...store.claimModal.pendingClaimIds, id],
      }
    }
    return addClaimModalPendingIdAction
  },
  removeClaimModalPendingId(store) {
    function removeClaimModalPendingIdAction(id: string) {
      if (!store.claimModal.pendingClaimIds.includes(id)) {
        return
      }

      store.claimModal = {
        ...store.claimModal,
        pendingClaimIds: store.claimModal.pendingClaimIds.filter((existingId) => existingId !== id),
      }
    }
    return removeClaimModalPendingIdAction
  },
  clearClaimModalPendingIds(store) {
    function clearClaimModalPendingIdsAction() {
      store.claimModal = {
        ...store.claimModal,
        pendingClaimIds: [],
      }
    }
    return clearClaimModalPendingIdsAction
  },
}

const initialStore: StoreProps = {
  users: undefined,
  search: '',
  page: 1,
  limit: 10,
  orderBy: 'created_at',
  orderDirection: 'desc',
  filters: { ...defaultFilters },
  needsRefresh: false,
  modals: {
    create: false,
    validateEmail: false,
    details: false,
    delete: false,
    manageClaims: false,
  },
  selectedUserId: null,
  claimModal: { ...defaultClaimModalState },
}

const { useStore } = createStore<StoreProps, StoreMethods>(initialStore, storeMethodCreators)

export { useStore as useUsersStore }
