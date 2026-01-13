'use client'

import type { Create as CreateUserPayload } from '@monorepo/db-entities/schemas/default/user'
import { useEffect, useMemo, useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { useUsersStore } from '@/app/_store/usersStore'
import type { StoreProps } from '@/app/_store/usersStore/types'
import { Pagination } from '../logs/components/Pagination'
import { UsersCreateModal } from './components/UsersCreateModal'
import { UsersDeleteModal } from './components/UsersDeleteModal'
import { UsersDetailsDrawer } from './components/UsersDetailsDrawer'
import { UsersFilters } from './components/UsersFilters'
import { UsersHeader } from './components/UsersHeader'
import { UsersTable } from './components/UsersTable'
import { UsersValidateModal } from './components/UsersValidateModal'

export default function UsersPage() {
  const actions = useGenericApiActions()

  const usersStore = useUsersStore()
  const refreshPending = usersStore.needsRefresh
  const [areFiltersVisible, setFiltersVisible] = useState(false)

  const hasUsers = usersStore.users && usersStore.users.data.length > 0

  const selectedUser = useMemo(() => {
    if (!usersStore.selectedUserId || !usersStore.users) {
      return undefined
    }
    return usersStore.users.data.find((user) => user.id === usersStore.selectedUserId)
  }, [usersStore.users, usersStore.selectedUserId])

  useEffect(() => {
    actions.GET_USERS?.start({
      onAfterHandle: (data) => {
        if (!data) return
        usersStore.users = data
      },
      onErrorHandle: (error) => {
        console.error('Get users failed:', error)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const payload = {
      page: usersStore.page,
      limit: usersStore.limit,
      search: usersStore.search.length > 0 ? usersStore.search : undefined,
      orderBy: usersStore.orderBy,
      orderDirection: usersStore.orderDirection,
      filters: buildFilters(usersStore.filters),
    }

    actions.GET_USERS?.start({
      payload,
      onAfterHandle: (data) => {
        if (!data) return
        usersStore.users = data
      },
      onErrorHandle: (error) => {
        console.error('Get users failed:', error)
      },
    })

    usersStore.setNeedsRefresh(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    usersStore.page,
    usersStore.limit,
    usersStore.search,
    usersStore.orderBy,
    usersStore.orderDirection,
    usersStore.filters.status,
    usersStore.filters.locked,
    usersStore.needsRefresh,
  ])

  function handleCreate(payload: {
    email: string
    password: string
    firstName: string
    lastName: string
    roleIds: string[]
  }) {
    const requestPayload: CreateUserPayload = {
      email: payload.email,
      password: payload.password,
      is_god: false,
    }

    actions.ADD_USER?.start({
      payload: requestPayload,
      onAfterHandle: (createdUser) => {
        if (!createdUser) return

        actions.ADD_PROFILE?.start({
          payload: {
            user_id: createdUser.id,
            first_name: payload.firstName,
            last_name: payload.lastName,
          },
          onErrorHandle: (error) => {
            console.error('Add profile failed:', error)
          },
        })

        if (payload.roleIds && payload.roleIds.length > 0) {
          payload.roleIds.forEach((roleId) => {
            actions.ADD_USER_ROLE?.start({
              payload: {
                user_id: createdUser.id,
                role_id: roleId,
              },
              onErrorHandle: (error) => {
                console.error(`Add user role failed for role ${roleId}:`, error)
              },
            })
          })
        }

        usersStore.setNeedsRefresh(true)
        usersStore.setModalVisibility('create', false)
        usersStore.setSelectedUserId(null)
      },
      onErrorHandle: (error) => {
        console.error('Add user failed:', error)
      },
    })
  }

  function handleValidateEmail() {
    if (!usersStore.selectedUserId) return

    actions.VERIFY_USER?.start({
      payload: { _id: usersStore.selectedUserId },
      onAfterHandle: (data) => {
        if (!data) return
        usersStore.mergeUser(data)
        usersStore.setNeedsRefresh(true)
        usersStore.setModalVisibility('validateEmail', false)
        usersStore.setSelectedUserId(null)
      },
      onErrorHandle: (error) => {
        console.error('Verify user failed:', error)
      },
    })
  }

  function handleOpenValidateModal(userId: string) {
    usersStore.setSelectedUserId(userId)
    usersStore.setModalVisibility('validateEmail', true)
  }

  function handleCloseValidateModal() {
    usersStore.setModalVisibility('validateEmail', false)
    usersStore.setSelectedUserId(null)
  }

  function handleDeleteUser() {
    if (!usersStore.selectedUserId) return

    actions.DELETE_USER?.start({
      payload: { _id: usersStore.selectedUserId },
      onAfterHandle: (data) => {
        if (!data) return
        usersStore.removeUser(data.id)
        usersStore.setNeedsRefresh(true)
        usersStore.setModalVisibility('delete', false)
        usersStore.setSelectedUserId(null)
      },
      onErrorHandle: (error) => {
        console.error('Delete user failed:', error)
      },
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page shell panel (isteğe bağlı, tutarlılık için) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 md:p-6 shadow-xl shadow-slate-950/60">
          <div className="space-y-6">
            <UsersHeader
              onCreate={() => usersStore.setModalVisibility('create', true)}
              onRefresh={() => usersStore.setNeedsRefresh(true)}
              isRefreshing={Boolean(refreshPending)}
            />

            <UsersFilters
              search={usersStore.search}
              onSearchChange={(value) => usersStore.setSearch(value)}
              filters={usersStore.filters}
              onFiltersChange={(nextFilters) => usersStore.setFilters(nextFilters)}
              onResetFilters={() => usersStore.resetFilters()}
              isFiltersVisible={areFiltersVisible}
              onToggleFilters={() => setFiltersVisible((prev) => !prev)}
            />

            <UsersTable
              users={usersStore.users}
              onSelectDetails={(userId) => {
                usersStore.setSelectedUserId(userId)
                usersStore.setModalVisibility('details', true)
              }}
              onValidateEmail={handleOpenValidateModal}
              onDelete={(userId) => {
                usersStore.setSelectedUserId(userId)
                usersStore.setModalVisibility('delete', true)
              }}
            />

            {hasUsers ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <Pagination
                  currentPage={usersStore.users?.pagination.page ?? usersStore.page}
                  totalPages={usersStore.users?.pagination.totalPages ?? 1}
                  itemsPerPage={usersStore.limit}
                  totalItems={usersStore.users?.pagination.total ?? 0}
                  startIndex={
                    ((usersStore.users?.pagination.page ?? usersStore.page) - 1) * usersStore.limit
                  }
                  hasPrevious={usersStore.users?.pagination.hasPrev ?? usersStore.page > 1}
                  hasNext={usersStore.users?.pagination.hasNext ?? false}
                  onPageChange={(page) => usersStore.setPage(page)}
                  onItemsPerPageChange={(limit) => usersStore.setLimit(limit)}
                />
              </div>
            ) : null}
          </div>
        </div>

        <UsersCreateModal
          isOpen={usersStore.modals.create}
          onClose={() => usersStore.setModalVisibility('create', false)}
          onSubmit={handleCreate}
          isSubmitting={Boolean(actions.ADD_USER?.state?.isPending)}
        />


        <UsersDeleteModal
          isOpen={usersStore.modals.delete}
          userEmail={selectedUser?.email || ''}
          onConfirm={handleDeleteUser}
          onClose={() => usersStore.setModalVisibility('delete', false)}
          isSubmitting={Boolean(actions.DELETE_USER?.state?.isPending)}
        />

        <UsersDetailsDrawer
          isOpen={usersStore.modals.details}
          user={selectedUser}
          onClose={() => {
            usersStore.setModalVisibility('details', false)
            usersStore.setSelectedUserId(null)
          }}
        />
      </div>
    </div>
  )
}

function buildFilters(filters: StoreProps['filters']) {
  const result: Record<string, unknown> = {}
  if (filters.status === 'active') result.is_active = true
  else if (filters.status === 'inactive') result.is_active = false

  if (filters.locked === 'locked') result.is_locked = true
  else if (filters.locked === 'unlocked') result.is_locked = false

  return Object.keys(result).length > 0 ? result : undefined
}
