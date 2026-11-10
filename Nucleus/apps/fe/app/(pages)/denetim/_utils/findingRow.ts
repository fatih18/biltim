import type { JsonValue, ListRow } from '@/app/_utils/readAllPages'
import type { FiveSFindingLite } from './findingTypes'

/*
 * A finding row of a paged list read as the audit page's finding type.
 *
 * `readAllPages` hands rows over as plain JSON, and the page's panel and its
 * detail modal read typed columns, so each column the type names is read here
 * with a check instead of a cast. Every other column of the row travels along
 * untouched. A row without an id is no finding and gives null.
 */

type JsonRecord = { [key: string]: JsonValue }

const isRecord = (value: JsonValue): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const textOf = (value: JsonValue): string | undefined => (typeof value === 'string' ? value : undefined)

const textOrNull = (value: JsonValue): string | null => (typeof value === 'string' ? value : null)

const numberOrNull = (value: JsonValue): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string' || value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function photosOf(value: JsonValue): FiveSFindingLite['photo_before_files'] {
  if (!Array.isArray(value)) return null
  return value.filter(isRecord).map((photo) => ({
    file_id: textOrNull(photo.file_id ?? photo.fileId),
    url: textOrNull(photo.url),
  }))
}

export function findingFromRow(row: ListRow): FiveSFindingLite | null {
  const id = textOf(row.id)
  if (!id) return null
  return {
    ...row,
    id,
    finding_no: numberOrNull(row.finding_no ?? row.findingNo),
    question_id: textOrNull(row.question_id ?? row.questionId),
    step_code: textOrNull(row.step_code ?? row.stepCode),
    detected_date: textOf(row.detected_date ?? row.detectedDate),
    location_name: textOf(row.location_name ?? row.locationName),
    finding_type: textOf(row.finding_type ?? row.findingType),
    status: textOf(row.status),
    description: textOrNull(row.description),
    action_to_take: textOrNull(row.action_to_take ?? row.actionToTake),
    due_date: textOrNull(row.due_date ?? row.dueDate),
    responsible_name: textOrNull(row.responsible_name ?? row.responsibleName),
    photo_before_url: textOrNull(row.photo_before_url ?? row.photoBeforeUrl),
    photo_before_file_id: textOrNull(row.photo_before_file_id ?? row.photoBeforeFileId),
    photo_before_files: photosOf(row.photo_before_files ?? row.photoBeforeFiles),
  }
}

/** The finding rows of a list read; a row that is no finding is left out. */
export function findingsFromRows(rows: readonly ListRow[]): FiveSFindingLite[] {
  const found: FiveSFindingLite[] = []
  for (const row of rows) {
    const finding = findingFromRow(row)
    if (finding) found.push(finding)
  }
  return found
}
