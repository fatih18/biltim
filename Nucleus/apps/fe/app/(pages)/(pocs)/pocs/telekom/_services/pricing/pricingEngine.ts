import type {
  CalendarMonth,
  Percentage,
} from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing/baseTypes'
import type {
  CalculationRow,
  CalculationRowCategory,
  PeriodAllocation,
  PricingDashboardData,
  PricingInputs,
  PricingSummary,
} from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing/pricingTypes'

const DAYS_IN_YEAR = 365
const DAMGA_VERGISI_PERCENTAGE = 0.00948

function createCalendarMonth(date: Date): CalendarMonth {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  }
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime())
  copy.setDate(copy.getDate() + days)
  return copy
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

function calculateDamgaVergisi(base: number, included: boolean): number {
  if (!included) {
    return 0
  }
  return roundCurrency(base * DAMGA_VERGISI_PERCENTAGE)
}

function calculateFinancingCost(base: number, monthlyRate: number, days: number): number {
  if (days <= 0) {
    return 0
  }
  const effectiveMonths = days / 30
  const financingCost = base * (monthlyRate / 100) * effectiveMonths
  return roundCurrency(financingCost)
}

function calculateDiscountFactor(annualRate: number, days: number): number {
  if (days <= 0) {
    return 1
  }
  const yearlyRate = annualRate / 100
  const discountFactor = 1 / (1 + yearlyRate) ** (days / DAYS_IN_YEAR)
  return discountFactor
}

function getSalePrice(
  purchaseCost: number,
  desiredMargin: number,
  overridePrice: number | null
): number {
  if (overridePrice !== null) {
    return roundCurrency(overridePrice)
  }
  const price = purchaseCost * (1 + desiredMargin / 100)
  return roundCurrency(price)
}

function buildPeriodAllocations(
  baseDate: Date,
  purchaseDays: number,
  salesDays: number,
  purchaseAmount: number,
  saleAmount: number
): {
  purchasePeriods: PeriodAllocation[]
  salesPeriods: PeriodAllocation[]
} {
  const purchaseDate = addDays(baseDate, purchaseDays)
  const salesDate = addDays(baseDate, salesDays)
  const purchaseMonth = createCalendarMonth(purchaseDate)
  const salesMonth = createCalendarMonth(salesDate)
  return {
    purchasePeriods: [
      {
        month: purchaseMonth,
        amount: roundCurrency(purchaseAmount),
      },
    ],
    salesPeriods: [
      {
        month: salesMonth,
        amount: roundCurrency(saleAmount),
      },
    ],
  }
}

function buildRow(
  id: string,
  label: string,
  category: CalculationRowCategory,
  total: number,
  periods: PeriodAllocation[],
  percentage: Percentage | null
): CalculationRow {
  return {
    id: id,
    label: label,
    category: category,
    total: roundCurrency(total),
    periods: periods,
    percentage: percentage,
  }
}

function sumAdditionalCosts(
  costs: { amount: number; isPercentage: boolean; percentageValue: number | null }[],
  referenceValue: number
): number {
  let total = 0
  for (const cost of costs) {
    if (cost.isPercentage && cost.percentageValue !== null) {
      total += referenceValue * (cost.percentageValue / 100)
      continue
    }
    total += cost.amount
  }
  return roundCurrency(total)
}

function createSummary(
  purchaseCost: number,
  salePrice: number,
  additionalCosts: number,
  financingCost: number,
  damgaVergisi: number,
  discountFactor: number
): PricingSummary {
  const grossProfit = salePrice - purchaseCost
  const netOperatingProfit = grossProfit - additionalCosts - damgaVergisi
  const ebit = netOperatingProfit - financingCost
  const ebitMargin = salePrice === 0 ? 0 : (ebit / salePrice) * 100
  const npv = ebit * discountFactor
  const npvMargin = salePrice === 0 ? 0 : (npv / salePrice) * 100
  const taxAmount = Math.max(netOperatingProfit * 0.25, 0)
  const capitalRequirement = purchaseCost + additionalCosts + damgaVergisi
  return {
    salePrice: roundCurrency(salePrice),
    grossProfit: roundCurrency(grossProfit),
    netOperatingProfit: roundCurrency(netOperatingProfit),
    ebit: roundCurrency(ebit),
    ebitMargin: roundCurrency(ebitMargin),
    npv: roundCurrency(npv),
    npvMargin: roundCurrency(npvMargin),
    taxAmount: roundCurrency(taxAmount),
    capitalRequirement: roundCurrency(capitalRequirement),
  }
}

export function calculatePricingDashboard(inputs: PricingInputs): PricingDashboardData {
  const baseDate = new Date(inputs.project.projectDate)
  const purchaseCost = inputs.purchase.baseCost
  const damgaVergisi = calculateDamgaVergisi(purchaseCost, inputs.purchase.damgaVergisiIncluded)
  const additionalCosts = sumAdditionalCosts(inputs.purchase.additionalCosts, purchaseCost)
  const totalCost = purchaseCost + additionalCosts + damgaVergisi
  const salePrice = getSalePrice(
    purchaseCost,
    inputs.sales.desiredMargin,
    inputs.sales.overridePrice
  )
  const financingCostPurchase = calculateFinancingCost(
    purchaseCost,
    inputs.financing.monthlyRate,
    inputs.purchase.payment.days
  )
  const financingCostSales = calculateFinancingCost(
    salePrice,
    inputs.financing.monthlyRate,
    inputs.sales.payment.days
  )
  const financingCost = financingCostSales - financingCostPurchase
  const discountFactor = calculateDiscountFactor(
    inputs.financing.annualDiscountRate,
    inputs.sales.payment.days - inputs.purchase.payment.days
  )
  const periods = buildPeriodAllocations(
    baseDate,
    inputs.purchase.payment.days,
    inputs.sales.payment.days,
    totalCost,
    salePrice
  )
  const rows: CalculationRow[] = []
  rows.push(buildRow('row-sale', 'Satış Fiyatı', 'revenue', salePrice, periods.salesPeriods, null))
  rows.push(
    buildRow(
      'row-purchase',
      'Alış Maliyeti',
      'expense',
      -purchaseCost,
      periods.purchasePeriods,
      null
    )
  )
  rows.push(
    buildRow(
      'row-additional',
      'Ek Giderler',
      'expense',
      -additionalCosts,
      periods.purchasePeriods,
      null
    )
  )
  rows.push(
    buildRow('row-damga', 'Damga Vergisi', 'tax', -damgaVergisi, periods.purchasePeriods, null)
  )
  rows.push(
    buildRow('row-financing', 'Finansman', 'expense', -financingCost, periods.purchasePeriods, null)
  )
  const summary = createSummary(
    purchaseCost,
    salePrice,
    additionalCosts,
    financingCost,
    damgaVergisi,
    discountFactor
  )
  rows.push(
    buildRow('row-ebit', 'EBIT', 'summary', summary.ebit, periods.salesPeriods, summary.ebitMargin)
  )
  rows.push(
    buildRow('row-npv', 'NPV', 'result', summary.npv, periods.salesPeriods, summary.npvMargin)
  )
  return {
    rows: rows,
    summary: summary,
  }
}
