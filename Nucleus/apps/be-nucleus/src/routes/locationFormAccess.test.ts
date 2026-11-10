import { describe, expect, it } from 'bun:test'
import type { Caller } from '../guards/caller'
import type { AuditReportTarget } from './auditReport'
import { type FormAsk, type FormLookups, decideLocationForm } from './locationFormAccess'

const FIELD_MANAGER: Caller = { userId: 'u-fm', isGod: false, roles: ['field manager'] }
const MANAGER: Caller = { userId: 'u-mgr', isGod: false, roles: ['manager'] }
const CENTRAL: Caller = { userId: 'u-ce', isGod: false, roles: ['content manager core team'] }
const GOD: Caller = { userId: 'u-god', isGod: true, roles: ['godmin'] }

const AUDIT_ID = '6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c6'

/** An audit of `Çelik Haddehane`, approved. */
const approved: AuditReportTarget = {
  auditId: AUDIT_ID,
  locationName: 'Çelik Haddehane',
  auditDay: '2026-11-03',
  completed: true,
}
const waiting: AuditReportTarget = { ...approved, completed: false }

type Setup = {
  audits?: Record<string, AuditReportTarget>
  caller?: Caller | null
  managed?: string[]
}

/** Lookups answered from memory; `calls` records what the decision asked for. */
function lookups(setup: Setup = {}) {
  const calls: { loadAudit: string[]; managed: string[] } = { loadAudit: [], managed: [] }
  const value: FormLookups = {
    loadAudit: async (id) => {
      calls.loadAudit.push(id)
      return setup.audits?.[id] ?? null
    },
    findCaller: async () => setup.caller ?? null,
    managedLocationNames: async (userId) => {
      calls.managed.push(userId)
      return setup.managed ?? []
    },
    currentYear: 2026,
  }
  return { value, calls }
}

const ask = (over: Partial<FormAsk> = {}): FormAsk => ({
  auditId: undefined,
  locationName: undefined,
  year: undefined,
  userId: 'u-1',
  ...over,
})

describe('decideLocationForm: one audit asked for', () => {
  it('answers 404 for an audit that does not exist, before looking at anything else', async () => {
    const { value, calls } = lookups({ caller: FIELD_MANAGER })
    const decision = await decideLocationForm(ask({ auditId: AUDIT_ID, locationName: 'Çelik Haddehane' }), value)
    expect(decision).toEqual({ kind: 'refused', status: 404, message: 'Denetim bulunamadı.' })
    expect(calls.managed).toEqual([])
  })

  it('looks the audit up by its canonical id, whatever spelling was sent', async () => {
    const { value, calls } = lookups({ audits: { [AUDIT_ID]: approved }, caller: CENTRAL })
    await decideLocationForm(ask({ auditId: AUDIT_ID.toUpperCase() }), value)
    expect(calls.loadAudit).toEqual([AUDIT_ID])
  })

  it('takes the place and the year from the audit, not from a location_name sent with it', async () => {
    const { value } = lookups({ audits: { [AUDIT_ID]: approved }, caller: CENTRAL })
    const decision = await decideLocationForm(
      ask({ auditId: AUDIT_ID, locationName: 'Başka Bölge', year: '2019' }),
      value
    )
    expect(decision).toEqual({
      kind: 'build',
      locationName: 'Çelik Haddehane',
      year: 2026,
      audit: approved,
      completedOnly: false,
    })
  })

  it('does not let a field manager pair their own location_name with another region\'s audit', async () => {
    // The manager of "Bölge 1" names their own place, but the audit is Çelik Haddehane's.
    const { value, calls } = lookups({
      audits: { [AUDIT_ID]: approved },
      caller: FIELD_MANAGER,
      managed: ['Bölge 1'],
    })
    const decision = await decideLocationForm(ask({ auditId: AUDIT_ID, locationName: 'Bölge 1' }), value)
    expect(decision).toEqual({
      kind: 'refused',
      status: 403,
      message: 'Bu lokasyonun formunu görme yetkiniz yok.',
    })
    expect(calls.managed).toEqual(['u-fm'])
  })

  it('refuses a field manager the report of another region\'s audit, approved or not', async () => {
    for (const audit of [approved, waiting]) {
      const { value } = lookups({ audits: { [AUDIT_ID]: audit }, caller: FIELD_MANAGER, managed: ['Soğuk Haddehane'] })
      const decision = await decideLocationForm(ask({ auditId: AUDIT_ID }), value)
      expect(decision.kind).toBe('refused')
      if (decision.kind === 'refused') expect(decision.status).toBe(403)
    }
  })

  it('opens an approved audit of their own place to a field manager, name matched the Turkish way', async () => {
    const { value } = lookups({ audits: { [AUDIT_ID]: approved }, caller: FIELD_MANAGER, managed: ['ÇELİK  haddehane'] })
    const decision = await decideLocationForm(ask({ auditId: AUDIT_ID }), value)
    expect(decision.kind).toBe('build')
    if (decision.kind === 'build') expect(decision.completedOnly).toBe(true)
  })

  it('keeps an unapproved audit of their own place shut, and says it is not completed yet', async () => {
    const { value } = lookups({ audits: { [AUDIT_ID]: waiting }, caller: FIELD_MANAGER, managed: ['Çelik Haddehane'] })
    const decision = await decideLocationForm(ask({ auditId: AUDIT_ID }), value)
    expect(decision.kind).toBe('refused')
    if (decision.kind === 'refused') {
      expect(decision.status).toBe(403)
      expect(decision.message).toContain('henüz tamamlanmadı')
    }
  })

  it('shows an unapproved audit to Müdür, Merkez Ekip and the godmin', async () => {
    for (const caller of [MANAGER, CENTRAL, GOD]) {
      const { value, calls } = lookups({ audits: { [AUDIT_ID]: waiting }, caller })
      const decision = await decideLocationForm(ask({ auditId: AUDIT_ID }), value)
      expect(decision).toEqual({
        kind: 'build',
        locationName: 'Çelik Haddehane',
        year: 2026,
        audit: waiting,
        completedOnly: false,
      })
      expect(calls.managed).toEqual([])
    }
  })
})

