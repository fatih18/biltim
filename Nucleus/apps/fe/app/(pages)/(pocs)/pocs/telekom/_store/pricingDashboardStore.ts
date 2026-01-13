import { createStore } from 'h-state'
import type { MethodCreators } from 'h-state/dist/types'
import { cashFlowMonths2025 } from '@/app/(pages)/(pocs)/pocs/telekom/_mocks/pricing/cashFlowMocks'
import {
  defaultHistoryFilters,
  defaultHistorySnapshots,
} from '@/app/(pages)/(pocs)/pocs/telekom/_mocks/pricing/historyMocks'
import {
  defaultMilestoneDistribution,
  defaultMilestoneSettings,
  milestoneTemplates,
} from '@/app/(pages)/(pocs)/pocs/telekom/_mocks/pricing/milestoneMocks'
import { defaultPricingInputs } from '@/app/(pages)/(pocs)/pocs/telekom/_mocks/pricing/pricingInputsMock'
import {
  defaultReportRequest,
  defaultReportSummaries,
  reportResultPlaceholder,
} from '@/app/(pages)/(pocs)/pocs/telekom/_mocks/pricing/reportMocks'
import { defaultScenarioParameters } from '@/app/(pages)/(pocs)/pocs/telekom/_mocks/pricing/scenarioMocks'
import { computePricingAlerts } from '@/app/(pages)/(pocs)/pocs/telekom/_services/pricing/alertEngine'
import {
  buildCashFlowSummary,
  buildCashFlowViews,
} from '@/app/(pages)/(pocs)/pocs/telekom/_services/pricing/cashFlowEngine'
import { calculatePricingDashboard } from '@/app/(pages)/(pocs)/pocs/telekom/_services/pricing/pricingEngine'
import { evaluateScenarioComparison } from '@/app/(pages)/(pocs)/pocs/telekom/_services/pricing/scenarioEngine'
import type {
  AdditionalCost,
  AlertMessage,
  CalendarMonth,
  CashFlowProjectRow,
  CurrencyCode,
  HistoryFilters,
  MilestoneDistribution,
  MilestoneEntry,
  PaymentMode,
  PaymentTerm,
  Percentage,
  PricingDashboardState,
  PricingHistorySnapshot,
  PricingInputs,
  PricingSummary,
  ReportRequest,
  ScenarioParameters,
} from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing'

type PricingDashboardMethods = {
  setActiveTab: (tab: string) => undefined
  setInputs: (newInputs: PricingInputs) => void
  setInputsDefault: () => void
  setSubTab: (tab: string) => undefined
  setSelectedPeriod: (period: 'monthly' | 'quarterly' | 'yearly') => undefined
  setProjectDate: (date: string) => undefined
  setProjectCurrency: (currency: CurrencyCode) => undefined
  setExchangeRate: (rate: number) => undefined
  setCustomerName: (name: string | null) => undefined
  toggleTrackInvestment: (value: boolean) => undefined
  toggleTrackInvestments: (value: boolean) => undefined
  setBaseCost: (cost: number) => undefined
  setPurchasePayment: (mode: PaymentMode, days: number) => undefined
  toggleDamgaVergisi: (value: boolean) => undefined
  addAdditionalCost: (
    payload: Pick<
      AdditionalCost,
      'label' | 'amount' | 'category' | 'isPercentage' | 'percentageValue'
    >
  ) => undefined
  updateAdditionalCost: (id: string, patch: Partial<AdditionalCost>) => undefined
  removeAdditionalCost: (id: string) => undefined
  setDesiredMargin: (margin: Percentage) => undefined
  setOverridePrice: (price: number | null) => undefined
  setSalesPayment: (mode: PaymentMode, days: number) => undefined
  setFinancingRates: (monthly: Percentage, annual: Percentage) => undefined
  setScenarioMarkup: (scenarioId: string, margin: Percentage) => undefined
  setScenarioPayment: (
    scenarioId: string,
    purchaseTerm: PaymentTerm,
    salesTerm: PaymentTerm
  ) => undefined
  toggleScenarioEnabled: (scenarioId: string, enabled: boolean) => undefined
  selectScenario: (scenarioId: string | null) => undefined
  applyMilestoneTemplate: (templateId: keyof typeof milestoneTemplates) => undefined
  updateMilestoneEntry: (entryId: string, patch: Partial<MilestoneEntry>) => undefined
  saveMilestoneDistribution: (name: string) => undefined
  savePricingSnapshot: (name: string, notes: string | null) => undefined
  setHistoryFilters: (patch: Partial<HistoryFilters>) => undefined
  restoreSnapshot: (snapshotId: string) => undefined
  requestReport: (request: ReportRequest) => undefined
  recalculate: () => undefined
}

