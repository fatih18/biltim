import { describe, expect, it } from 'bun:test'
import {
  auditFindingsPayload,
  canDeleteAuditFindings,
  findingDeleteConfirmation,
  findingDeleteFailure,
  findingNumberLabel,
  findingRowsOf,
  findingsPanelText,
  mergeFindingRows,
  withoutFinding,
} from './findingDelete'

describe('canDeleteAuditFindings', () => {
  const can = (roleNames: string[], correcting = true, isGod = false) =>
    canDeleteAuditFindings({ correcting, roleNames, isGod })

  it('offers it to Merkez Ekip, Super Admin and the godmin', () => {
    expect(can(['Content Manager Core Team'])).toBe(true)
    expect(can(['Super Admin'])).toBe(true)
    expect(can([], true, true)).toBe(true)
    expect(can(['godmin'])).toBe(true)
  })

  it('does not offer it to Müdür, a field manager, an auditor or someone without a role', () => {
    for (const role of ['Manager', 'Field Manager', 'Auditor', 'basic']) expect(can([role])).toBe(false)
    expect(can([])).toBe(false)
  })

  it('offers it only while an audit is open for correction', () => {
    expect(can(['Super Admin'], false)).toBe(false)
    expect(can([], false, true)).toBe(false)
  })

  it('counts a person who holds Müdür and Merkez Ekip together as Merkez Ekip', () => {
    expect(can(['Manager', 'content manager core team'])).toBe(true)
  })
})

describe('withoutFinding', () => {
  it('drops the one finding and keeps the order of the rest', () => {
    const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(withoutFinding(list, 'b')).toEqual([{ id: 'a' }, { id: 'c' }])
    expect(list).toHaveLength(3)
  })

  it('leaves the list as it is when the finding is not in it', () => {
    expect(withoutFinding([{ id: 'a' }], 'z')).toEqual([{ id: 'a' }])
    expect(withoutFinding([], 'z')).toEqual([])
  })
})

describe('mergeFindingRows', () => {
  it('lists a finding once, highest number first, closed ones of the audit included', () => {
    const open = [
      { id: 'a', finding_no: 3, status: 'open' },
      { id: 'b', finding_no: 1, status: 'open' },
    ]
    const ofAudit = [
      { id: 'b', finding_no: 1, status: 'open' },
      { id: 'c', finding_no: 5, status: 'closed' },
    ]
    expect(mergeFindingRows(open, ofAudit).map((r) => r.id)).toEqual(['c', 'a', 'b'])
  })

  it('puts a finding with no number last and copes with empty lists', () => {
    const merged = mergeFindingRows([{ id: 'x' }], [{ id: 'y', finding_no: 2 }])
    expect(merged.map((r) => r.id)).toEqual(['y', 'x'])
    expect(mergeFindingRows([], [])).toEqual([])
  })

  it('keeps the open list’s copy when both hold the finding', () => {
    const merged = mergeFindingRows([{ id: 'a', finding_no: 1, status: 'in_progress' }], [{ id: 'a', finding_no: 1, status: 'open' }])
    expect(merged).toEqual([{ id: 'a', finding_no: 1, status: 'in_progress' }])
  })
})

describe('findingDeleteConfirmation', () => {
  it('says which finding goes, what disappears with it and that it cannot be undone', () => {
    const c = findingDeleteConfirmation({ finding_no: 12, status: 'open' })
    expect(c.title).toBe('Bulguyu sil')
    expect(c.message).toContain('#12 numaralı bulgu kalıcı olarak silinecek')
    expect(c.message).toContain('fotoğraf bağlantıları')
    expect(c.message).toContain('Bu işlem geri alınamaz.')
    expect(c.message).not.toContain('kapanış kanıtı')
    expect(c.tone).toBe('danger')
    expect(c.confirmLabel).toBe('Sil')
  })

  it('adds that a closed finding loses its closing evidence', () => {
    expect(findingDeleteConfirmation({ finding_no: 3, status: 'Closed' }).message).toContain(
      'Kapatılmış bulgunun kapanış kanıtı da kaybolur.'
    )
  })

  it('names a finding that has no number', () => {
    expect(findingNumberLabel({ finding_no: null })).toBe('Numarasız bulgu')
    expect(findingNumberLabel({})).toBe('Numarasız bulgu')
    expect(findingNumberLabel({ finding_no: 0 })).toBe('#0 numaralı bulgu')
  })
})

describe('findingDeleteFailure', () => {
  it('treats a finding the server no longer has as deleted', () => {
    expect(findingDeleteFailure(404)).toEqual({ message: 'Bu bulgu zaten silinmiş; liste güncellendi.', gone: true })
  })

  it('tells a refused caller who may delete, and a lapsed session what to do', () => {
    const refused = findingDeleteFailure(403)
    expect(refused.gone).toBe(false)
    expect(refused.message).toContain('yalnız Merkez Ekip ve Super Admin silebilir')
    expect(findingDeleteFailure(401).message).toContain('Yeniden giriş yapıp tekrar deneyin')
  })

  it('says to retry on anything else, a missing code included', () => {
    for (const code of [500, 0, null, undefined]) {
      const failure = findingDeleteFailure(code)
      expect(failure.gone).toBe(false)
      expect(failure.message).toContain('tekrar deneyin')
    }
  })
})

describe('findingsPanelText', () => {
  it('keeps the open-findings wording outside a correction and widens it inside one', () => {
    expect(findingsPanelText(false).title).toBe('Bu Lokasyondaki Açık Bulgular')
    expect(findingsPanelText(true).title).toBe('Bu Denetimin ve Lokasyonun Bulguları')
    expect(findingsPanelText(true).empty).not.toBe(findingsPanelText(false).empty)
  })
})

describe('findingRowsOf', () => {
  const rows = [{ id: 'a' }, { id: 'b' }]

  it('reads the list from every shape the API layer hands back', () => {
    expect(findingRowsOf(rows)).toEqual(rows)
    expect(findingRowsOf({ data: rows })).toEqual(rows)
    expect(findingRowsOf({ data: { data: rows } })).toEqual(rows)
  })

  it('answers an empty list for nothing or for a body without one', () => {
    expect(findingRowsOf(null)).toEqual([])
    expect(findingRowsOf(undefined)).toEqual([])
    expect(findingRowsOf({})).toEqual([])
    expect(findingRowsOf({ data: null })).toEqual([])
    expect(findingRowsOf({ data: {} })).toEqual([])
  })
})

describe('auditFindingsPayload', () => {
  it('asks for the audit’s active findings of any status, newest number first', () => {
    const payload = auditFindingsPayload('audit-1')
    expect(payload.filters).toEqual([
      { field: 'audit_id', operator: 'eq', value: 'audit-1' },
      { field: 'is_active', operator: 'eq', value: true },
    ])
    expect(payload.filters.some((f) => f.field === 'status')).toBe(false)
    expect(payload.orderBy).toBe('finding_no')
    expect(payload.orderDirection).toBe('desc')
    expect(payload.limit).toBe(200)
  })
})
