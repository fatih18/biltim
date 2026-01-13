import type { CalendarMonth } from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing/baseTypes'
import type {
  ReportRequest,
  ReportResult,
  ReportSummary,
} from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing/reportTypes'

function createMonth(year: number, month: number): CalendarMonth {
  return {
    year: year,
    month: month,
  }
}

export const defaultReportSummaries: ReportSummary[] = [
  {
    reportId: 'report-proposal',
    kind: 'proposal',
    title: 'Teklif Özeti',
    description: 'Proje bazlı teklif ve finansal göstergeler',
    lastGeneratedAt: '2025-04-01T09:00:00Z',
    downloadAvailableFormats: ['pdf', 'excel'],
  },
  {
    reportId: 'report-comparison',
    kind: 'comparison',
    title: 'Senaryo Karşılaştırması',
    description: 'Vade senaryoları karşılaştırma tablosu',
    lastGeneratedAt: '2025-04-01T09:10:00Z',
    downloadAvailableFormats: ['pdf', 'csv'],
  },
  {
    reportId: 'report-cashflow',
    kind: 'cashFlow',
    title: '12 Aylık Nakit Akışı',
    description: 'Projeye ait aylık nakit hareketleri',
    lastGeneratedAt: null,
    downloadAvailableFormats: ['excel'],
  },
]

export const defaultReportRequest: ReportRequest = {
  kind: 'proposal',
  filter: {
    period: 'monthly',
    currency: 'TRY',
    startMonth: createMonth(2025, 1),
    endMonth: createMonth(2025, 12),
    customerName: 'Telekom Müşteri A',
  },
  includeDetails: true,
  includeScenarioComparisons: true,
}

export const reportResultPlaceholder: ReportResult = {
  metadata: {
    generatedAt: '2025-04-01T09:00:00Z',
    generatedBy: 'Mock Kullanıcı',
    reportTitle: 'Teklif Özeti',
  },
  content: 'Bu rapor sunucuda oluşturulacak.',
  previewUrl: null,
  dataSize: 128,
  warnings: [],
}