type PricingDashboardStore = PricingDashboardState & PricingDashboardMethods

function createId(prefix: string): string {
  const random = Math.random().toString(16).slice(2, 10)
  return `${prefix}-${random}`
}

function clampDays(days: number): number {
  if (days < 0) {
    return 0
  }
  if (days > 365) {
    return 365
  }
  return Math.round(days)
}

function clampPercentage(value: number): number {
  if (value < 0) {
    return 0
  }
  if (value > 100) {
    return 100
  }
  return Math.round(value * 100) / 100
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

function dayIndex(days: number): number {
  const index = Math.floor(days / 30)
  if (index < 0) {
    return 0
  }
  if (index > cashFlowMonths2025.length - 1) {
    return cashFlowMonths2025.length - 1
  }
  return index
}

function duplicateMilestoneDistribution(source: MilestoneDistribution): MilestoneDistribution {
  const entries: MilestoneEntry[] = []
  for (const entry of source.entries) {
    entries.push({
      id: entry.id,
      month: { year: entry.month.year, month: entry.month.month },
      percentage: entry.percentage,
      amount: entry.amount,
      isEditable: entry.isEditable,
    })
  }
  return {
    id: source.id,
    templateId: source.templateId,
    totalAmount: source.totalAmount,
    entries: entries,
    isLocked: source.isLocked,
  }
}

function duplicateInputs(source: PricingInputs): PricingInputs {
  const costs: AdditionalCost[] = []
  for (const cost of source.purchase.additionalCosts) {
    costs.push({
      id: cost.id,
      label: cost.label,
      amount: cost.amount,
      category: cost.category,
      isPercentage: cost.isPercentage,
      percentageValue: cost.percentageValue,
    })
  }
  return {
    project: { ...source.project },
    purchase: {
      baseCost: source.purchase.baseCost,
      payment: { ...source.purchase.payment },
      damgaVergisiIncluded: source.purchase.damgaVergisiIncluded,
      additionalCosts: costs,
    },
    sales: {
      desiredMargin: source.sales.desiredMargin,
      overridePrice: source.sales.overridePrice,
      payment: { ...source.sales.payment },
    },
    financing: { ...source.financing },
  }
}

function duplicateScenarioParameters(source: ScenarioParameters[]): ScenarioParameters[] {
  const result: ScenarioParameters[] = []
  for (const scenario of source) {
    result.push({
      id: scenario.id,
      name: scenario.name,
      kind: scenario.kind,
      purchaseTerm: { ...scenario.purchaseTerm },
      salesTerm: { ...scenario.salesTerm },
      currency: scenario.currency,
      markup: scenario.markup,
      financeRate: scenario.financeRate,
      discountRate: scenario.discountRate,
      isEnabled: scenario.isEnabled,
    })
  }
  return result
}

function duplicateSnapshots(source: PricingHistorySnapshot[]): PricingHistorySnapshot[] {
  const snapshots: PricingHistorySnapshot[] = []
  for (const snapshot of source) {
    snapshots.push({ ...snapshot })
  }
  return snapshots
}

function duplicateFilters(source: HistoryFilters): HistoryFilters {
  return { ...source }
}

function duplicateAlerts(source: AlertMessage[]): AlertMessage[] {
  const alerts: AlertMessage[] = []
  for (const alert of source) {
    alerts.push({ ...alert })
  }
  return alerts
}

function buildCashFlowProjection(
  summary: PricingSummary,
  inputs: PricingInputs
): CashFlowProjectRow[] {
  const months = cashFlowMonths2025
  const createSeries = (): number[] => months.map(() => 0)
  const purchaseIndex = dayIndex(inputs.purchase.payment.days)
  const salesIndex = dayIndex(inputs.sales.payment.days)
  const inflowSeries = createSeries()
  const purchaseOutflowSeries = createSeries()
  const financingOutflowSeries = createSeries()
  inflowSeries[salesIndex] = roundCurrency(summary.salePrice)
  const totalCapital = roundCurrency(summary.capitalRequirement)
  purchaseOutflowSeries[purchaseIndex] = totalCapital
  const financingCost = roundCurrency(summary.netOperatingProfit - summary.ebit)
  if (financingCost !== 0) {
    financingOutflowSeries[salesIndex] = Math.abs(financingCost)
  }
  const saleRow: CashFlowProjectRow = {
    projectId: 'cashflow-sale',
    projectName: 'Satış Gelirleri',
    inflows: inflowSeries,
    outflows: createSeries(),
    net: inflowSeries.map((value) => roundCurrency(value)),
  }
  const purchaseRow: CashFlowProjectRow = {
    projectId: 'cashflow-purchase',
    projectName: 'Satın Alma ve Giderler',
    inflows: createSeries(),
    outflows: purchaseOutflowSeries,
    net: purchaseOutflowSeries.map((value) => roundCurrency(-value)),
  }
  const financingRow: CashFlowProjectRow = {
    projectId: 'cashflow-financing',
    projectName: 'Finansman Etkisi',
    inflows: createSeries(),
    outflows: financingOutflowSeries,
    net: financingOutflowSeries.map((value) => roundCurrency(-value)),
  }
  const rows: CashFlowProjectRow[] = [saleRow, purchaseRow]
  if (financingCost !== 0) {
    rows.push(financingRow)
  }
  return rows
}

function createInitialState(): PricingDashboardState {
  const inputs = duplicateInputs(defaultPricingInputs)
  const pricing = calculatePricingDashboard(inputs)
  const scenarioParameters = duplicateScenarioParameters(defaultScenarioParameters)
  const scenarioComparison = evaluateScenarioComparison(inputs, scenarioParameters)
  const cashFlowRows = buildCashFlowProjection(pricing.summary, inputs)
  const cashFlowViews = buildCashFlowViews(
    cashFlowMonths2025,
    cashFlowRows,
    inputs.financing.annualDiscountRate
  )
  const cashFlowSummary = buildCashFlowSummary(
    cashFlowMonths2025,
    cashFlowRows,
    inputs.financing.annualDiscountRate
  )
  return {
    inputs: inputs,
    pricing: pricing,
    cashFlow: {
      views: cashFlowViews,
      summary: cashFlowSummary,
    },
    scenarios: {
      parameters: scenarioParameters,
      comparison: scenarioComparison,
      selectedScenarioId: scenarioComparison.recommendedScenarioId,
    },
    milestones: {
      distribution: duplicateMilestoneDistribution(defaultMilestoneDistribution),
      settings: { ...defaultMilestoneSettings },
    },
    reports: {
      availableSummaries: [...defaultReportSummaries],
      lastRequest: { ...defaultReportRequest },
      lastResult: { ...reportResultPlaceholder },
    },
    history: {
      snapshots: duplicateSnapshots(defaultHistorySnapshots),
      filters: duplicateFilters(defaultHistoryFilters),
    },
    ui: {
      activeTab: 'pricing',
      subTab: 'overview',
      isHistoryPanelOpen: false,
      validationMessages: [],
      alerts: [],
      highlightedRowIds: [],
      lastCalculatedAt: new Date().toISOString(),
      selectedPeriod: 'monthly',
      snapshotFilter: {
        startMonth: null,
        endMonth: null,
        currency: null,
        customerName: null,
      },
    },
  }
}

function assignDerivedState(store: PricingDashboardState): undefined {
  const pricing = calculatePricingDashboard(store.inputs)
  store.pricing = pricing
  const scenarioComparison = evaluateScenarioComparison(store.inputs, store.scenarios.parameters)
  store.scenarios.comparison = scenarioComparison
  if (
    store.scenarios.selectedScenarioId === null &&
    scenarioComparison.recommendedScenarioId !== null
  ) {
    store.scenarios.selectedScenarioId = scenarioComparison.recommendedScenarioId
  }
  const cashFlowRows = buildCashFlowProjection(pricing.summary, store.inputs)
  store.cashFlow.views = buildCashFlowViews(
    cashFlowMonths2025,
    cashFlowRows,
    store.inputs.financing.annualDiscountRate
  )
  store.cashFlow.summary = buildCashFlowSummary(
    cashFlowMonths2025,
    cashFlowRows,
    store.inputs.financing.annualDiscountRate
  )
  const alerts = computePricingAlerts(pricing.summary, store.inputs, scenarioComparison)
  store.ui.alerts = duplicateAlerts(alerts)
  store.ui.lastCalculatedAt = new Date().toISOString()
  store.ui.validationMessages = []
  return undefined
}

const methodCreators: MethodCreators<PricingDashboardState, PricingDashboardMethods> = {
  setActiveTab(store) {
    return (tab: string) => {
      store.ui.activeTab = tab
      return undefined
    }
  },
  setInputs(store) {
    return (newInputs: PricingInputs) => {
      store.inputs = { ...newInputs }
      assignDerivedState(store)
      return undefined
    }
  },
  setInputsDefault() {
    return () => {
      const state = createInitialState()
      assignDerivedState(state)
      return undefined
    }
  },
  setSubTab(store) {
    return (tab: string) => {
      store.ui.subTab = tab
      return undefined
    }
  },
  setSelectedPeriod(store) {
    return (period: 'monthly' | 'quarterly' | 'yearly') => {
      store.ui.selectedPeriod = period
      return undefined
    }
  },
  setProjectDate(store) {
    return (date: string) => {
      store.inputs.project.projectDate = date
      assignDerivedState(store)
      return undefined
    }
  },
  setProjectCurrency(store) {
    return (currency: CurrencyCode) => {
      store.inputs.project.currency = currency
      assignDerivedState(store)
      return undefined
    }
  },
  setExchangeRate(store) {
    return (rate: number) => {
      store.inputs.project.exchangeRateToTry = roundCurrency(rate)
      assignDerivedState(store)
      return undefined
    }
  },
  setCustomerName(store) {
    return (name: string | null) => {
      store.inputs.project.customerName = name
      assignDerivedState(store)
      return undefined
    }
  },
  toggleTrackInvestment(store) {
    return (value: boolean) => {
      store.inputs.project.trackInvestment = value
      assignDerivedState(store)
      return undefined
    }
  },
  toggleTrackInvestments(store) {
    return (value: boolean) => {
      store.inputs.project.trackInvestments = value
      assignDerivedState(store)
      return undefined
    }
  },
  setBaseCost(store) {
    return (cost: number) => {
      store.inputs.purchase.baseCost = roundCurrency(cost)
      assignDerivedState(store)
      return undefined
    }
  },
  setPurchasePayment(store) {
    return (mode: PaymentMode, days: number) => {
      store.inputs.purchase.payment = {
        mode: mode,
        days: clampDays(days),
      }
      assignDerivedState(store)
      return undefined
    }
  },
  toggleDamgaVergisi(store) {
    return (value: boolean) => {
      store.inputs.purchase.damgaVergisiIncluded = value
      assignDerivedState(store)
      return undefined
    }
  },
  addAdditionalCost(store) {
    return (payload) => {
      store.inputs.purchase.additionalCosts.push({
        id: createId('cost'),
        label: payload.label,
        amount: roundCurrency(payload.amount),
        category: payload.category,
        isPercentage: payload.isPercentage,
        percentageValue:
          payload.percentageValue === null ? null : clampPercentage(payload.percentageValue),
      })
      assignDerivedState(store)
      return undefined
    }
  },
  updateAdditionalCost(store) {
    return (id: string, patch: Partial<AdditionalCost>) => {
      for (const cost of store.inputs.purchase.additionalCosts) {
        if (cost.id !== id) {
          continue
        }
        if (patch.label !== undefined) {
          cost.label = patch.label
        }
        if (patch.amount !== undefined) {
          cost.amount = roundCurrency(patch.amount)
        }
        if (patch.category !== undefined) {
          cost.category = patch.category
        }
        if (patch.isPercentage !== undefined) {
          cost.isPercentage = patch.isPercentage
        }
        if (patch.percentageValue !== undefined) {
          cost.percentageValue =
            patch.percentageValue === null ? null : clampPercentage(patch.percentageValue)
        }
      }
      assignDerivedState(store)
      return undefined
    }
  },
  removeAdditionalCost(store) {
    return (id: string) => {
      store.inputs.purchase.additionalCosts = store.inputs.purchase.additionalCosts.filter(
        (cost) => cost.id !== id
      )
      assignDerivedState(store)
      return undefined
    }
  },
  setDesiredMargin(store) {
    return (margin: Percentage) => {
      store.inputs.sales.desiredMargin = clampPercentage(margin)
      assignDerivedState(store)
      return undefined
    }
  },
  setOverridePrice(store) {
    return (price: number | null) => {
      store.inputs.sales.overridePrice = price === null ? null : roundCurrency(price)
      assignDerivedState(store)
      return undefined
    }
  },
  setSalesPayment(store) {
    return (mode: PaymentMode, days: number) => {
      store.inputs.sales.payment = {
        mode: mode,
        days: clampDays(days),
      }
      assignDerivedState(store)
      return undefined
    }
  },
  setFinancingRates(store) {
    return (monthly: Percentage, annual: Percentage) => {
      store.inputs.financing = {
        monthlyRate: clampPercentage(monthly),
        annualDiscountRate: clampPercentage(annual),
      }
      assignDerivedState(store)
      return undefined
    }
  },
  setScenarioMarkup(store) {
    return (scenarioId: string, margin: Percentage) => {
      for (const scenario of store.scenarios.parameters) {
        if (scenario.id !== scenarioId) {
          continue
        }
        scenario.markup = clampPercentage(margin)
      }
      assignDerivedState(store)
      return undefined
    }
  },
  setScenarioPayment(store) {
    return (scenarioId: string, purchaseTerm: PaymentTerm, salesTerm: PaymentTerm) => {
      for (const scenario of store.scenarios.parameters) {
        if (scenario.id !== scenarioId) {
          continue
        }
        scenario.purchaseTerm = {
          mode: purchaseTerm.mode,
          days: clampDays(purchaseTerm.days),
        }
        scenario.salesTerm = {
          mode: salesTerm.mode,
          days: clampDays(salesTerm.days),
        }
      }
      assignDerivedState(store)
      return undefined
    }
  },
  toggleScenarioEnabled(store) {
    return (scenarioId: string, enabled: boolean) => {
      for (const scenario of store.scenarios.parameters) {
        if (scenario.id !== scenarioId) {
          continue
        }
        scenario.isEnabled = enabled
      }
      assignDerivedState(store)
      return undefined
    }
  },
  selectScenario(store) {
    return (scenarioId: string | null) => {
      store.scenarios.selectedScenarioId = scenarioId
      return undefined
    }
  },
  applyMilestoneTemplate(store) {
    return (templateId: keyof typeof milestoneTemplates) => {
      const template = milestoneTemplates[templateId]
      const distribution = store.milestones.distribution
      distribution.templateId = templateId
      if (template.length === 0) {
        return undefined
      }
      const totalAmount = distribution.totalAmount
      const newEntries: MilestoneEntry[] = []
      for (let index = 0; index < template.length; index += 1) {
        const percentage = template[index] ?? 0
        const amount = roundCurrency((percentage / 100) * totalAmount)
        const month: CalendarMonth = {
          year: defaultMilestoneDistribution.entries[0]?.month.year ?? 2025,
          month: ((defaultMilestoneDistribution.entries[0]?.month.month ?? 1) + index) % 12 || 12,
        }
        newEntries.push({
          id: createId('milestone'),
          month: month,
          percentage: percentage,
          amount: amount,
          isEditable: store.milestones.settings.allowManualEdit,
        })
      }
      distribution.entries = newEntries
      return undefined
    }
  },
  updateMilestoneEntry(store) {
    return (entryId: string, patch: Partial<MilestoneEntry>) => {
      const distribution = store.milestones.distribution
      for (const entry of distribution.entries) {
        if (entry.id !== entryId) {
          continue
        }
        if (patch.percentage !== undefined) {
          entry.percentage = clampPercentage(patch.percentage)
        }
        if (patch.amount !== undefined) {
          entry.amount = roundCurrency(patch.amount)
        }
        if (patch.month !== undefined) {
          entry.month = { ...patch.month }
        }
      }
      return undefined
    }
  },
  saveMilestoneDistribution(store) {
    return () => {
      store.milestones.distribution.id = createId('milestone-set')
      return undefined
    }
  },
  savePricingSnapshot(store) {
    return (name: string, notes: string | null) => {
      const snapshot: PricingHistorySnapshot = {
        snapshotId: createId('snapshot'),
        snapshotName: name,
        savedAt: new Date().toISOString(),
        savedBy: 'Mock Kullanıcı',
        currency: store.inputs.project.currency,
        salePrice: store.pricing.summary.salePrice,
        ebitMargin: store.pricing.summary.ebitMargin,
        npvMargin: store.pricing.summary.npvMargin,
        status: 'draft',
        notes: notes,
      }
      store.history.snapshots = [snapshot, ...store.history.snapshots].slice(0, 50)
      return undefined
    }
  },
  setHistoryFilters(store) {
    return (patch: Partial<HistoryFilters>) => {
      store.history.filters = {
        ...store.history.filters,
        ...patch,
      }
      return undefined
    }
  },
  restoreSnapshot(store) {
    return (snapshotId: string) => {
      const snapshot = store.history.snapshots.find((item) => item.snapshotId === snapshotId)
      if (!snapshot) {
        return undefined
      }
      store.inputs.sales.overridePrice = snapshot.salePrice
      assignDerivedState(store)
      return undefined
    }
  },
  requestReport(store) {
    return (request: ReportRequest) => {
      store.reports.lastRequest = { ...request }
      store.reports.lastResult = {
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: 'Mock Kullanıcı',
          reportTitle: request.kind,
        },
        content: 'Rapor içeriği mock olarak oluşturuldu.',
        previewUrl: null,
        dataSize: 256,
        warnings: [],
      }
      return undefined
    }
  },
  recalculate(store) {
    return () => {
      assignDerivedState(store)
      return undefined
    }
  },
}

const initialState = createInitialState()
assignDerivedState(initialState)

const { useStore: usePricingDashboardStore } = createStore<
  PricingDashboardState,
  PricingDashboardMethods
>(initialState, methodCreators)

export type { PricingDashboardStore }
export { usePricingDashboardStore }
