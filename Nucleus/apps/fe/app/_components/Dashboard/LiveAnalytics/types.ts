export interface Proposal {
  id: string
  vendor: string
  rfpTitle: string
  amount: number
  currency: string
  status: 'pending' | 'approved' | 'rejected' | 'under-review'
  score: number
  technicalScore: number
  financialScore: number
  complianceScore: number
  riskLevel: 'low' | 'medium' | 'high'
  deliveryTime: number
  warranty: number
}

export interface FilterState {
  searchTerm: string
  filterStatus: string
  filterRisk: string
}

export interface SortState {
  sortField: keyof Proposal
  sortDirection: 'asc' | 'desc'
}

export interface ProposalFiltersProps {
  searchTerm: string
  setSearchTerm: (term: string) => void
  filterStatus: string
  setFilterStatus: (status: string) => void
  filterRisk: string
  setFilterRisk: (risk: string) => void
  totalProposals: number
  filteredCount: number
}

export interface ProposalTableProps {
  proposals: Proposal[]
  sortField: keyof Proposal
  sortDirection: 'asc' | 'desc'
  onSort: (field: keyof Proposal) => void
  selectedProposals: string[]
  onToggleSelection: (proposalId: string) => void
  onSelectAll: (selectAll: boolean) => void
  editingScore: string | null
  setEditingScore: (id: string | null) => void
  customScores: { [key: string]: number }
  onUpdateScore: (proposalId: string, newScore: number) => void
  onUpdateStatus: (proposalId: string, newStatus: Proposal['status']) => void
  loadingStates: { [key: string]: boolean }
  processingAction: string | null
}

export interface ProposalStatsProps {
  proposals: Proposal[]
}

export interface ProposalComparisonProps {
  selectedProposals: string[]
  proposals: Proposal[]
  onClearSelection: () => void
  onCompare: () => void
}
