import { type Column, statusTr } from './excel'
import { PHOTO_COLUMN_WIDTH } from './photoReport'

/**
 * The findings workbook (`/reports/findings.xlsx`, `open-findings.xlsx`): its
 * columns, and the finding numbers its query reads.
 *
 * "Eski No" (R61) follows "Bulgu No": a finding that boot gave a new number
 * keeps the one it had in `previous_finding_no`, and a customer who holds a
 * printout with "#2" can find it by that. It is empty for every finding that
 * was never renumbered.
 */

/** The number columns of the findings query, in the order the sheet shows them. */
export const FINDING_NUMBERS_SELECT = 'f.finding_no, f.previous_finding_no'

/** Every report that lists findings shows their before and after photos (R46). */
export const PHOTO_SHEET_COLUMNS: Column[] = [
  { header: 'Öncesi Fotoğraf', key: 'photo_before', kind: 'photo', side: 'before', width: PHOTO_COLUMN_WIDTH },
  { header: 'Sonrası Fotoğraf', key: 'photo_after', kind: 'photo', side: 'after', width: PHOTO_COLUMN_WIDTH },
]

export const FINDINGS_SHEET_COLUMNS: Column[] = [
  { header: 'Bulgu No', key: 'finding_no', kind: 'number', width: 10 },
  { header: 'Eski No', key: 'previous_finding_no', kind: 'number', width: 10 },
  { header: 'Kaynak', key: 'source_label', width: 14 },
  { header: 'Ana Denetim', key: 'audit_label', width: 30 },
  { header: 'Tespit Tarihi', key: 'detected_date', kind: 'date' },
  { header: 'Lokasyon', key: 'location_name', width: 24 },
  { header: 'Bulgu Tipi', key: 'finding_type', width: 20 },
  { header: '5S Adımı', key: 'step_code', width: 10 },
  { header: 'Açıklama', key: 'description', width: 48 },
  ...PHOTO_SHEET_COLUMNS,
  { header: 'Yapılacak Aksiyon', key: 'action_to_take', width: 32 },
  { header: 'Termin', key: 'due_date', kind: 'date' },
  { header: 'Kapanış Tarihi', key: 'completed_at', kind: 'date' },
  { header: 'Sorumlu', key: 'responsible_name', width: 22 },
  { header: 'Denetçi', key: 'auditor_name', width: 22 },
  { header: 'Durum', key: 'status', map: statusTr },
]
