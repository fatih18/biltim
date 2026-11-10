import { describe, expect, it } from 'bun:test'
import { describedWithoutRoleAsTeam, withoutRoleAsTeam } from './teamLine'

describe('withoutRoleAsTeam', () => {
  it('removes the line a single finding saved before R19 carries, and leaves the other lines', () => {
    const stored = 'Soru: Raflar düzenli mi?\nAçıklama: Kırık raf\nEkip: Content Manager Core Team'
    expect(withoutRoleAsTeam(stored)).toBe('Soru: Raflar düzenli mi?\nAçıklama: Kırık raf')
    expect(withoutRoleAsTeam('Ekip: Manager\nKırık raf')).toBe('Kırık raf')
    expect(withoutRoleAsTeam('Kırık raf\nEkip: Auditor\nİkinci satır')).toBe('Kırık raf\nİkinci satır')
  })

  it('knows every role by its name and by its Turkish alias', () => {
    const names = [
      'Content Manager Core Team',
      'Merkez Ekip',
      'Manager',
      'Müdür',
      'Auditor',
      'Denetçi',
      'Field Manager',
      'Saha Sorumlusu',
      'Super Admin',
      'godmin',
    ]
    for (const name of names) expect(withoutRoleAsTeam(`Kırık raf\nEkip: ${name}`)).toBe('Kırık raf')
  })

  it('ignores case, Turkish letters and spacing in the role name', () => {
    for (const name of ['MERKEZ EKİP', 'merkez ekip', 'MERKEZ EKIP', 'MÜDÜR', 'müdür', 'DENETÇİ', 'denetçi', 'SUPER ADMIN', 'GODMIN', 'saha   sorumlusu', 'CONTENT MANAGER CORE TEAM']) {
      expect(withoutRoleAsTeam(`Kırık raf\nEkip:   ${name}  `)).toBe('Kırık raf')
    }
  })

  it('keeps a line that names a real team, an empty one and one that merely mentions a role', () => {
    for (const line of ['Ekip: Haddehane Ekibi', 'Ekip: Manager Ekibi', 'Ekip: Müdürlük', 'Ekip:', 'Ekip: Auditor, Haddehane']) {
      expect(withoutRoleAsTeam(`Kırık raf\n${line}`)).toBe(`Kırık raf\n${line}`)
    }
    expect(withoutRoleAsTeam('Bulgu Ekip: Manager')).toBe('Bulgu Ekip: Manager')
  })

  it('removes more than one such line and keeps the line endings of the rest', () => {
    expect(withoutRoleAsTeam('a\r\nEkip: Manager\r\nb\r\nEkip: Denetçi')).toBe('a\r\nb')
    expect(withoutRoleAsTeam('Ekip: Manager')).toBe('')
  })

  it('hands back text without an "Ekip:" as it is, and nothing as empty', () => {
    expect(withoutRoleAsTeam('Kırık raf')).toBe('Kırık raf')
    expect(withoutRoleAsTeam(null)).toBe('')
    expect(withoutRoleAsTeam(undefined)).toBe('')
  })
})

describe('describedWithoutRoleAsTeam', () => {
  it('returns the row with the description cleaned and every other column untouched, the original unchanged', () => {
    const row = { finding_no: 7, description: 'Kırık raf\nEkip: Super Admin', status: 'open' }
    expect(describedWithoutRoleAsTeam(row)).toEqual({ finding_no: 7, description: 'Kırık raf', status: 'open' })
    expect(row.description).toBe('Kırık raf\nEkip: Super Admin')
  })

  it('returns a row without a text description as it is', () => {
    const row = { finding_no: 8, description: null }
    expect(describedWithoutRoleAsTeam(row)).toBe(row)
    const bare = { finding_no: 9 }
    expect(describedWithoutRoleAsTeam(bare)).toBe(bare)
  })
})
