'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { Create as CreateUserPayload } from '@monorepo/db-entities/schemas/default/user'
import { useStore } from '@store/globalStore'
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
// import { UsersValidateModal } from './components/UsersValidateModal' // dosyada kullanılmıyor, istersen geri aç

export default function UsersPage() {
  const actions = useGenericApiActions()
  const store = useStore()

  const usersStore = useUsersStore()
  const [areFiltersVisible, setFiltersVisible] = useState(false)

  // GET_USERS'i aynı anda 2 kez tetiklemeyi önlemek için
  const isFetchingRef = useRef(false)

  const hasUsers = usersStore.users && usersStore.users.data.length > 0

  const selectedUser = useMemo(() => {
    if (!usersStore.selectedUserId || !usersStore.users) return undefined
    return usersStore.users.data.find((u) => u.id === usersStore.selectedUserId)
  }, [usersStore.users, usersStore.selectedUserId])

  // Tek bir effect: page/limit/search/order/filters/needsRefresh ile listeyi getir
  useEffect(() => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

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
        if (data) usersStore.users = data
        usersStore.setNeedsRefresh(false)
        isFetchingRef.current = false
      },
      onErrorHandle: (error) => {
        console.error('Get users failed:', error)
        usersStore.setNeedsRefresh(false)
        isFetchingRef.current = false
        window.alert(getErrorMessage(error) || 'Kullanıcı listesi getirilemedi.')
      },
    })

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

  async function handleCreate(payload: {
    email: string
    password: string
    firstName: string
    lastName: string
    roleIds: string[]
  }) {
    return await new Promise<void>((resolve) => {
      const requestPayload: CreateUserPayload = {
        email: payload.email,
        password: payload.password,
        is_god: false,
      }

      actions.ADD_USER?.start({
        payload: requestPayload,
        onAfterHandle: (createdUser) => {
          if (!createdUser) {
            resolve()
            return
          }

          // Profile
          actions.ADD_PROFILE?.start({
            payload: {
              user_id: createdUser.id,
              first_name: payload.firstName,
              last_name: payload.lastName,
            },
            onErrorHandle: (error) => {
              console.error('Add profile failed:', error)
              window.alert('Kullanıcı profili oluşturulamadı.')
            },
          })

          // Roles
          if (payload.roleIds && payload.roleIds.length > 0) {
            payload.roleIds.forEach((roleId) => {
              actions.ADD_USER_ROLE?.start({
                payload: { user_id: createdUser.id, role_id: roleId },
                onErrorHandle: (error) => {
                  console.error(`Add user role failed for role ${roleId}:`, error)
                  window.alert('Rol eklenemedi.')
                },
              })
            })
          }

          usersStore.setNeedsRefresh(true)
          usersStore.setModalVisibility('create', false)
          usersStore.setSelectedUserId(null)
          resolve()
        },
        onErrorHandle: (error) => {
          console.error('Add user failed:', error)

          if (isDuplicateEmailError(error)) {
            window.alert('Aynı mail adresiyle iki kere kayıt yapılamaz.')
            resolve()
            return
          }

          const msg = (getErrorMessage(error) || '').toLowerCase()
          if (
            msg.includes('fetch failed') ||
            msg.includes('econnrefused') ||
            msg.includes('network') ||
            msg.includes('failed to fetch')
          ) {
            window.alert('Kullanıcı oluşturulamadı.')
            resolve()
            return
          }

          window.alert(getErrorMessage(error) || 'Kullanıcı oluşturulamadı.')
          resolve()
        },
      })
    })
  }

  function handleDeleteUser() {
    if (!usersStore.selectedUserId) return
    const userIdToDelete = usersStore.selectedUserId

    // ✅ FE tarafında kendini silmeyi engelle
    const meId = (store as any)?.user?.id
    if (meId && userIdToDelete === meId) {
      window.alert('Kendi hesabını silemezsin. Başka bir admin ile silmeyi dene.')
      usersStore.setModalVisibility('delete', false)
      usersStore.setSelectedUserId(null)
      return
    }

    const startDelete = (attempt: number) => {
      actions.DELETE_USER?.start({
        payload: { _id: userIdToDelete },
        onAfterHandle: (data) => {
          if (!data) return

          // optimistik kaldır
          usersStore.removeUser(data.id)

          // modal/selection state temizle
          usersStore.setModalVisibility('delete', false)
          usersStore.setSelectedUserId(null)

          // listeyi kesin güncelle
          usersStore.setNeedsRefresh(true)
        },
        onErrorHandle: (error) => {
          console.error('Delete user failed:', error)

          // 401/403 ise 1 kere retry
          if (attempt === 0 && isAuthRefreshLikely(error)) {
            startDelete(1)
            return
          }

          const msg = getErrorMessage(error)

          // ✅ UI state toparla (sayfa düşmesin / loader takılmasın)
          usersStore.setModalVisibility('delete', false)
          usersStore.setSelectedUserId(null)

          window.alert(msg || 'Kullanıcı silinemedi.')
        },
      })
    }

    startDelete(0)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 md:p-6 shadow-xl shadow-slate-950/60">
          <div className="space-y-6">
            <UsersHeader
              onCreate={() => usersStore.setModalVisibility('create', true)}
              onRefresh={() => usersStore.setNeedsRefresh(true)}
              isRefreshing={
                Boolean(usersStore.needsRefresh) ||
                Boolean(actions.GET_USERS?.state?.isPending)
              }
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
              onValidateEmail={(userId) => {
                usersStore.setSelectedUserId(userId)
                usersStore.setModalVisibility('validateEmail', true)
              }}
              onDelete={(userId) => {
                const meId = (store as any)?.user?.id
                if (meId && userId === meId) {
                  window.alert('Kendi hesabını silemezsin.')
                  return
                }
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
                    ((usersStore.users?.pagination.page ?? usersStore.page) - 1) *
                    usersStore.limit
                  }
                  hasPrevious={
                    usersStore.users?.pagination.hasPrev ?? usersStore.page > 1
                  }
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
          onClose={() => {
            usersStore.setModalVisibility('delete', false)
            usersStore.setSelectedUserId(null)
          }}
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

        {/*
          UsersValidateModal kullanıyorsan:
          <UsersValidateModal
            isOpen={usersStore.modals.validateEmail}
            userEmail={selectedUser?.email || ''}
            onConfirm={handleValidateEmail}
            onClose={handleCloseValidateModal}
            isSubmitting={Boolean(actions.VERIFY_USER?.state?.isPending)}
          />
        */}
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

function getErrorMessage(error: unknown): string | '' {
  if (!error) return ''
  if (typeof error === 'string') return error

  if (typeof error === 'object') {
    const anyErr = error as any

    if (typeof anyErr.message === 'string') return anyErr.message
    if (typeof anyErr.error === 'string') return anyErr.error

    const respMsg = anyErr?.response?.data?.message
    if (typeof respMsg === 'string') return respMsg

    const firstNested =
      anyErr?.errors?.[0]?.message ||
      anyErr?.response?.data?.errors?.[0]?.message ||
      anyErr?.data?.errors?.[0]?.message

    if (typeof firstNested === 'string') return firstNested

    const status = anyErr?.status ?? anyErr?.response?.status
    if (status) return `Hata: ${status}`
  }

  try {
    return JSON.stringify(error)
  } catch {
    return ''
  }
}

function getStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const e: any = error
  return e?.status ?? e?.response?.status ?? e?.response?.data?.status ?? e?.data?.status
}

function getBackendCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const e: any = error
  return (
    e?.code ??
    e?.response?.data?.code ??
    e?.response?.data?.errorCode ??
    e?.response?.data?.error?.code
  )
}

