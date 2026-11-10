import { describe, expect, it } from 'bun:test'
import type { Caller, QueryParam } from '../guards/caller'
import { type AuditReportTarget, auditReportRefusal, dayTr, isScopedFieldManager, loadAuditReportTarget } from './auditReport'

const who = (roles: string[], isGod = false): Caller => ({ userId: 'u-1', isGod, roles })

const approved: AuditReportTarget = {
  auditId: 'a-1',
  locationName: 'Çelik Haddehane',
  auditDay: '2026-11-03',
  completed: true,
  rejected: false,
}
const waiting: AuditReportTarget = { ...approved, completed: false }
const sentBack: AuditReportTarget = { ...waiting, rejected: true }

describe('isScopedFieldManager', () => {
  it('is true for a field manager, also one who audits elsewhere', () => {
    expect(isScopedFieldManager(who(['field manager']))).toBe(true)
    expect(isScopedFieldManager(who(['auditor', 'field manager']))).toBe(true)
  })

  it('is false above the field manager, for other roles and for nobody', () => {
    for (const roles of [['manager'], ['super admin'], ['content manager core team'], ['field manager', 'manager']]) {
      expect(isScopedFieldManager(who(roles))).toBe(false)
    }
    expect(isScopedFieldManager(who(['field manager'], true))).toBe(false)
    expect(isScopedFieldManager(who(['auditor']))).toBe(false)
    expect(isScopedFieldManager(null)).toBe(false)
  })
})

describe('auditReportRefusal', () => {
  it('lets a field manager open the report of an approved audit', () => {
    expect(auditReportRefusal(who(['field manager']), approved)).toBeNull()
  })

  it('refuses a field manager the report of an audit still waiting for approval, and says what to do', () => {
    const refusal = auditReportRefusal(who(['field manager']), waiting)
    expect(refusal?.status).toBe(403)
    expect(refusal?.message).toContain('henüz tamamlanmadı')
    expect(refusal?.message).not.toContain('onayını bekliyor')
    expect(refusal?.message).toContain('Tamamlanan sekmesinden')
  })

  it('tells a field manager an audit that was sent back is with its team for correction and not final', () => {
    const refusal = auditReportRefusal(who(['field manager']), sentBack)
    expect(refusal?.status).toBe(403)
    expect(refusal?.message).toContain('düzeltilmek üzere ekibine geri gönderildi')
    expect(refusal?.message).toContain('henüz kesinleşmedi')
    expect(refusal?.message).toContain('Tamamlanan sekmesinden')
    expect(refusal?.message).not.toContain('henüz tamamlanmadı')
  })

  it('keeps the existing wording for an audit that is only waiting', () => {
    expect(auditReportRefusal(who(['field manager']), waiting)?.message).toBe(
      'Bu denetimin raporu açılamaz: denetim henüz tamamlanmadı. Tamamlandıktan sonra Tamamlanan sekmesinden raporu açabilirsiniz.'
    )
  })

  it('leaves every other role as it was, approved, waiting or sent back', () => {
    for (const caller of [
      who(['content manager core team']),
      who(['super admin']),
      who(['manager']),
      who([], true),
      who(['auditor']),
      null,
    ]) {
      expect(auditReportRefusal(caller, waiting)).toBeNull()
      expect(auditReportRefusal(caller, sentBack)).toBeNull()
      expect(auditReportRefusal(caller, approved)).toBeNull()
    }
  })
})

describe('loadAuditReportTarget', () => {
  const row = {
    id: 'a-1',
    department_name: '  Çelik Haddehane ',
    audit_date: new Date(2026, 10, 3, 9, 30),
    completed: true,
    rejected: false,
  }

  it('reads the place, the day and the approval of the audit', async () => {
    const target = await loadAuditReportTarget('a-1', async () => [row])
    expect(target).toEqual({
      auditId: 'a-1',
      locationName: 'Çelik Haddehane',
      auditDay: '2026-11-03',
      completed: true,
      rejected: false,
    })
  })

  it('reports an audit whose plans are not all approved as not completed', async () => {
    const target = await loadAuditReportTarget('a-1', async () => [{ ...row, completed: false }])
    expect(target?.completed).toBe(false)
  })

  it('reports an audit with a plan that was sent back as rejected', async () => {
    const target = await loadAuditReportTarget('a-1', async () => [{ ...row, completed: false, rejected: true }])
    expect(target?.rejected).toBe(true)
    expect(target?.completed).toBe(false)
  })

  it('answers null for an unknown audit', async () => {
    expect(await loadAuditReportTarget('nope', async () => [])).toBeNull()
  })

  it('asks for one audit by id, leaving out single findings and unplaced rows', async () => {
    const seen: Array<{ text: string; params: QueryParam[] }> = []
    await loadAuditReportTarget('a-1', async (text, params) => {
      seen.push({ text, params })
      return []
    })
    expect(seen).toHaveLength(1)
    expect(seen[0]?.params).toEqual(['a-1'])
    expect(seen[0]?.text).toContain('a.id::text = $1')
    expect(seen[0]?.text).toContain("a.source is distinct from 'single_finding'")
    expect(seen[0]?.text).toContain("bool_and(p.status = 'completed')")
    expect(seen[0]?.text).toContain("bool_or(p.status = 'rejected')")
    expect(seen[0]?.text).toContain('p.audit_id::text = a.id::text or p.id::text = a.plan_id::text')
  })
})

describe('dayTr', () => {
  it('writes a day the way the plant does', () => {
    expect(dayTr('2026-11-03')).toBe('03.11.2026')
  })
})
