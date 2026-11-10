import { canonicalId } from '../guards/businessRules'
import type { Caller } from '../guards/caller'
import { type AuditReportTarget, auditReportRefusal, isScopedFieldManager } from './auditReport'
import { sameLocation } from './locationMatch'

/**
 * Who may read which workbook from `/reports/location-form.xlsx`, decided
 * before anything is built.
 *
 * The handler used to carry this inline, where nothing could exercise it
 * without a database. The lookups are injected, so the rules are plain
 * functions of the request: which audit and place the workbook is about, and
 * what a field manager is allowed to see of it.
 */

export type FormAsk = {
  /** The `audit_id` query value: one audit's report instead of a location's year. */
  auditId: string | undefined
  locationName: string | undefined
  year: string | undefined
  /** `x-user-id`, trusted here because host routes run after auth. */
  userId: string
}

export type FormLookups = {
  loadAudit: (auditId: string) => Promise<AuditReportTarget | null>
  findCaller: (userId: string) => Promise<Caller | null>
  /** Names of the locations whose `field_manager_user_ids` hold the user. */
  managedLocationNames: (userId: string) => Promise<string[]>
  /** The plant's current year, for a request that names none. */
  currentYear: number
}

export type FormDecision =
  | { kind: 'refused'; status: 400 | 403 | 404; message: string }
  | {
      kind: 'build'
      locationName: string
      year: number
      audit: AuditReportTarget | null
      /** A scoped field manager reads audits whose plan is approved, in either shape of the form. */
      completedOnly: boolean
    }

const refused = (status: 400 | 403 | 404, message: string): FormDecision => ({ kind: 'refused', status, message })

export async function decideLocationForm(ask: FormAsk, lookups: FormLookups): Promise<FormDecision> {
  const auditId = canonicalId(ask.auditId)
  const audit = auditId ? await lookups.loadAudit(auditId) : null
  if (auditId && !audit) return refused(404, 'Denetim bulunamadı.')

  // An audit's own place wins over any `location_name` sent with it.
  const locationName = audit?.locationName ?? String(ask.locationName ?? '').trim()
  const year = audit
    ? Number(audit.auditDay.slice(0, 4))
    : /^\d{4}$/.test(String(ask.year ?? ''))
      ? Number(ask.year)
      : lookups.currentYear
  if (!locationName) return refused(400, 'Lokasyon seçilmedi.')

  // A field manager gets the form of their own locations only, as the register shows them (#7/#24).
  const caller = await lookups.findCaller(ask.userId)
  const scoped = !!caller && isScopedFieldManager(caller)
  if (caller && scoped) {
    const mine = await lookups.managedLocationNames(caller.userId)
    if (!mine.some((name) => sameLocation(name, locationName))) {
      return refused(403, 'Bu lokasyonun formunu görme yetkiniz yok.')
    }
  }

  // One audit's report is for an approved audit when a field manager asks (row 75).
  const refusal = audit ? auditReportRefusal(caller, audit) : null
  if (refusal) return refused(refusal.status, refusal.message)

  return { kind: 'build', locationName, year, audit, completedOnly: scoped }
}
