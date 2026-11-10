import { describe, expect, it } from 'bun:test'
import { FORM_FINDINGS_SQL } from '../routes/locationFormFindings'
import { AUDIT_FINDINGS_SQL, countAuditFindings } from './auditFindings'
import { AUDIT, mailWorld, plan } from './mailKit'

/**
 * The number in the completion mail must be the number the one-audit report
 * shows. The statements are checked on a real Postgres by the orchestrator;
 * here the two texts are held together so they cannot drift apart.
 */

const flat = (text: string) => text.replace(/\s+/g, ' ').trim()

/** The statement from the carrier clause on, up to `end` when given. */
function carrierClause(sql: string, end?: string): string {
  const tail = flat(sql).split('or f.audit_id in (')[1] ?? ''
  return end ? (tail.split(end)[0] ?? '') : tail
}

describe('the findings count of the completion mail', () => {
  it('uses the report’s carrier rule word for word: the single findings raised inside the audit (R74) count too', () => {
    const report = carrierClause(FORM_FINDINGS_SQL, ' order by')
    const mail = carrierClause(AUDIT_FINDINGS_SQL).replaceAll('main.', '').replaceAll('$1', '$5')
    expect(report).toContain("c.source = 'single_finding'")
    expect(mail).toBe(report)
  })

  it('counts the findings that name the audit and only the ones that are switched on, as the report does', () => {
    const sql = flat(AUDIT_FINDINGS_SQL)
    expect(sql).toContain('where f.is_active = true and (f.audit_id::text = $1 or f.audit_id in (')
    expect(sql).not.toContain('is not false')
    expect(flat(FORM_FINDINGS_SQL)).toContain('where f.is_active = true and (')
    expect(flat(FORM_FINDINGS_SQL)).toContain('or f.audit_id::text = $5 or f.audit_id in (')
  })

  it('reaches the carriers through the one audit asked for, so no other audit adds findings', () => {
    const carrier = carrierClause(AUDIT_FINDINGS_SQL)
    expect([...new Set([...carrier.matchAll(/\$(\d+)/g)].map((m) => m[1]))]).toEqual(['1'])
    expect(carrier).toContain('c.plan_id is not null')
  })

  it('sends the audit as the only parameter and answers the count', async () => {
    const { deps, calls } = mailWorld({ plans: [plan()], findings: 7 })
    expect(await countAuditFindings(deps.sql, AUDIT)).toBe(7)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.text).toBe(AUDIT_FINDINGS_SQL)
    expect(calls[0]?.params).toEqual([AUDIT])
  })
})
