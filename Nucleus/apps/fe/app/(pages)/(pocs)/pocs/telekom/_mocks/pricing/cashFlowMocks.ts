import type { CalendarMonth } from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing/baseTypes'
import type { CashFlowProjectRow } from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing/cashFlowTypes'

function createMonth(year: number, month: number): CalendarMonth {
  return {
    year: year,
    month: month,
  }
}

function createSeries(values: number[]): number[] {
  const rounded: number[] = []
  for (const value of values) {
    rounded.push(Math.round(value * 100) / 100)
  }
  return rounded
}

export const cashFlowMonths2025: CalendarMonth[] = [
  createMonth(2025, 1),
  createMonth(2025, 2),
  createMonth(2025, 3),
  createMonth(2025, 4),
  createMonth(2025, 5),
  createMonth(2025, 6),
  createMonth(2025, 7),
  createMonth(2025, 8),
  createMonth(2025, 9),
  createMonth(2025, 10),
  createMonth(2025, 11),
  createMonth(2025, 12),
]

export const cashFlowProjectRows: CashFlowProjectRow[] = [
  {
    projectId: 'project-default',
    projectName: 'Fiber Optik Altyapı',
    inflows: createSeries([0, 0, 11000, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    outflows: createSeries([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    net: createSeries([0, 0, 11000, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  },
  {
    projectId: 'project-investment',
    projectName: 'Yatırım Harcaması',
    inflows: createSeries([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    outflows: createSeries([0, 0, 10206, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    net: createSeries([0, 0, -10206, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  },
]
