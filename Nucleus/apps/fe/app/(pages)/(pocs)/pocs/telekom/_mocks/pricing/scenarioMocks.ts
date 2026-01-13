import type {
  ScenarioComparison,
  ScenarioParameters,
  ScenarioResult,
} from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing/scenarioTypes'

function createScenarioParameters(
  id: string,
  name: string,
  kind: ScenarioParameters['kind'],
  markup: number,
  purchaseDays: number,
  salesDays: number
): ScenarioParameters {
  return {
    id: id,
    name: name,
    kind: kind,
    purchaseTerm: {
      mode: purchaseDays === 0 ? 'cash' : 'credit',
      days: purchaseDays,
    },
    salesTerm: {
      mode: salesDays === 0 ? 'cash' : 'credit',
      days: salesDays,
    },
    currency: 'TRY',
    markup: markup,
    financeRate: 1.5,
    discountRate: 18,
    isEnabled: true,
  }
}

function createScenarioResult(
  id: string,
  ebit: number,
  npv: number,
  margin: number,
  ebitMargin: number,
  warnings: string[]
): ScenarioResult {
  return {
    scenarioId: id,
    ebit: ebit,
    npv: npv,
    margin: margin,
    ebitMargin: ebitMargin,
    warnings: warnings,
  }
}

export const defaultScenarioParameters: ScenarioParameters[] = [
  createScenarioParameters('scenario-1', 'Senaryo 1', 'base', 10, 0, 0),
  createScenarioParameters('scenario-2', 'Senaryo 2', 'custom', 9, 0, 60),
  createScenarioParameters('scenario-3', 'Senaryo 3', 'custom', 10, 30, 0),
  createScenarioParameters('scenario-4', 'Senaryo 4', 'optimized', 11, 30, 60),
]

export const defaultScenarioResults: ScenarioResult[] = [
  createScenarioResult('scenario-1', 794, 754, 7.2, 7.2, []),
  createScenarioResult('scenario-2', 635, 544, 5.8, 5.8, ['Satış vadesi uzun']),
  createScenarioResult('scenario-3', 850, 794, 7.7, 7.7, []),
  createScenarioResult('scenario-4', 691, 600, 6.3, 6.3, []),
]

export const defaultScenarioComparison: ScenarioComparison = {
  scenarios: defaultScenarioResults,
  recommendedScenarioId: 'scenario-3',
}
