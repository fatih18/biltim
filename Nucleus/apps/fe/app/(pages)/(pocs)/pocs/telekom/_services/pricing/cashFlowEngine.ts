/** biome-ignore-all lint/style/noNonNullAssertion: <> */
import type {
  CalendarMonth,
  CalendarPeriod,
  MoneyValue,
} from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing/baseTypes'
import type {
  CashFlowProjectRow,
  CashFlowSummary,
  CashFlowView,
} from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing/cashFlowTypes'

function cloneMonth(month: CalendarMonth): CalendarMonth {
  return {
    year: month.year,
    month: month.month,
  }
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

function groupMonths(period: CalendarPeriod, months: CalendarMonth[]): CalendarMonth[][] {
  if (period === 'monthly') {
    const monthlyGroups: CalendarMonth[][] = []
    for (const month of months) {
      monthlyGroups.push([cloneMonth(month)])
    }
    return monthlyGroups
  }
  if (period === 'quarterly') {
    const quarterlyGroups: CalendarMonth[][] = []
    let currentGroup: CalendarMonth[] = []
    for (const month of months) {
      currentGroup.push(cloneMonth(month))
      if (currentGroup.length === 3) {
        quarterlyGroups.push(currentGroup)
        currentGroup = []
      }
    }
    if (currentGroup.length > 0) {
      quarterlyGroups.push(currentGroup)
    }
    return quarterlyGroups
  }
  const firstMonth = months[0]
  const yearlyGroups: CalendarMonth[][] = []
  let currentYear = firstMonth ? firstMonth.year : 0
  let yearlyGroup: CalendarMonth[] = []
  for (const month of months) {
    if (month.year !== currentYear) {
      yearlyGroups.push(yearlyGroup)
      yearlyGroup = []
      currentYear = month.year
    }
    yearlyGroup.push(cloneMonth(month))
  }
  if (yearlyGroup.length > 0) {
    yearlyGroups.push(yearlyGroup)
  }
  return yearlyGroups
}

function sumValues(values: MoneyValue[]): MoneyValue {
  let total = 0
  for (const value of values) {
    total += value
  }
  return roundCurrency(total)
}

function aggregateSeries(groups: CalendarMonth[][], values: MoneyValue[]): MoneyValue[] {
  const aggregates: MoneyValue[] = []
  let index = 0
  for (const group of groups) {
    let total = 0
    for (const _month of group) {
      if (index < values.length) {
        total += values[index] ?? 0
      }
      index += 1
    }
    aggregates.push(roundCurrency(total))
  }
  return aggregates
}

function computeCumulative(values: MoneyValue[]): MoneyValue[] {
  const cumulative: MoneyValue[] = []
  let runningTotal = 0
  for (const value of values) {
    runningTotal += value
    cumulative.push(roundCurrency(runningTotal))
  }
  return cumulative
}

function buildAggregatedRow(
  source: CashFlowProjectRow,
  groups: CalendarMonth[][]
): CashFlowProjectRow {
  const inflows = aggregateSeries(groups, source.inflows)
  const outflows = aggregateSeries(groups, source.outflows)
  const net: MoneyValue[] = []
  for (let i = 0; i < inflows.length; i += 1) {
    const inflow = inflows[i] ?? 0
    const outflow = outflows[i] ?? 0
    net.push(roundCurrency(inflow - outflow))
  }
  return {
    projectId: source.projectId,
    projectName: source.projectName,
    inflows: inflows,
    outflows: outflows,
    net: net,
  }
}

function buildRowsForGroups(
  sourceRows: CashFlowProjectRow[],
  groups: CalendarMonth[][]
): CashFlowProjectRow[] {
  const aggregated: CashFlowProjectRow[] = []
  for (const row of sourceRows) {
    aggregated.push(buildAggregatedRow(row, groups))
  }
  return aggregated
}

function aggregateNet(rows: CashFlowProjectRow[]): MoneyValue[] {
  const firstRow = rows[0]
  const length = firstRow ? firstRow.net.length : 0
  const totals: MoneyValue[] = []
  for (let i = 0; i < length; i += 1) {
    let total = 0
    for (const row of rows) {
      total += row.net[i] ?? 0
    }
    totals.push(roundCurrency(total))
  }
  return totals
}

function extractGroupLabels(groups: CalendarMonth[][]): CalendarMonth[] {
  const labels: CalendarMonth[] = []
  for (const group of groups) {
    const first = group.length > 0 ? group[0] : undefined
    if (first === undefined) {
      labels.push({ year: 0, month: 0 })
      continue
    }
    labels.push(cloneMonth(first))
  }
  return labels
}

function computeSummary(
  rows: CashFlowProjectRow[],
  monthlyNet: MoneyValue[],
  monthlyGroups: CalendarMonth[][],
  discountRate: number
): CashFlowSummary {
  let totalInflows = 0
  let totalOutflows = 0
  for (const row of rows) {
    totalInflows += sumValues(row.inflows)
    totalOutflows += sumValues(row.outflows)
  }
  const totalNet = roundCurrency(totalInflows - totalOutflows)
  let cumulative = 0
  let peakDeficit = 0
  let paybackIndex: number | null = null
  for (let i = 0; i < monthlyNet.length; i += 1) {
    cumulative += monthlyNet[i] ?? 0
    if (cumulative < peakDeficit) {
      peakDeficit = cumulative
    }
    if (cumulative >= 0 && paybackIndex === null) {
      paybackIndex = i
    }
  }
  let paybackMonth: CalendarMonth | null = null
  if (paybackIndex !== null) {
    const group = monthlyGroups[paybackIndex] ?? []
    const reference: CalendarMonth =
      group.length > 0 ? group[0]! : { year: 0, month: paybackIndex + 1 }
    paybackMonth = cloneMonth(reference)
  }
  let discounted = 0
  for (let i = 0; i < monthlyNet.length; i += 1) {
    const value = monthlyNet[i] ?? 0
    const factor = (1 + discountRate / 100) ** (i / 12)
    discounted += value / factor
  }
  return {
    totalInflows: roundCurrency(totalInflows),
    totalOutflows: roundCurrency(totalOutflows),
    totalNet: totalNet,
    peakDeficit: roundCurrency(peakDeficit),
    paybackMonth: paybackMonth,
    discountedNetPresentValue: roundCurrency(discounted),
    discountRate: discountRate,
  }
}

export function buildCashFlowViews(
  months: CalendarMonth[],
  rows: CashFlowProjectRow[],
  discountRate: number
): CashFlowView[] {
  const periodOrder: CalendarPeriod[] = ['monthly', 'quarterly', 'yearly']
  const views: CashFlowView[] = []
  const monthlyGroups = groupMonths('monthly', months)
  const monthlyRows = buildRowsForGroups(rows, monthlyGroups)
  const monthlyNetTotals = aggregateNet(monthlyRows)
  const summary = computeSummary(monthlyRows, monthlyNetTotals, monthlyGroups, discountRate)
  for (const period of periodOrder) {
    const groups = period === 'monthly' ? monthlyGroups : groupMonths(period, months)
    const aggregatedRows = period === 'monthly' ? monthlyRows : buildRowsForGroups(rows, groups)
    const netTotals = period === 'monthly' ? monthlyNetTotals : aggregateNet(aggregatedRows)
    const viewRows: CashFlowProjectRow[] = []
    for (const row of aggregatedRows) {
      viewRows.push(row)
    }
    views.push({
      period: period,
      months: extractGroupLabels(groups),
      table: {
        projects: viewRows,
        monthlyNet: netTotals,
        cumulative: computeCumulative(netTotals),
        total: sumValues(netTotals),
      },
    })
  }
  if (views.length > 0) {
    const firstView = views[0]
    if (firstView) {
      views[0] = {
        ...firstView,
        table: {
          ...firstView.table,
          total: summary.totalNet,
        },
      }
    }
  }
  return views
}

export function buildCashFlowSummary(
  months: CalendarMonth[],
  rows: CashFlowProjectRow[],
  discountRate: number
): CashFlowSummary {
  const monthlyGroups = groupMonths('monthly', months)
  const monthlyRows = buildRowsForGroups(rows, monthlyGroups)
  const monthlyNet = aggregateNet(monthlyRows)
  return computeSummary(monthlyRows, monthlyNet, monthlyGroups, discountRate)
}
