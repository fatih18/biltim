import type { CalendarMonth, CalendarPeriod, MoneyValue, Percentage } from './baseTypes'

export type CashFlowEntryType = 'inflow' | 'outflow'

export type CashFlowEntry = {
  id: string
  label: string
  entryType: CashFlowEntryType
  periodAmounts: CashFlowPeriodAmount[]
  total: MoneyValue
}

export type CashFlowPeriodAmount = {
  month: CalendarMonth
  amount: MoneyValue
}

export type CashFlowView = {
  period: CalendarPeriod
  months: CalendarMonth[]
  table: CashFlowTable
}

export type CashFlowTable = {
  projects: CashFlowProjectRow[]
  monthlyNet: MoneyValue[]
  cumulative: MoneyValue[]
  total: MoneyValue
}

export type CashFlowProjectRow = {
  projectId: string
  projectName: string
  inflows: MoneyValue[]
  outflows: MoneyValue[]
  net: MoneyValue[]
}

export type CashFlowSummary = {
  totalInflows: MoneyValue
  totalOutflows: MoneyValue
  totalNet: MoneyValue
  peakDeficit: MoneyValue
  paybackMonth: CalendarMonth | null
  discountedNetPresentValue: MoneyValue
  discountRate: Percentage
}
