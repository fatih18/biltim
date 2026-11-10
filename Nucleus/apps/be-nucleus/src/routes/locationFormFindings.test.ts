import { describe, expect, it } from 'bun:test'
import type { Caller, QueryParam } from '../guards/caller'
import type { AuditReportTarget } from './auditReport'
import { FORM_FINDINGS_SQL, loadFormFindings } from './locationFormFindings'
import { decideLocationForm } from './locationFormAccess'

const PLACE = { findingNames: ['Çelik Haddehane', 'Celik Haddehane'] }
const RANGE = { from: '2026-01-01', to: '2026-12-31' }
const AUDIT_ID = '6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c6'

const flat = (text: string) => text.replace(/\s+/g, ' ')

/** Records the one query the function sends. */
function recorder() {
  const seen: Array<{ text: string; params: QueryParam[] }> = []
  const read = async (text: string, params: QueryParam[]) => {
    seen.push({ text, params })
    return [{ finding_no: 1 }]
  }
  return { seen, read }
}

describe('the findings of a location form', () => {
  it('numbers its placeholders $1 to $5, uses each one, and binds exactly five parameters', async () => {
    const used = [...new Set([...FORM_FINDINGS_SQL.matchAll(/\$(\d+)/g)].map((m) => Number(m[1])))].sort()
    expect(used).toEqual([1, 2, 3, 4, 5])
    const { seen, read } = recorder()
    await loadFormFindings(PLACE, RANGE, ['a1', 'a2'], null, read)
    expect(seen).toHaveLength(1)
    expect(seen[0]?.params).toEqual([PLACE.findingNames, '2026-01-01', '2026-12-31', ['a1', 'a2'], null])
  })

  it('binds the audit asked for as $5, in the one-audit shape', async () => {
    const { seen, read } = recorder()
    expect(await loadFormFindings(PLACE, RANGE, [AUDIT_ID], AUDIT_ID, read)).toEqual([{ finding_no: 1 }])
    expect(seen[0]?.params.slice(3)).toEqual([[AUDIT_ID], AUDIT_ID])
  })

  it('takes the single findings raised inside the audit: the carrier rows of the audit’s own plan', () => {
    expect(flat(FORM_FINDINGS_SQL)).toContain(
      "or f.audit_id in (select c.id from five_s_audits c where c.source = 'single_finding' and c.plan_id is not null and c.plan_id = (select a.plan_id from five_s_audits a where a.id::text = $5))"
    )
  })

  it('reaches those carriers through $5 alone, so no audit but the requested one can add findings', () => {
    const carrier = flat(FORM_FINDINGS_SQL).split('or f.audit_id in (')[1] ?? ''
    expect(carrier).not.toBe('')
    expect([...new Set([...carrier.matchAll(/\$(\d+)/g)].map((m) => m[1]))]).toEqual(['5'])
    // A carrier with no plan, or an audit with no plan, matches nothing: `null = null` is not true.
    expect(carrier).toContain('c.plan_id is not null')
  })

  it('leaves the yearly form as it was: place and day, the year’s audits, the audit asked for', () => {
    expect(flat(FORM_FINDINGS_SQL)).toContain(
      'where f.is_active = true and ($5::text is null and (f.location_name = any($1::text[]) or f.audit_id = any($4::uuid[])) and f.detected_date between $2 and $3 or f.audit_id::text = $5 or f.audit_id in ('
    )
    expect(flat(FORM_FINDINGS_SQL)).toContain('order by f.detected_date asc, f.finding_no asc nulls last')
  })
})

describe('a field manager and the report of one audit', () => {
  const FIELD_MANAGER: Caller = { userId: 'u-fm', isGod: false, roles: ['field manager'] }
  const waiting: AuditReportTarget = {
    auditId: AUDIT_ID,
    locationName: 'Çelik Haddehane',
    auditDay: '2026-11-03',
    completed: false,
    rejected: false,
  }

  it('never reaches the findings query for an audit that is not approved, carriers included', async () => {
    const decision = await decideLocationForm(
      { auditId: AUDIT_ID, locationName: undefined, year: undefined, userId: 'u-fm' },
      {
        loadAudit: async () => waiting,
        findCaller: async () => FIELD_MANAGER,
        managedLocationNames: async () => ['Çelik Haddehane'],
        currentYear: 2026,
      }
    )
    expect(decision.kind).toBe('refused')
    const approved = await decideLocationForm(
      { auditId: AUDIT_ID, locationName: undefined, year: undefined, userId: 'u-fm' },
      {
        loadAudit: async () => ({ ...waiting, completed: true }),
        findCaller: async () => FIELD_MANAGER,
        managedLocationNames: async () => ['Çelik Haddehane'],
        currentYear: 2026,
      }
    )
    expect(approved).toMatchObject({ kind: 'build', completedOnly: true })
  })
})
