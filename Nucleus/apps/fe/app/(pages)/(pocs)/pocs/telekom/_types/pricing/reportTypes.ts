import type { CalendarMonth, CalendarPeriod, CurrencyCode } from './baseTypes'

export type ReportKind =
  | 'proposal'
  | 'comparison'
  | 'cashFlow'
  | 'monthlyPerformance'
  | 'customerAnalysis'
  | 'trend'

export type ReportFilter = {
  period: CalendarPeriod
  currency: CurrencyCode
  startMonth: CalendarMonth
  endMonth: CalendarMonth
  customerName: string | null
}

export type ReportRequest = {
  kind: ReportKind
  filter: ReportFilter
  includeDetails: boolean
  includeScenarioComparisons: boolean
}

export type ReportExportFormat = 'pdf' | 'excel' | 'csv'

export type ReportMetadata = {
  generatedAt: string
  generatedBy: string
  reportTitle: string
}

export type ReportSummary = {
  reportId: string
  kind: ReportKind
  title: string
  description: string
  lastGeneratedAt: string | null
  downloadAvailableFormats: ReportExportFormat[]
}

export type ReportResult = {
  metadata: ReportMetadata
  content: string
  previewUrl: string | null
  dataSize: number
  warnings: string[]
}
