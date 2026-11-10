import { describe, expect, it } from 'bun:test'
import {
  AUDIT_REPORT_PATH,
  auditReportFailureMessage,
  auditReportParams,
  canOpenAuditReport,
  isFieldManagerOnly,
} from './auditReport'

describe('isFieldManagerOnly', () => {
  it('is a field manager and nothing above', () => {
    expect(isFieldManagerOnly(['Field Manager'], false)).toBe(true)
    expect(isFieldManagerOnly(['Auditor', 'Field Manager'], false)).toBe(true)
  })

  it('is not Merkez Ekip, Super Admin, Müdür, the godmin, an auditor or nobody', () => {
    for (const roles of [
      ['Content Manager Core Team'],
      ['Super Admin'],
      ['Manager'],
      ['Field Manager', 'Manager'],
      ['Auditor'],
      [],
    ]) {
      expect(isFieldManagerOnly(roles, false)).toBe(false)
    }
    expect(isFieldManagerOnly(['Field Manager'], true)).toBe(false)
    expect(isFieldManagerOnly(['godmin'], false)).toBe(false)
  })
})

describe('canOpenAuditReport', () => {
  const base = {
    planStatus: 'completed',
    auditId: 'audit-1',
    locationId: 'loc-1',
    isFieldManager: true,
    fieldManagerLocationIds: ['loc-1', 'loc-2'],
  }

  it('offers the report of a completed audit of the field manager’s own location', () => {
    expect(canOpenAuditReport(base)).toBe(true)
  })

  it('does not offer it for an audit still waiting for approval, a planned one or a cancelled one', () => {
    for (const planStatus of ['pending_approval', 'planned', 'cancelled', '']) {
      expect(canOpenAuditReport({ ...base, planStatus })).toBe(false)
    }
  })

  it('does not offer it for another region’s audit', () => {
    expect(canOpenAuditReport({ ...base, locationId: 'loc-9' })).toBe(false)
    expect(canOpenAuditReport({ ...base, fieldManagerLocationIds: [] })).toBe(false)
  })

  it('does not offer it when the audit was never carried out', () => {
    expect(canOpenAuditReport({ ...base, auditId: null })).toBe(false)
    expect(canOpenAuditReport({ ...base, auditId: '  ' })).toBe(false)
    expect(canOpenAuditReport({ ...base, locationId: undefined })).toBe(false)
  })

  it('does not offer it to any other role', () => {
    expect(canOpenAuditReport({ ...base, isFieldManager: false })).toBe(false)
  })
})

describe('audit report request', () => {
  it('asks the location form for one audit, nothing else', () => {
    expect(AUDIT_REPORT_PATH).toBe('/reports/location-form.xlsx')
    expect(auditReportParams(' 6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c6 ')).toEqual({
      audit_id: '6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c6',
    })
  })
})

describe('auditReportFailureMessage', () => {
  it('passes on the server’s own words for a refusal', () => {
    expect(auditReportFailureMessage(403, ' Denetim onay bekliyor. ')).toBe('Denetim onay bekliyor.')
  })

  it('says who may open it when a refusal carries no words', () => {
    expect(auditReportFailureMessage(403, '')).toContain('kendi lokasyonunuzun onaylanmış denetimlerinin')
  })

  it('says what to do for a missing audit, a lapsed session and anything else', () => {
    expect(auditReportFailureMessage(404, '')).toContain('Sayfayı yenileyip tekrar deneyin')
    expect(auditReportFailureMessage(401, '')).toContain('Yeniden giriş yapıp tekrar deneyin')
    for (const status of [0, 500, 502]) {
      expect(auditReportFailureMessage(status, 'ignored')).toBe(
        'Rapor hazırlanamadı. Bağlantınızı kontrol edip tekrar deneyin.'
      )
    }
  })
})