describe('decideLocationForm: a location\'s year', () => {
  it('asks a scoped field manager for approved audits only: the yearly form is no way round the report rule', async () => {
    const { value } = lookups({ caller: FIELD_MANAGER, managed: ['Çelik Haddehane'] })
    const decision = await decideLocationForm(ask({ locationName: 'Çelik Haddehane', year: '2025' }), value)
    expect(decision).toEqual({
      kind: 'build',
      locationName: 'Çelik Haddehane',
      year: 2025,
      audit: null,
      completedOnly: true,
    })
  })

  it('treats a person who is a field manager and also Müdür as unscoped', async () => {
    const both: Caller = { userId: 'u-both', isGod: false, roles: ['field manager', 'manager'] }
    const { value } = lookups({ caller: both })
    const decision = await decideLocationForm(ask({ locationName: 'Çelik Haddehane' }), value)
    expect(decision.kind).toBe('build')
    if (decision.kind === 'build') expect(decision.completedOnly).toBe(false)
  })

  it('leaves every other role the whole year', async () => {
    for (const caller of [MANAGER, CENTRAL, GOD]) {
      const { value, calls } = lookups({ caller })
      const decision = await decideLocationForm(ask({ locationName: 'Çelik Haddehane' }), value)
      expect(decision.kind === 'build' && decision.completedOnly).toBe(false)
      expect(calls.managed).toEqual([])
    }
  })

  it('refuses a field manager the yearly form of a place they do not manage', async () => {
    const { value } = lookups({ caller: FIELD_MANAGER, managed: ['Bölge 1'] })
    const decision = await decideLocationForm(ask({ locationName: 'Çelik Haddehane' }), value)
    expect(decision).toEqual({
      kind: 'refused',
      status: 403,
      message: 'Bu lokasyonun formunu görme yetkiniz yok.',
    })
  })

  it('answers 400 when no location is named, and falls back to the current year without one', async () => {
    const none = await decideLocationForm(ask({ locationName: '   ' }), lookups({ caller: CENTRAL }).value)
    expect(none).toEqual({ kind: 'refused', status: 400, message: 'Lokasyon seçilmedi.' })

    for (const year of [undefined, '', 'abcd', '20266']) {
      const decision = await decideLocationForm(ask({ locationName: 'Çelik Haddehane', year }), lookups({ caller: CENTRAL }).value)
      expect(decision.kind === 'build' && decision.year).toBe(2026)
    }
  })
})
