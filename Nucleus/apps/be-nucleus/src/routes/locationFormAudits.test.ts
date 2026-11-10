import { describe, expect, it } from 'bun:test'
import type { QueryParam } from '../guards/caller'
import { loadFormAudits } from './locationFormAudits'

const PLACE = { auditNames: ['Çelik Haddehane', 'Celik Haddehane'], ids: ['loc-1'] }
const RANGE = { from: '2026-01-01', to: '2026-12-31' }
const AUDIT_ID = '6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c6'

/** Records the one query the function sends. */
function recorder() {
  const seen: Array<{ text: string; params: QueryParam[] }> = []
  const read = async (text: string, params: QueryParam[]) => {
    seen.push({ text, params })
    return [{ id: AUDIT_ID }]
  }
  return { seen, read }
}

describe('loadFormAudits', () => {
  it('binds the completed-only flag as $6 for a scoped field manager, in the yearly shape', async () => {
    const { seen, read } = recorder()
    const rows = await loadFormAudits(PLACE, RANGE, null, true, read)
    expect(rows).toEqual([{ id: AUDIT_ID }])
    expect(seen).toHaveLength(1)
    expect(seen[0]?.params).toEqual([PLACE.auditNames, PLACE.ids, '2026-01-01', '2026-12-31', null, true])
  })

  it('applies the flag to the one-audit shape too', async () => {
    const { seen, read } = recorder()
    await loadFormAudits(PLACE, RANGE, AUDIT_ID, true, read)
    expect(seen[0]?.params.slice(4)).toEqual([AUDIT_ID, true])
  })

  it('does not narrow anyone else: the flag is false', async () => {
    const { seen, read } = recorder()
    await loadFormAudits(PLACE, RANGE, null, false, read)
    expect(seen[0]?.params[5]).toBe(false)
  })

  it('switches the approval requirement on that flag, and it is the one-audit report\'s: a linked plan, none unfinished', async () => {
    const { seen, read } = recorder()
    await loadFormAudits(PLACE, RANGE, null, true, read)
    const text = seen[0]?.text.replace(/\s+/g, ' ') ?? ''
    const linked = '(p.audit_id = a.id or p.id = a.plan_id)'
    // At least one plan is linked, either way...
    expect(text).toContain(`not $6::boolean or ( exists (select 1 from five_s_audit_plans p where ${linked})`)
    // ...and none of the linked plans is anything but completed (loadAuditReportTarget's bool_and).
    expect(text).toContain(
      `and not exists (select 1 from five_s_audit_plans p where ${linked} and p.status <> 'completed')`
    )
    expect(text).not.toContain("and p.status = 'completed'")
    expect(text).toContain("a.source is distinct from 'single_finding'")
  })

  it('asks the same of the plans as the one-audit report: both read them by either link', async () => {
    const { seen, read } = recorder()
    await loadFormAudits(PLACE, RANGE, null, true, read)
    const text = seen[0]?.text ?? ''
    // Two plans, one completed and one not: the report's bool_and is false, and so is `not exists (... <> 'completed')`.
    expect(text.match(/p\.audit_id = a\.id or p\.id = a\.plan_id/g)).toHaveLength(2)
  })
})
