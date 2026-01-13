import type { CalendarMonth, CurrencyCode, MoneyValue, PaymentTerm, Percentage } from './baseTypes'

export type ProjectDetails = {
  id: string
  title: string
  projectDate: string
  currency: CurrencyCode
  exchangeRateToTry: number
  customerName: string | null
  trackInvestment: boolean
  trackInvestments: boolean
}

export type AdditionalCostCategory = 'tax' | 'financing' | 'logistics' | 'operations' | 'other'

export type AdditionalCost = {
  id: string
  label: string
  amount: MoneyValue
  category: AdditionalCostCategory
  isPercentage: boolean
  percentageValue: Percentage | null
}

export type PurchaseTerms = {
  baseCost: MoneyValue
  payment: PaymentTerm
  damgaVergisiIncluded: boolean
  additionalCosts: AdditionalCost[]
}

export type SalesTerms = {
  desiredMargin: Percentage
  overridePrice: MoneyValue | null
  payment: PaymentTerm
}

export type FinancingAssumption = {
  monthlyRate: Percentage
  annualDiscountRate: Percentage
}

export type PricingInputs = {
  project: ProjectDetails
  purchase: PurchaseTerms
  sales: SalesTerms
  financing: FinancingAssumption
}

export type PeriodAllocation = {
  month: CalendarMonth
  amount: MoneyValue
}

export type CalculationRowCategory = 'revenue' | 'expense' | 'summary' | 'tax' | 'result'

export type CalculationRow = {
  id: string
  label: string
  category: CalculationRowCategory
  total: MoneyValue
  periods: PeriodAllocation[]
  percentage: Percentage | null
}

export type PricingSummary = {
  salePrice: MoneyValue
  grossProfit: MoneyValue
  netOperatingProfit: MoneyValue
  ebit: MoneyValue
  ebitMargin: Percentage
  npv: MoneyValue
  npvMargin: Percentage
  taxAmount: MoneyValue
  capitalRequirement: MoneyValue
}

export type PricingDashboardData = {
  rows: CalculationRow[]
  summary: PricingSummary
}
