// ============================================================================
// Vorion Page Types
// ============================================================================

export interface PaginationState {
  currentPage: number
  hasMore: boolean
  isLoadingMore: boolean
  pageSize: number
}

export interface WelcomeSectionProps {
  onShowHistory: () => void
  hasConversations: boolean
}

export interface FeatureItem {
  icon: React.ReactNode
  label: string
  description: string
}
