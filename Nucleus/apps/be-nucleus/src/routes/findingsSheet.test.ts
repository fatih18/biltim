import { describe, expect, it } from 'bun:test'
import type { Row } from '../db'
import { buildWorkbook } from './excel'
import { FINDING_NUMBERS_SELECT, FINDINGS_SHEET_COLUMNS, PHOTO_SHEET_COLUMNS } from './findingsSheet'
import { anchors, bytes, finding, loaderOf, readSheet, uid } from './photoTestKit'

/** The findings workbook's columns, with "Eski No" (R61) after "Bulgu No". */

const build = (rows: Row[]) =>
  buildWorkbook([{ name: 'Bulgular', columns: FINDINGS_SHEET_COLUMNS, rows }], {
    photos: loaderOf({ [uid(1)]: bytes(100), [uid(2)]: bytes(100) }).loader,
  })

describe('the columns', () => {
  it('put "Eski No" right after "Bulgu No", as the second column', () => {
    const headers = FINDINGS_SHEET_COLUMNS.map((column) => column.header)
    expect(headers.slice(0, 3)).toEqual(['Bulgu No', 'Eski No', 'Kaynak'])
    expect(headers.filter((header) => header === 'Eski No')).toHaveLength(1)
  })

  it('read the old number from the column the query selects, as a number', () => {
    const old = FINDINGS_SHEET_COLUMNS.find((column) => column.header === 'Eski No')
    expect(old).toMatchObject({ key: 'previous_finding_no', kind: 'number' })
    expect(FINDING_NUMBERS_SELECT).toBe('f.finding_no, f.previous_finding_no')
  })

  it('keep every other column, in the order the file had them, and give every key once', () => {
    expect(FINDINGS_SHEET_COLUMNS.map((column) => column.header)).toEqual([
      'Bulgu No',
      'Eski No',
      'Kaynak',
      'Ana Denetim',
      'Tespit Tarihi',
      'Lokasyon',
      'Bulgu Tipi',
      '5S Adımı',
      'Açıklama',
      'Öncesi Fotoğraf',
      'Sonrası Fotoğraf',
      'Yapılacak Aksiyon',
      'Termin',
      'Kapanış Tarihi',
      'Sorumlu',
      'Denetçi',
      'Durum',
    ])
    const keys = FINDINGS_SHEET_COLUMNS.map((column) => column.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('use the two photo columns the other reports share', () => {
    expect(FINDINGS_SHEET_COLUMNS.filter((column) => column.kind === 'photo')).toEqual(PHOTO_SHEET_COLUMNS)
  })
})

describe('the workbook', () => {
  it('writes the old number of a renumbered finding beside its new one, and leaves the cell empty otherwise', async () => {
    const rows = [
      { ...finding(7, [], []), previous_finding_no: 2 },
      { ...finding(8, [], []), previous_finding_no: null },
      finding(9, [], []),
    ]
    const { sheet } = await readSheet(await build(rows))
    expect([1, 2].map((c) => sheet.getRow(1).getCell(c).value)).toEqual(['Bulgu No', 'Eski No'])
    expect([2, 3, 4].map((r) => sheet.getRow(r).getCell(1).value)).toEqual([7, 8, 9])
    expect([2, 3, 4].map((r) => sheet.getRow(r).getCell(2).value)).toEqual([2, null, null])
  })

  it('does not turn a missing old number into a 0 or a text', async () => {
    const rows = [
      { ...finding(1, [], []), previous_finding_no: '' },
      { ...finding(2, [], []), previous_finding_no: undefined },
    ]
    const { sheet } = await readSheet(await build(rows))
    expect([2, 3].map((r) => sheet.getRow(r).getCell(2).value)).toEqual([null, null])
  })

  it('keeps the photos in their own columns, now one to the right', async () => {
    const rows = [{ ...finding(1, [1], [2]), previous_finding_no: 3 }]
    const { sheet } = await readSheet(await build(rows))
    // Columns J and K (zero-based 9 and 10) of the first finding row (zero-based 1).
    expect(anchors(sheet).map((placed) => [placed.col, placed.row])).toEqual([
      [9, 1],
      [10, 1],
    ])
    expect(sheet.getColumn(2).width).toBe(10)
  })
})
