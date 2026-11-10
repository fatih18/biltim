import type { Row } from '../db'
import type { Read } from './caller'

/**
 * R72: a question can demand a photo on the findings it raises.
 *
 * `five_s_questions.require_photo` is off for every question until an
 * administrator switches it on. The audit form refuses to save such an answer
 * without a photo, and this is the second door: the moment an audit is SENT
 * (its plan goes `planned` -> `pending_approval` or `completed`) every finding
 * the audit wrote for a photo-demanding question must carry a "before" photo.
 *
 * What it reads is only what the audit left in the database: its findings
 * (`audit_id`, `question_id`, the three `photo_before_*` columns) and the
 * question's flag. An answer rated Orta/Kötü on a question that already had an
 * open finding writes no finding, so it is not asked for a photo here, exactly
 * as the form does not ask for one. A finding that was never written at all is
 * not "a finding without a photo" and is left to the rules that already cover
 * a failed save. The check runs on the way IN to the sent state only: approving
 * (`completed`) or reading an old audit never re-checks it, so switching the
 * flag on later changes nothing for audits already sent.
 */

/** The plan statuses an audit is "sent" in; entering either from outside is the moment checked. */
const SENT_STATUSES: readonly string[] = ['pending_approval', 'completed']

/**
 * Whether a plan write moves the plan into a sent state for the first time.
 * A `rejected` plan was sent once already, so its resend or approval is not
 * checked: its stored findings may predate the flag, the correction screen
 * cannot add a "before" photo to them, and the form checks the new findings
 * of a correction itself (a failed photo already holds the resend).
 */
export function entersSentState(storedStatus: string, incomingStatus: string | undefined): boolean {
  if (incomingStatus === undefined || !SENT_STATUSES.includes(incomingStatus)) return false
  return !SENT_STATUSES.includes(storedStatus) && storedStatus !== 'rejected'
}

/**
 * The findings of one audit on photo-demanding questions, with their "before"
 * photo columns. `exists` rather than a join: `external_id` has no unique
 * index, and a duplicated question must not repeat a finding.
 */
export const PHOTO_QUESTION_FINDINGS_SQL = `select f.question_id, f.finding_no,
       f.photo_before_url, f.photo_before_file_id, f.photo_before_files
  from main.five_s_findings f
 where f.audit_id::text = $1
   and coalesce(f.is_active, true)
   and exists (
     select 1 from main.five_s_questions q
      where q.external_id = f.question_id and q.require_photo is true)
 order by f.finding_no`

/** A non-blank string. */
const filled = (value: unknown): boolean => typeof value === 'string' && value.trim() !== ''

/** One entry of a photo list names a file: a string, or an object with an id, url or path. */
function namesPhoto(item: unknown): boolean {
  if (typeof item === 'string') return filled(item)
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false
  const o: Row = { ...item }
  return ['file_id', 'fileId', 'id', 'url', 'path'].some((key) => filled(o[key]))
}

/** A jsonb array as node-pg hands it over: already parsed, or still text. */
function listOf(value: unknown): unknown[] {
  let v = value
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v)
    } catch {
      return []
    }
  }
  return Array.isArray(v) ? v : []
}

/**
 * True when the finding row carries a "before" photo: a url, a file id, or a
 * photo list with at least one entry that says which file it is. `[{}]` and
 * `[{"file_id":null}]` are not a photo (the same test the closing rule applies
 * to the "after" side).
 */
export function hasBeforePhoto(row: Row): boolean {
  if (filled(row.photo_before_url) || filled(row.photo_before_file_id)) return true
  return listOf(row.photo_before_files).some(namesPhoto)
}

/**
 * The question ids whose findings lack a photo, each once, in finding order.
 * A row without a `question_id` is not a finding of a question and is ignored.
 */
export function questionsMissingPhoto(rows: readonly Row[]): string[] {
  const ids: string[] = []
  for (const row of rows) {
    const id = typeof row.question_id === 'string' ? row.question_id.trim() : ''
    if (id === '' || hasBeforePhoto(row) || ids.includes(id)) continue
    ids.push(id)
  }
  return ids
}

/** What the sender is told: what is wrong, what it means, what to do. */
export function missingPhotoMessage(questionIds: readonly string[]): string {
  return `Denetim gönderilemedi: bulgu fotoğrafı zorunlu olan sorularda (${questionIds.join(', ')}) fotoğrafsız bulgu var. Bu sorularda fotoğrafsız bulgu kabul edilmez. Bulguya fotoğraf ekleyin; fotoğraf yüklenemiyorsa Merkez Ekip'e bildirin.`
}

/**
 * The refusal text for an audit about to be sent, or undefined when it may go.
 * An audit with no id, or none of whose findings sit on a photo-demanding
 * question, is never refused.
 */
export async function auditPhotoRefusal(read: Read, auditId: string): Promise<string | undefined> {
  if (auditId === '') return undefined
  const missing = questionsMissingPhoto(await read(PHOTO_QUESTION_FINDINGS_SQL, [auditId]))
  return missing.length > 0 ? missingPhotoMessage(missing) : undefined
}
