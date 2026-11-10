import type { Row } from '../db'
import { squash } from './rejectedPlan'

/**
 * Two limits on writing an existing audit or answer in the correction of a
 * rejected plan (R30).
 *
 * The Auditor role holds table-level put/patch on audits and answers (boot.ts)
 * so the plan's team can correct scores, names and answers. A table-level claim
 * opens every column, and nucleus drops nothing for it: these two functions are
 * how the guard keeps the correction to what a correction is.
 */

/** The columns that bind an audit's record to the rest of the system; a correction rewrites none of them. */
export const AUDIT_STRUCTURE_WRITE_MESSAGE =
  'Denetimin etkin durumu, lokasyonu, denetçi kaydı, dönemi, plan bağlantısı, kaynağı ve gönderim kimliği elle değiştirilemez; bu alanlar kaydı plana, lokasyona ve çevrimdışı kuyruğa bağlar. Düzeltmede yalnız puanlar, denetçi adı ve tarih yazılabilir; başka bir değişiklik için Merkez Ekip\'e başvurun.'

/** An answer is corrected in the audit it belongs to, never moved to another one. */
export const ANSWER_MOVE_MESSAGE =
  'Cevap başka bir denetime taşınamaz: cevabın kayıtlı denetimi ya da gönderilen denetim, ekibinizin düzeltme bekleyen bir planına ait değil. Cevabı yalnız kendi düzeltme bekleyen denetiminde değiştirin.'

const AUDIT_STRUCTURE_COLUMNS: readonly string[] = [
  'isactive',
  'planid',
  'source',
  'clientsubmissionid',
  'departmentname',
  'locationid',
  'auditorid',
  'periodid',
]

/**
 * The keys of an audit write that name a column binding the record to its place,
 * person, period, plan or queue submission (`is_active`, `plan_id`, `source`,
 * `client_submission_id`, `department_name`, `location_id`, `auditor_id`,
 * `period_id`), in any spelling. Scores, `auditor_name` and `audit_date` stay open.
 */
export function auditStructureKeysIn(body: Row): string[] {
  return Object.keys(body).filter((key) => AUDIT_STRUCTURE_COLUMNS.includes(squash(key)))
}

/**
 * The audit ids a body names, under any spelling of `audit_id`, as they were
 * written: the caller brings them to the canonical form. Null and blank name
 * nothing.
 */
export function auditIdsNamedIn(body: Row): string[] {
  return Object.entries(body)
    .filter(([key, value]) => squash(key) === 'auditid' && value !== null && value !== undefined)
    .map(([, value]) => String(value).trim())
    .filter((id) => id !== '')
}
