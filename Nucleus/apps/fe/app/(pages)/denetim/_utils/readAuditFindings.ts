import {
  BY_ID,
  readAllPages,
  readByIds,
  type Condition,
  type ListRow,
  type PageStarter,
} from '@/app/_utils/readAllPages'
import { findingsFromRows } from './findingRow'
import { mergeFindingRows } from './findingDelete'
import type { FiveSFindingLite } from './findingTypes'

/*
 * The findings listed while an audit is corrected (customer notes, row 73), now
 * with the single findings raised INSIDE it.
 *
 * A single finding is stored under a carrier audit row of its own
 * (`source = 'single_finding'`), not under the audit it was raised in; the
 * carrier names the audit's plan (`plan_id`) and that is the only link. Reading
 * by `audit_id` alone listed the audit's own findings and none of those, so
 * Merkez Ekip could neither see nor delete them while correcting. The carriers
 * of the plan are read first, then the findings of the audit and of every
 * carrier together, page by page: a partial list is never handed on.
 */

export const CARRIER_SOURCE = 'single_finding'

/** The carrier audits of one plan: the rows a single finding raised in that plan's audit hangs under. */
export function carrierAuditConditions(planId: string): Condition[] {
  return [
    { field: 'plan_id', operator: 'eq', value: planId },
    { field: 'source', operator: 'eq', value: CARRIER_SOURCE },
  ]
}

const sameId = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase()

/*
 * The ids of the carrier rows read, each once. The server filtered by plan and
 * source already; they are checked again here because a filter an API layer
 * drops would hand over every audit, and every finding of every audit would
 * then be listed (and deletable) on this audit's screen.
 */
export function carrierIdsOf(rows: readonly ListRow[], audit: { auditId: string; planId: string }): string[] {
  const ids = new Set<string>()
  for (const row of rows) {
    const id = typeof row.id === 'string' ? row.id : ''
    const rowPlan = row.plan_id ?? row.planId
    const ofThisPlan = typeof rowPlan === 'string' && sameId(rowPlan, audit.planId)
    if (id && !sameId(id, audit.auditId) && row.source === CARRIER_SOURCE && ofThisPlan) ids.add(id)
  }
  return [...ids]
}

/** The finding rows that hang under one of `auditIds`, for the same reason as above. */
export function rowsOfAudits(rows: readonly ListRow[], auditIds: readonly string[]): ListRow[] {
  const wanted = new Set(auditIds.map((id) => id.trim().toLowerCase()))
  return rows.filter((row) => {
    const owner = row.audit_id ?? row.auditId
    return typeof owner === 'string' && wanted.has(owner.trim().toLowerCase())
  })
}

/** Only active findings are listed, whatever their status. */
const ACTIVE: Condition[] = [{ field: 'is_active', operator: 'eq', value: true }]

export type AuditFindingsRead = {
  /** The audit list's `start`: the carriers are read from it. */
  startAudits: PageStarter
  /** The finding list's `start`. */
  startFindings: PageStarter
  auditId: string
  /** The plan of the audit being corrected; null for an audit that never had one. */
  planId: string | null
  onDone: (findings: FiveSFindingLite[]) => void
  onError: (error: object) => void
}

/**
 * The audit's own findings and those of its in-audit single findings, the
 * highest number first. `onError` is called instead of `onDone` when any page
 * of any read fails.
 */
export function readAuditFindings({ startAudits, startFindings, auditId, planId, onDone, onError }: AuditFindingsRead): void {
  const readFindings = (carrierIds: readonly string[]) => {
    const ids = [auditId, ...carrierIds]
    readByIds({
      start: startFindings,
      field: 'audit_id',
      ids,
      filters: ACTIVE,
      onDone: (rows) => onDone(mergeFindingRows<FiveSFindingLite>([], findingsFromRows(rowsOfAudits(rows, ids)))),
      onError,
    })
  }

  if (!planId) {
    readFindings([])
    return
  }
  readAllPages({
    start: startAudits,
    payload: { sort: BY_ID, filters: carrierAuditConditions(planId) },
    onDone: (carriers) => readFindings(carrierIdsOf(carriers, { auditId, planId })),
    onError,
  })
}
