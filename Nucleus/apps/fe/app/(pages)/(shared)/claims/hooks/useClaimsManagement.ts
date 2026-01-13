import type {
  Create as ClaimCreate,
  ClaimJSON,
  Read as ClaimsRead,
  Update as ClaimUpdate,
} from '@monorepo/db-entities/schemas/default/claim'
import { useEffect, useState } from 'react'
import type { ClaimFormState, ClaimsFiltersState, PaginationInfo } from '../types'

type GenericApiActions = ReturnType<
  typeof import('@/app/_hooks/UseGenericApiStore').useGenericApiActions
>

function buildReadPayload(params: {
  page: number
  limit: number
  search: string
  methodFilter: string
  modeFilter: string
}): ClaimsRead {
  const { page, limit, search, methodFilter, modeFilter } = params
  const trimmedSearch = search.trim()
  const activeFilters: NonNullable<ClaimsRead['filters']> = {}

  if (methodFilter) {
    activeFilters.method = methodFilter as NonNullable<ClaimsRead['filters']>['method']
  }

  if (modeFilter) {
    activeFilters.mode = modeFilter as NonNullable<ClaimsRead['filters']>['mode']
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

export function useClaimsManagement(actions: GenericApiActions, isGod: boolean) {
  const [claims, setClaims] = useState<ClaimJSON[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<ClaimsFiltersState>({
    search: '',
    methodFilter: '',
    modeFilter: '',
    itemsPerPage: 20,
  })
  const [isInitialLoading, setIsInitialLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClaim, setEditingClaim] = useState<ClaimJSON | null>(null)
  const [formState, setFormState] = useState<ClaimFormState>({
    action: '',
    description: '',
    path: '',
    method: 'GET',
    mode: 'exact',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch claims
  useEffect(() => {
    if (!isGod) return

    setIsInitialLoading(true)
    setErrorMessage(null)

    const payload = buildReadPayload({
      page,
      limit: filters.itemsPerPage,
      search: filters.search,
      methodFilter: filters.methodFilter,
      modeFilter: filters.modeFilter,
    })

    actions.GET_CLAIMS?.start({
      payload,
      onAfterHandle: (data?: { data: ClaimJSON[]; pagination: PaginationInfo }) => {
        setIsInitialLoading(false)
        setIsRefreshing(false)
        if (!data) return
        setClaims(data.data)
        setPagination(data.pagination)
      },
      onErrorHandle: (error: unknown) => {
        setIsInitialLoading(false)
        setIsRefreshing(false)
        setErrorMessage(String(error ?? 'Failed to load claims'))
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
      methodFilter: filters.methodFilter,
      modeFilter: filters.modeFilter,
    })

    actions.GET_CLAIMS?.start({
      payload,
      onAfterHandle: (data?: { data: ClaimJSON[]; pagination: PaginationInfo }) => {
        setIsRefreshing(false)
        if (!data) return
        setClaims(data.data)
        setPagination(data.pagination)
      },
      onErrorHandle: (error: unknown) => {
        setIsRefreshing(false)
        setErrorMessage(String(error ?? 'Failed to refresh claims'))
      },
    })
  }

  const openCreateModal = () => {
    setEditingClaim(null)
    setFormState({ action: '', description: '', path: '', method: 'GET', mode: 'exact' })
    setIsModalOpen(true)
  }

  const openEditModal = (claim: ClaimJSON) => {
    setEditingClaim(claim)
    setFormState({
      action: claim.action,
      description: claim.description ?? '',
      path: claim.path,
      method: claim.method,
      mode: claim.mode,
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (isSubmitting) return
    setIsModalOpen(false)
    setEditingClaim(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isGod) return
    if (!formState.action.trim() || !formState.path.trim() || !formState.method) {
      setErrorMessage('Action, path and method are required.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const basePayload: Partial<ClaimCreate> = {
      action: formState.action.trim(),
      description: formState.description.trim() || undefined,
      path: formState.path.trim(),
      method: formState.method,
      mode: formState.mode,
    }

    if (editingClaim) {
      const payload: ClaimUpdate = { _id: editingClaim.id, ...basePayload }
      actions.UPDATE_CLAIM?.start({
        payload,
        onAfterHandle: () => {
          setIsSubmitting(false)
          setIsModalOpen(false)
          handleRefresh()
        },
        onErrorHandle: (error: unknown) => {
          setIsSubmitting(false)
          setErrorMessage(String(error ?? 'Failed to update claim'))
        },
      })
    } else {
      const payload: ClaimCreate = basePayload as ClaimCreate
      actions.ADD_CLAIM?.start({
        payload,
        onAfterHandle: () => {
          setIsSubmitting(false)
          setIsModalOpen(false)
          setPage(1)
          handleRefresh()
        },
        onErrorHandle: (error: unknown) => {
          setIsSubmitting(false)
          setErrorMessage(String(error ?? 'Failed to create claim'))
        },
      })
    }
  }

  const handleDelete = (claim: ClaimJSON) => {
    if (!isGod) return
    const confirmed = window.confirm(`Delete claim "${claim.action}"?`)
    if (!confirmed) return

    const payload = { _id: claim.id }
    setIsRefreshing(true)

    actions.DELETE_CLAIM?.start({
      payload,
      onAfterHandle: () => {
        setIsRefreshing(false)
        handleRefresh()
      },
      onErrorHandle: (error: unknown) => {
        setIsRefreshing(false)
        setErrorMessage(String(error ?? 'Failed to delete claim'))
      },
    })
  }

  const updateFilters = (updates: Partial<ClaimsFiltersState>) => {
    setFilters((prev) => ({ ...prev, ...updates }))
  }

  const updateFormState = (updates: Partial<ClaimFormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }))
  }

  return {
    // State
    claims,
    pagination,
    page,
    filters,
    errorMessage,
    isInitialLoading,
    isRefreshing,
    isModalOpen,
    editingClaim,
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
