import type { AlertSeverity, CalendarMonth } from './baseTypes'

export type ValidationField =
  | 'projectDate'
  | 'currency'
  | 'baseCost'
  | 'desiredMargin'
  | 'purchasePaymentDays'
  | 'salesPaymentDays'
  | 'financingRates'
  | 'hakEdisDistribution'
  | 'reporting'
  | 'scenario'

export type ValidationMessage = {
  field: ValidationField
  message: string
}

export type AlertMessage = {
  id: string
  severity: AlertSeverity
  title: string
  description: string
}

export type UiState = {
  activeTab: string
  subTab: string
  isHistoryPanelOpen: boolean
  validationMessages: ValidationMessage[]
  alerts: AlertMessage[]
  highlightedRowIds: string[]
  lastCalculatedAt: string
  selectedPeriod: 'monthly' | 'quarterly' | 'yearly'
  snapshotFilter: SnapshotFilter
}

export type SnapshotFilter = {
  startMonth: CalendarMonth | null
  endMonth: CalendarMonth | null
  currency: string | null
  customerName: string | null
}
