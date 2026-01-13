import type { CurrencyCode, MoneyValue, Percentage } from './baseTypes'

export type HistoryEntryStatus = 'draft' | 'approved' | 'cancelled'

export type PricingHistorySnapshot = {
  snapshotId: string
  snapshotName: string
  savedAt: string
  savedBy: string
  currency: CurrencyCode
  salePrice: MoneyValue
  ebitMargin: Percentage
  npvMargin: Percentage
  status: HistoryEntryStatus
  notes: string | null
}

export type HistoryFilters = {
  currency: CurrencyCode | 'ALL'
  status: HistoryEntryStatus | 'ALL'
  fromDate: string | null
  toDate: string | null
  minimumMargin: Percentage | null
}
