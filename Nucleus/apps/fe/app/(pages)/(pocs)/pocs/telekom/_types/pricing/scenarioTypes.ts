import type { CurrencyCode, MoneyValue, PaymentTerm, Percentage } from './baseTypes'

export type ScenarioKind = 'base' | 'custom' | 'optimized'

export type ScenarioParameters = {
  id: string
  name: string
  kind: ScenarioKind
  purchaseTerm: PaymentTerm
  salesTerm: PaymentTerm
  currency: CurrencyCode
  markup: Percentage
  financeRate: Percentage
  discountRate: Percentage
  isEnabled: boolean
}

export type ScenarioResult = {
  scenarioId: string
  ebit: MoneyValue
  npv: MoneyValue
  margin: Percentage
  ebitMargin: Percentage
  warnings: string[]
}

export type ScenarioComparison = {
  scenarios: ScenarioResult[]
  recommendedScenarioId: string | null
}
