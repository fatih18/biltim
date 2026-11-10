import { describe, expect, it } from 'bun:test'
import { auditNameOfTitle, SINGLE_FINDING_TITLE } from './index'

describe('SINGLE_FINDING_TITLE', () => {
  it('is the plain mark a finding raised on its own carries', () => {
    expect(SINGLE_FINDING_TITLE).toBe('Tekil Bulgu')
  })
})

describe('auditNameOfTitle', () => {
  it('returns a real audit name as it is, trimmed', () => {
    expect(auditNameOfTitle('Bölge 3 · 10.11.2026')).toBe('Bölge 3 · 10.11.2026')
    expect(auditNameOfTitle('  Bölge 3 · 10.11.2026 ')).toBe('Bölge 3 · 10.11.2026')
  })

  it('tells the plain mark from an audit name, the Turkish way', () => {
    expect(auditNameOfTitle('Tekil Bulgu')).toBe('')
    expect(auditNameOfTitle('TEKİL BULGU')).toBe('')
    expect(auditNameOfTitle('tekil bulgu')).toBe('')
  })

  it('is empty when there is no title at all', () => {
    expect(auditNameOfTitle(null)).toBe('')
    expect(auditNameOfTitle(undefined)).toBe('')
    expect(auditNameOfTitle('   ')).toBe('')
  })
})
