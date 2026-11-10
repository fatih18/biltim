import { describe, expect, it } from 'bun:test'
import { buildWorkbook } from './excel'
import { type PhotoLimits, photoNote } from './photoReport'
import { anchors, bytes, COLUMNS, finding, loaderOf, readSheet, type Stored, uid } from './photoTestKit'

describe('photo caps', () => {
  it('stops reading at the file cap, says so in the cells and under the table', async () => {
    const stored: Record<string, Stored> = {}
    for (const n of [1, 2, 3, 4]) stored[uid(n)] = bytes(100)
    const { loader, reads } = loaderOf(stored)
    const limits: PhotoLimits = { maxFiles: 2, maxBytes: 1_000_000, perSide: 3 }
    const rows = [finding(1, [1], [2]), finding(2, [3], [4])]
    const buffer = await buildWorkbook([{ name: 'Bulgular', columns: COLUMNS, rows }], {
      photos: loader,
      limits,
      photoHint: 'Daraltın.',
    })
    const { sheet } = await readSheet(buffer)
    expect(anchors(sheet).length).toBe(2)
    expect(reads).toEqual([uid(1), uid(2)])
    expect(sheet.getRow(3).getCell(3).value).toBe('Fotoğraf sınırı aşıldı')
    expect(sheet.getRow(3).getCell(4).value).toBe('Fotoğraf sınırı aşıldı')
    const note = String(sheet.getRow(5).getCell(1).value)
    expect(note).toContain('2 fotoğraf, rapor başına 2 fotoğraf')
    expect(note.endsWith('Daraltın.')).toBe(true)
  })

  it('stops reading at the byte cap too', async () => {
    const { loader } = loaderOf({ [uid(1)]: bytes(600), [uid(2)]: bytes(600) })
    const limits: PhotoLimits = { maxFiles: 50, maxBytes: 1000, perSide: 3 }
    const rows = [finding(1, [1], [2])]
    const { sheet } = await readSheet(
      await buildWorkbook([{ name: 'Bulgular', columns: COLUMNS, rows }], { photos: loader, limits })
    )
    expect(anchors(sheet).length).toBe(1)
    expect(sheet.getRow(2).getCell(4).value).toBe('Fotoğraf sınırı aşıldı')
  })

  it('counts the photos a cell could not show in the sheet note', async () => {
    const stored: Record<string, Stored> = {}
    for (const n of [1, 2, 3, 4, 5, 6]) stored[uid(n)] = bytes(100)
    const { loader } = loaderOf(stored)
    const limits: PhotoLimits = { maxFiles: 50, maxBytes: 1_000_000, perSide: 2 }
    const rows = [finding(1, [1, 2, 3, 4, 5, 6], [])]
    const { sheet } = await readSheet(
      await buildWorkbook([{ name: 'Bulgular', columns: COLUMNS, rows }], { photos: loader, limits })
    )
    expect(anchors(sheet).length).toBe(2)
    expect(sheet.getRow(2).getCell(3).value).toBe('+4 fotoğraf daha')
    expect(String(sheet.getRow(4).getCell(1).value)).toContain('4 fotoğraf, hücre başına en fazla 2 fotoğraf')
  })
})

describe('photoNote', () => {
  const limits: PhotoLimits = { maxFiles: 400, maxBytes: 150 * 1024 * 1024, perSide: 3 }
  const zero = { placed: 5, hidden: 0, missing: 0, unsupported: 0, capped: 0 }

  it('says nothing when every photo went in', () => {
    expect(photoNote(zero, limits)).toBe('')
  })

  it('names each cap with its number', () => {
    const note = photoNote({ ...zero, hidden: 4, capped: 7 }, limits)
    expect(note).toContain('4 fotoğraf, hücre başına en fazla 3 fotoğraf')
    expect(note).toContain('7 fotoğraf, rapor başına 400 fotoğraf / 150 MB sınırını aştığı için eklenmedi')
  })
})
