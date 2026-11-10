import { describe, expect, it } from 'bun:test'
import { cleanLocationName, locationKey, offeredLocations } from './locationOptions'

const rows = (...names: Array<string | null>) => names.map((name) => ({ name }))

describe('locationKey', () => {
  it('makes case, spacing and the dot on i one place', () => {
    const spellings = ['Isı Merkezi', 'ISI MERKEZİ', ' ısı  merkezi ', 'Isı Merkezi']
    expect(new Set(spellings.map(locationKey)).size).toBe(1)
  })

  it('keeps different places apart', () => {
    expect(locationKey('Bölge 3')).not.toBe(locationKey('Bölge 31'))
  })
})

describe('offeredLocations', () => {
  it('offers every active location once, in Turkish order', () => {
    expect(offeredLocations(rows('Çelikhane', 'Bölge 3', 'Isı Merkezi', 'ISI MERKEZİ', 'İdari İşler', 'Pres'), null)).toEqual([
      'Bölge 3',
      'Çelikhane',
      'Isı Merkezi',
      'İdari İşler',
      'Pres',
    ])
  })

  it('drops empty names and trims the rest', () => {
    expect(offeredLocations(rows(null, '', '   ', '  Pres  Hattı '), null)).toEqual(['Pres Hattı'])
  })

  it('narrows to a field manager’s own places however their names are cased', () => {
    const all = rows('Bölge 3', 'Pres', 'ISI MERKEZİ')
    expect(offeredLocations(all, ['bölge 3', 'Isı Merkezi'])).toEqual(['Bölge 3', 'ISI MERKEZİ'])
  })

  it('offers nothing, not everything, to someone who manages no place', () => {
    expect(offeredLocations(rows('Bölge 3', 'Pres'), [])).toEqual([])
  })

  it('does not stop at 200: every row it is given is offered', () => {
    const many = Array.from({ length: 450 }, (_, i) => ({ name: `Lokasyon ${String(i).padStart(3, '0')}` }))
    expect(offeredLocations(many, null).length).toBe(450)
  })
})

describe('cleanLocationName', () => {
  it('writes one space between words', () => {
    expect(cleanLocationName('  Bölge   3 ')).toBe('Bölge 3')
    expect(cleanLocationName(undefined)).toBe('')
  })
})
