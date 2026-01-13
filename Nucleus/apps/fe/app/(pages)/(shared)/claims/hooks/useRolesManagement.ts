import type {
  Create as RoleCreate,
  RoleJSON,
  Read as RolesRead,
  Update as RoleUpdate,
} from '@monorepo/db-entities/schemas/default/role'
import { useEffect, useState } from 'react'
import type { PaginationInfo } from '../types'

type GenericApiActions = ReturnType<
  typeof import('@/app/_hooks/UseGenericApiStore').useGenericApiActions
>

export type RoleFormState = {
  name: string
  description: string
  is_system: boolean
}

export type RolesFiltersState = {
  search: string
  isSystemFilter: string
  itemsPerPage: number
}

function buildReadPayload(params: {
  page: number
  limit: number
  search: string
  isSystemFilter: string
}): RolesRead {
  const { page, limit, search, isSystemFilter } = params
  const trimmedSearch = search.trim()
  const activeFilters: NonNullable<RolesRead['filters']> = {}

  if (isSystemFilter === 'system') {
    activeFilters.is_system = true
  } else if (isSystemFilter === 'custom') {
    activeFilters.is_system = false
  }

  return {
    page,
    limit,
    search: trimmedSearch.length > 0 ? trimmedSearch : undefined,
    orderBy: 'created_at',
    orderDirection: 'desc',
    filters: Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
  }
}

export function useRolesManagement(actions: GenericApiActions, isGod: boolean) {
  const [roles, setRoles] = useState<RoleJSON[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<RolesFiltersState>({
    search: '',
    isSystemFilter: '',
    itemsPerPage: 20,
  })
  const [isInitialLoading, setIsInitialLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleJSON | null>(null)
  const [formState, setFormState] = useState<RoleFormState>({
    name: '',
    description: '',
    is_system: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch roles
  useEffect(() => {
    if (!isGod) return

    setIsInitialLoading(true)
    setErrorMessage(null)

    const payload = buildReadPayload({
      page,
      limit: filters.itemsPerPage,
      search: filters.search,
      isSystemFilter: filters.isSystemFilter,
    })

    actions.GET_ROLES?.start({
      payload,
      onAfterHandle: (data?: { data: RoleJSON[]; pagination: PaginationInfo }) => {
        setIsInitialLoading(false)
        setIsRefreshing(false)
        if (!data) return
        setRoles(data.data)
        setPagination(data.pagination)
      },
      onErrorHandle: (error: unknown) => {
        setIsInitialLoading(false)
        setIsRefreshing(false)
        setErrorMessage(String(error ?? 'Failed to load roles'))
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGod, page, filters])

  const handleRefresh = () => {
    if (!isGod) return
    setIsRefreshing(true)
    const payload = buildReadPayload({
      page,
      limit: filters.itemsPerPage,
      search: filters.search,
      isSystemFilter: filters.isSystemFilter,
    })

    actions.GET_ROLES?.start({
      payload,
      onAfterHandle: (data?: { data: RoleJSON[]; pagination: PaginationInfo }) => {
        setIsRefreshing(false)
        if (!data) return
        setRoles(data.data)
        setPagination(data.pagination)
      },
      onErrorHandle: (error: unknown) => {
        setIsRefreshing(false)
        setErrorMessage(String(error ?? 'Failed to refresh roles'))
      },
    })
  }

  const openCreateModal = () => {
    setEditingRole(null)
    setFormState({ name: '', description: '', is_system: false })
    setIsModalOpen(true)
  }

  const openEditModal = (role: RoleJSON) => {
    setEditingRole(role)
    setFormState({
      name: role.name,
      description: role.description ?? '',
      is_system: role.is_system,
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (isSubmitting) return
    setIsModalOpen(false)
    setEditingRole(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isGod) return
    if (!formState.name.trim()) {
      setErrorMessage('Role name is required.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const basePayload: Partial<RoleCreate> = {
      name: formState.name.trim(),
      description: formState.description.trim() || undefined,
      is_system: formState.is_system,
    }

    if (editingRole) {
      const payload: RoleUpdate = { _id: editingRole.id, ...basePayload }
      actions.UPDATE_ROLE?.start({
        payload,
        onAfterHandle: () => {
          setIsSubmitting(false)
          setIsModalOpen(false)
          handleRefresh()
        },
        onErrorHandle: (error: unknown) => {
          setIsSubmitting(false)
          setErrorMessage(String(error ?? 'Failed to update role'))
        },
      })
    } else {
      const payload: RoleCreate = basePayload as RoleCreate
      actions.ADD_ROLE?.start({
        payload,
        onAfterHandle: () => {
          setIsSubmitting(false)
          setIsModalOpen(false)
          setPage(1)
          handleRefresh()
        },
        onErrorHandle: (error: unknown) => {
          setIsSubmitting(false)
          setErrorMessage(String(error ?? 'Failed to create role'))
        },
      })
    }
  }

  const handleDelete = (role: RoleJSON) => {
    if (!isGod) return
    const confirmed = window.confirm(`Delete role "${role.name}"?`)
    if (!confirmed) return

    const payload = { _id: role.id }
    setIsRefreshing(true)

    actions.DELETE_ROLE?.start({
      payload,
      onAfterHandle: () => {
        setIsRefreshing(false)
        handleRefresh()
      },
      onErrorHandle: (error: unknown) => {
        setIsRefreshing(false)
        setErrorMessage(String(error ?? 'Failed to delete role'))
      },
    })
  }

  const updateFilters = (updates: Partial<RolesFiltersState>) => {
    setFilters((prev) => ({ ...prev, ...updates }))
  }

  const updateFormState = (updates: Partial<RoleFormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }))
  }

  return {
    // State
    roles,
    pagination,
    page,
    filters,
    errorMessage,
    isInitialLoading,
    isRefreshing,
    isModalOpen,
    editingRole,
    formState,
    isSubmitting,

    // Actions
    setPage,
    updateFilters,
    updateFormState,
    handleRefresh,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    handleDelete,
  }
}
