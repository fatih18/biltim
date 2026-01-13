import type { ClaimJSON } from '@monorepo/db-entities/schemas/default/claim'

export type ClaimFormState = {
  action: string
  description: string
  path: string
  method: string
  mode: 'exact' | 'startsWith'
}

export type PaginationInfo = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export type ClaimsFiltersState = {
  search: string
  methodFilter: string
  modeFilter: string
  itemsPerPage: number
}

export type ClaimModalProps = {
  isOpen: boolean
  editingClaim: ClaimJSON | null
  formState: ClaimFormState
  isSubmitting: boolean
  methods: string[]
  modes: readonly ('exact' | 'startsWith')[]
  onClose: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onFormChange: (updates: Partial<ClaimFormState>) => void
}

export type ClaimsTableProps = {
  claims: ClaimJSON[]
  isLoading: boolean
  onEdit: (claim: ClaimJSON) => void
  onDelete: (claim: ClaimJSON) => void
}

export type ClaimsFiltersProps = {
  filters: ClaimsFiltersState
  methods: string[]
  modes: readonly ('exact' | 'startsWith')[]
  errorMessage: string | null
  onChange: (updates: Partial<ClaimsFiltersState>) => void
  onPageChange: (page: number) => void
}

export type ClaimsPaginationProps = {
  pagination: PaginationInfo | undefined
  currentCount: number
  onPageChange: (page: number) => void
}
