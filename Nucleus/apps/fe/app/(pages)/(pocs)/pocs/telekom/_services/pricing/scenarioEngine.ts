import type {
  PricingDashboardData,
  PricingInputs,
} from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing/pricingTypes'
import type {
  ScenarioComparison,
  ScenarioParameters,
  ScenarioResult,
} from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing/scenarioTypes'
import { calculatePricingDashboard } from './pricingEngine'

function cloneInputs(inputs: PricingInputs): PricingInputs {
  const clonedAdditionalCosts = [] as PricingInputs['purchase']['additionalCosts']
  for (const cost of inputs.purchase.additionalCosts) {
    clonedAdditionalCosts.push({
      id: cost.id,
      label: cost.label,
      amount: cost.amount,
      category: cost.category,
      isPercentage: cost.isPercentage,
      percentageValue: cost.percentageValue,
    })
  }
  return {
    project: {
      id: inputs.project.id,
      title: inputs.project.title,
      projectDate: inputs.project.projectDate,
      currency: inputs.project.currency,
      exchangeRateToTry: inputs.project.exchangeRateToTry,
      customerName: inputs.project.customerName,
      trackInvestment: inputs.project.trackInvestment,
      trackInvestments: inputs.project.trackInvestments,
    },
    purchase: {
      baseCost: inputs.purchase.baseCost,
      payment: {
        mode: inputs.purchase.payment.mode,
        days: inputs.purchase.payment.days,
      },
      damgaVergisiIncluded: inputs.purchase.damgaVergisiIncluded,
      additionalCosts: clonedAdditionalCosts,
    },
    sales: {
      desiredMargin: inputs.sales.desiredMargin,
      overridePrice: inputs.sales.overridePrice,
      payment: {
        mode: inputs.sales.payment.mode,
        days: inputs.sales.payment.days,
      },
    },
    financing: {
      monthlyRate: inputs.financing.monthlyRate,
      annualDiscountRate: inputs.financing.annualDiscountRate,
    },
  }
}

function applyScenarioToInputs(
  baseInputs: PricingInputs,
  scenario: ScenarioParameters
): PricingInputs {
  const nextInputs = cloneInputs(baseInputs)
  nextInputs.sales.desiredMargin = scenario.markup
  nextInputs.purchase.payment = {
    mode: scenario.purchaseTerm.mode,
    days: scenario.purchaseTerm.days,
  }
  nextInputs.sales.payment = {
    mode: scenario.salesTerm.mode,
    days: scenario.salesTerm.days,
  }
  nextInputs.financing = {
    monthlyRate: scenario.financeRate,
    annualDiscountRate: scenario.discountRate,
  }
  nextInputs.project.currency = scenario.currency
  return nextInputs
}

function deriveMargin(summary: PricingDashboardData['summary']): number {
  if (summary.salePrice === 0) {
    return 0
  }
  return Math.round((summary.grossProfit / summary.salePrice) * 100 * 100) / 100
}

function buildWarnings(
  result: PricingDashboardData['summary'],
  scenario: ScenarioParameters
): string[] {
  const warnings: string[] = []
  if (scenario.purchaseTerm.days > scenario.salesTerm.days) {
    warnings.push('Alış vadesi satış vadesinden uzun')
  }
  if (result.ebitMargin < 5) {
    warnings.push("EBIT %5'in altında")
  }
  if (result.npv < 0) {
    warnings.push('NPV negatife düştü')
  }
  return warnings
}

function evaluateScenario(baseInputs: PricingInputs, scenario: ScenarioParameters): ScenarioResult {
  const inputsForScenario = applyScenarioToInputs(baseInputs, scenario)
  const dashboard = calculatePricingDashboard(inputsForScenario)
  return {
    scenarioId: scenario.id,
    ebit: dashboard.summary.ebit,
    npv: dashboard.summary.npv,
    margin: deriveMargin(dashboard.summary),
    ebitMargin: dashboard.summary.ebitMargin,
    warnings: buildWarnings(dashboard.summary, scenario),
  }
}

export function evaluateScenarioComparison(
  baseInputs: PricingInputs,
  parameters: ScenarioParameters[]
): ScenarioComparison {
  const results: ScenarioResult[] = []
  for (const scenario of parameters) {
    if (!scenario.isEnabled) {
      continue
    }
    results.push(evaluateScenario(baseInputs, scenario))
  }
  let recommendedId: string | null = null
  let bestNpv = Number.NEGATIVE_INFINITY
  for (const result of results) {
    if (result.npv > bestNpv) {
      bestNpv = result.npv
      recommendedId = result.scenarioId
    }
  }
  return {
    scenarios: results,
    recommendedScenarioId: recommendedId,
  }
}
