import type {
  HistoryFilters,
  PricingHistorySnapshot,
} from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing/historyTypes'

function createSnapshot(
  id: string,
  name: string,
  salePrice: number,
  ebitMargin: number,
  npvMargin: number,
  status: PricingHistorySnapshot['status'],
  notes: string | null
): PricingHistorySnapshot {
  return {
    snapshotId: id,
    snapshotName: name,
    savedAt: '2025-04-01T08:00:00Z',
    savedBy: 'Mock Kullanıcı',
    currency: 'TRY',
    salePrice: salePrice,
    ebitMargin: ebitMargin,
    npvMargin: npvMargin,
    status: status,
    notes: notes,
  }
}

export const defaultHistorySnapshots: PricingHistorySnapshot[] = [
  createSnapshot('snapshot-1', 'Başlangıç Teklifi', 11000, 7.2, 6.8, 'draft', null),
  createSnapshot(
    'snapshot-2',
    'Müşteri Revizyonu',
    11200,
    7.5,
    7.0,
    'approved',
    'Revizyon sonrası kabul edildi'
  ),
  createSnapshot(
    'snapshot-3',
    'Alternatif Senaryo',
    10850,
    6.5,
    6.1,
    'cancelled',
    'Maliyet yüksek bulundu'
  ),
]

export const defaultHistoryFilters: HistoryFilters = {
  currency: 'ALL',
  status: 'ALL',
  fromDate: null,
  toDate: null,
  minimumMargin: null,
}
