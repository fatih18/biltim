import { describe, expect, it } from 'bun:test'
import type { Row } from '../db'
import { cleanName, findingSpellings, foldTr, locationKey, placeInYear, sameLocation, spellingsOf } from './locationMatch'

describe('foldTr / locationKey', () => {
  it('folds the Turkish capitals the way the screens do', () => {
    expect(foldTr('İSMAİL')).toBe('ismail')
    expect(foldTr('IŞIK')).toBe('ışık')
    expect(foldTr('  Müdür  ')).toBe('müdür')
    expect(foldTr(null)).toBe('')
  })

  it('treats case, stray spaces and the dot on i as one place', () => {
    const spellings = ['Isı Merkezi', 'ISI MERKEZİ', 'ısı merkezi', ' Isı  Merkezi ', 'Isı Merkezi', 'Isı​ Merkezi']
    expect(new Set(spellings.map(locationKey)).size).toBe(1)
  })

  it('does not merge different places', () => {
    expect(sameLocation('Bölge 3', 'Bölge 31')).toBe(false)
    expect(sameLocation('Bölge 3', 'Bölge 3 Pres')).toBe(false)
    expect(sameLocation('', '')).toBe(false)
  })

  it('composes a name typed with a combining accent', () => {
    expect(sameLocation('Bölge 3', 'Bölge 3')).toBe(true)
  })
})

describe('spellingsOf / cleanName', () => {
  it('returns the stored spellings as written, once each', () => {
    const stored = ['Bölge 3', 'BÖLGE 3', 'Bölge  3', 'Bölge 4', null, '', 'Bölge 3']
    expect(spellingsOf(stored, 'bölge 3')).toEqual(['Bölge 3', 'BÖLGE 3', 'Bölge  3'])
  })

  it('writes a name with one space between words', () => {
    expect(cleanName('  Bölge   3 ')).toBe('Bölge 3')
  })
})

/** A stand-in for the pool: answers by the table the SQL reads. */
const reader = (tables: { locations?: Row[]; findings?: Row[]; audits?: Row[] }) =>
  async (text: string): Promise<Row[]> => {
    if (text.includes('from five_s_locations')) return tables.locations ?? []
    if (text.includes('from five_s_findings')) return tables.findings ?? []
    if (text.includes('from five_s_audits')) return tables.audits ?? []
    throw new Error(`unexpected query: ${text.slice(0, 40)}`)
  }

describe('findingSpellings', () => {
  it('finds the findings whose location was typed with another case or spacing', async () => {
    const read = reader({ findings: [{ name: 'Isı Merkezi' }, { name: 'ISI  MERKEZİ' }, { name: 'Pres' }] })
    expect(await findingSpellings('ısı merkezi', read)).toEqual(['Isı Merkezi', 'ISI  MERKEZİ'])
  })

  it('matches nothing for an unknown place, never everything', async () => {
    expect(await findingSpellings('Yok', reader({ findings: [{ name: 'Pres' }] }))).toEqual([])
  })
})

describe('placeInYear', () => {
  const year = { from: '2026-01-01', to: '2026-12-31' }

  it('collects the location rows and every spelling findings and audits used', async () => {
    const read = reader({
      locations: [
        { id: 'loc-1', name: 'Bölge 3', is_active: true },
        { id: 'loc-2', name: 'bölge 3 ', is_active: false },
        { id: 'loc-9', name: 'Pres', is_active: true },
      ],
      findings: [{ name: 'Bölge 3' }, { name: 'BÖLGE  3' }, { name: 'Pres' }],
      audits: [{ name: 'bölge 3' }, { name: 'Pres' }],
    })
    expect(await placeInYear('BÖLGE 3', year, read)).toEqual({
      name: 'Bölge 3',
      ids: ['loc-1', 'loc-2'],
      findingNames: ['Bölge 3', 'BÖLGE  3'],
      auditNames: ['bölge 3'],
    })
  })

  it('keeps the asked name, cleaned, when no location carries it', async () => {
    const place = await placeInYear('  Eski   Ad ', year, reader({ findings: [{ name: 'Eski Ad' }] }))
    expect(place.name).toBe('Eski Ad')
    expect(place.ids).toEqual([])
    expect(place.findingNames).toEqual(['Eski Ad'])
  })
})
