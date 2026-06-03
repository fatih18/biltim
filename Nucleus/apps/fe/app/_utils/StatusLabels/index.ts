// Uygulama genelinde durum (status) değerlerinin Türkçe gösterimleri.
// Backend değerleri (planned, completed, open vb.) İngilizce kalır; yalnızca
// kullanıcıya gösterilen etiketler Türkçeleştirilir.

export const AUDIT_STATUS_LABELS_TR: Record<string, string> = {
  planned: 'Planlandı',
  completed: 'Tamamlandı',
  cancelled: 'İptal edildi',
  canceled: 'İptal edildi',
  in_progress: 'Devam ediyor',
  draft: 'Taslak',
}

export const FINDING_STATUS_LABELS_TR: Record<string, string> = {
  open: 'Açık',
  in_progress: 'Devam ediyor',
  closed: 'Kapandı',
  done: 'Tamamlandı',
  cancelled: 'İptal edildi',
  canceled: 'İptal edildi',
}

export function auditStatusLabelTr(status: string | null | undefined): string {
  const key = String(status ?? '').trim().toLowerCase()
  return AUDIT_STATUS_LABELS_TR[key] ?? (status ? String(status) : '-')
}

export function findingStatusLabelTr(status: string | null | undefined): string {
  const key = String(status ?? '').trim().toLowerCase()
  return FINDING_STATUS_LABELS_TR[key] ?? (status ? String(status) : '-')
}
