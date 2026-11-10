import type { Row } from '../db'

/** A text column, trimmed; a missing, null or non-text column reads as empty. */
export function textOf(row: Row | undefined, key: string): string {
  const value = row?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

/** A number column (pg sends `numeric` as text); anything that is not a finite number reads as null. */
export function numberOf(row: Row | undefined, key: string): number | null {
  const value = row?.[key]
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : Number.NaN
  return Number.isFinite(parsed) ? parsed : null
}

/** A count column; absent or broken reads as 0. */
export function countOf(row: Row | undefined, key: string): number {
  return numberOf(row, key) ?? 0
}

/** The text items of a json array column (`field_manager_user_ids`); anything else reads as an empty list. */
export function textItemsOf(row: Row | undefined, key: string): string[] {
  const value = row?.[key]
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
}
