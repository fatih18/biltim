import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { cleanLocationName, locationKey, offeredLocations } from './locationOptions'

const rows = (...names: Array<string | null>) => names.map((name) => ({ name }))

/*
 * The server folds names with the same function (be-nucleus routes/locationMatch.ts)
 * and its test holds this very table: if one side changes, the picker and the
 * report stop agreeing on what one place is. Invisible and decomposed
 * characters are written as escapes so nothing can strip them from this file.
 */
const KEY_EXAMPLES: Array<{ name: string; input: string; key: string }> = [
  { name: 'plain', input: 'Isı Merkezi', key: 'isi merkezi' },
  { name: 'capital I with a dot', input: 'ISI MERKEZİ', key: 'isi merkezi' },
  { name: 'dotless i', input: 'isı merkezi', key: 'isi merkezi' },
  { name: 'capitals with ş', input: 'IŞIK', key: 'işik' },
  { name: 'capital İ and Ş', input: 'İDARİ İŞLER', key: 'idari işler' },
  { name: 'ç', input: 'Çelikhane', key: 'çelikhane' },
  { name: 'spaces at the ends and doubled', input: '  Isı   Merkezi  ', key: 'isi merkezi' },
  { name: 'tab and new line', input: 'Isı\tMerkezi\n', key: 'isi merkezi' },
  { name: 'no-break space', input: 'Isı\u00A0Merkezi', key: 'isi merkezi' },
  { name: 'zero-width space, non-joiner, joiner, word joiner and BOM', input: 'I\u200Bs\u200Cı\u200D\u2060 Merkezi\uFEFF', key: 'isi merkezi' },
  { name: 'ö written as o and a combining diaeresis', input: 'Bo\u0308lge 3', key: 'bölge 3' },
  { name: 'ö written as one character', input: 'Bölge 3', key: 'bölge 3' },
  { name: 'i with a combining dot above', input: 'i\u0307dari', key: 'idari' },
  { name: 'capital I with a combining dot above', input: 'I\u0307dari', key: 'idari' },
  { name: 'nothing', input: '', key: '' },
  { name: 'only blanks and invisible characters', input: ' \u00A0\u200B\uFEFF\t', key: '' },
]

describe('locationKey', () => {
  it('makes case, spacing and the dot on i one place', () => {
    const spellings = ['Isı Merkezi', 'ISI MERKEZİ', ' ısı  merkezi ', 'Isı\u00A0Merkezi']
    expect(new Set(spellings.map(locationKey)).size).toBe(1)
  })

  it('keeps different places apart', () => {
    expect(locationKey('Bölge 3')).not.toBe(locationKey('Bölge 31'))
  })

  it.each(KEY_EXAMPLES)('gives the agreed key: $name', ({ input, key }) => {
    expect(locationKey(input)).toBe(key)
  })

  it('is stable: the key of a key is itself', () => {
    for (const { key } of KEY_EXAMPLES) expect(locationKey(key)).toBe(key)
  })

  it('writes the invisible characters as escapes in the source, where no editor can strip them', () => {
    const source = readFileSync(new URL('./locationOptions.ts', import.meta.url), 'utf8')
    expect(/[\u200B-\u200D\u2060\uFEFF\u0307]/.test(source)).toBe(false)
    expect(source).toContain('\\u200B-\\u200D\\u2060\\uFEFF\\u0307')
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
    expect(cleanLocationName('  Bölge \u00A0 3 ')).toBe('Bölge 3')
    expect(cleanLocationName(undefined)).toBe('')
  })
})
