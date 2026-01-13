import type { CashFlowSummary, CashFlowView } from './cashFlowTypes'
import type { HistoryFilters, PricingHistorySnapshot } from './historyTypes'
import type { MilestoneDistribution, MilestoneSettings } from './milestoneTypes'
import type { PricingDashboardData, PricingInputs } from './pricingTypes'
import type { ReportRequest, ReportResult, ReportSummary } from './reportTypes'
import type { ScenarioComparison, ScenarioParameters } from './scenarioTypes'
import type { UiState } from './uiTypes'

export type ScenarioState = {
  parameters: ScenarioParameters[]
  comparison: ScenarioComparison
  selectedScenarioId: string | null
}

export type CashFlowState = {
  views: CashFlowView[]
  summary: CashFlowSummary
}

export type MilestoneState = {
  distribution: MilestoneDistribution
  settings: MilestoneSettings
}

export type ReportState = {
  availableSummaries: ReportSummary[]
  lastRequest: ReportRequest | null
  lastResult: ReportResult | null
}

export type HistoryState = {
  snapshots: PricingHistorySnapshot[]
  filters: HistoryFilters
}

export type PricingDashboardState = {
  inputs: PricingInputs
  pricing: PricingDashboardData
  cashFlow: CashFlowState
  scenarios: ScenarioState
  milestones: MilestoneState
  reports: ReportState
  history: HistoryState
  ui: UiState
}
