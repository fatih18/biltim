import type { AlertSeverity } from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing/baseTypes'
import type {
  PricingInputs,
  PricingSummary,
} from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing/pricingTypes'
import type { ScenarioComparison } from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing/scenarioTypes'
import type { AlertMessage } from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing/uiTypes'

function createId(counter: { value: number }): string {
  counter.value += 1
  return `alert-${counter.value}`
}

function createAlert(
  counter: { value: number },
  severity: AlertSeverity,
  title: string,
  description: string
): AlertMessage {
  return {
    id: createId(counter),
    severity: severity,
    title: title,
    description: description,
  }
}

function checkPaymentMismatch(
  counter: { value: number },
  inputs: PricingInputs,
  alerts: AlertMessage[]
): void {
  if (inputs.purchase.payment.days > inputs.sales.payment.days) {
    alerts.push(
      createAlert(
        counter,
        'critical',
        'Nakit açığı riski',
        'Alış vadesi satış vadesinden uzun. Nakit açığı oluşabilir.'
      )
    )
  }
}

function checkLowProfitability(
  counter: { value: number },
  summary: PricingSummary,
  alerts: AlertMessage[]
): void {
  if (summary.ebitMargin < 5) {
    alerts.push(
      createAlert(
        counter,
        'warning',
        'Düşük karlılık',
        "EBIT marjı %5'in altında. Kar marjını gözden geçirin."
      )
    )
  }
}

function checkNegativeNpv(
  counter: { value: number },
  summary: PricingSummary,
  alerts: AlertMessage[]
): void {
  if (summary.npv < 0) {
    alerts.push(
      createAlert(
        counter,
        'critical',
        'Negatif NPV',
        'İskonto edilmiş net nakit değeri negatif. Proje zarar edebilir.'
      )
    )
  }
}

function checkSaleBelowCost(
  counter: { value: number },
  summary: PricingSummary,
  _inputs: PricingInputs,
  alerts: AlertMessage[]
): void {
  const totalCost = summary.capitalRequirement
  if (summary.salePrice < totalCost) {
    alerts.push(
      createAlert(
        counter,
        'warning',
        'Satış fiyatı maliyetin altında',
        'Satış fiyatı toplam maliyetleri karşılamıyor.'
      )
    )
  }
}

function checkScenarioWarnings(
  counter: { value: number },
  comparison: ScenarioComparison | null,
  alerts: AlertMessage[]
): void {
  if (comparison === null) {
    return
  }
  for (const scenario of comparison.scenarios) {
    for (const warning of scenario.warnings) {
      alerts.push(createAlert(counter, 'info', `Senaryo uyarısı (${scenario.scenarioId})`, warning))
    }
  }
}

export function computePricingAlerts(
  summary: PricingSummary,
  inputs: PricingInputs,
  comparison: ScenarioComparison | null
): AlertMessage[] {
  const counter = { value: 0 }
  const alerts: AlertMessage[] = []
  checkPaymentMismatch(counter, inputs, alerts)
  checkLowProfitability(counter, summary, alerts)
  checkNegativeNpv(counter, summary, alerts)
  checkSaleBelowCost(counter, summary, inputs, alerts)
  checkScenarioWarnings(counter, comparison, alerts)
  return alerts
}