function isAuthRefreshLikely(error: unknown): boolean {
  const status = getStatus(error)
  if (status === 401 || status === 403) return true

  const msg = (getErrorMessage(error) || '').toLowerCase()
  return (
    msg.includes('unauthorized') ||
    msg.includes('jwt') ||
    msg.includes('token') ||
    msg.includes('expired') ||
    msg.includes('refresh')
  )
}

function isDuplicateEmailError(error: unknown): boolean {
  const status = getStatus(error)
  const code = (getBackendCode(error) || '').toLowerCase()
  const msg = (getErrorMessage(error) || '').toLowerCase()

  // ideal: backend 409 / 422 döndürür
  if (status === 409 || status === 422) {
    if (
      msg.includes('email') &&
      (msg.includes('already') || msg.includes('exists') || msg.includes('unique') || msg.includes('duplicate'))
    ) return true

    if (code.includes('unique') || code.includes('duplicate') || code.includes('email_exists')) return true
  }

  // backend yanlışlıkla 500 dönse bile unique violation ipuçlarını yakala
  if (status === 500 || status === 400) {
    if (code === '23505' || msg.includes('23505')) return true // postgres unique_violation
    if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('already exists')) return true
    if (msg.includes('email') && (msg.includes('mevcut') || msg.includes('kayıt') || msg.includes('registered')))
      return true
  }

  // sadece mesajdan (fallback)
  if (
    msg.includes('email') &&
    (msg.includes('already') ||
      msg.includes('exists') ||
      msg.includes('unique') ||
      msg.includes('duplicate') ||
      msg.includes('constraint') ||
      msg.includes('violates') ||
      msg.includes('registered') ||
      msg.includes('kayıt') ||
      msg.includes('mevcut'))
  ) {
    return true
  }

  return false
}
