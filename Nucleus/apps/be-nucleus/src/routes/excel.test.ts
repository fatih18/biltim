import { describe, expect, it } from 'bun:test'
import { buildWorkbook, statusTr } from './excel'
import { anchors, bytes, COLUMNS, finding, loaderOf, nearPx, readSheet, type Stored, uid } from './photoTestKit'

describe('buildWorkbook photo columns', () => {
  it('writes the two photo columns after the finding text, with their headers', async () => {
    const { loader } = loaderOf({ [uid(1)]: bytes(100) })
    const buffer = await buildWorkbook([{ name: 'Bulgular', columns: COLUMNS, rows: [finding(1, [1], [])] }], {
      photos: loader,
    })
    const { sheet } = await readSheet(buffer)
    const header = sheet.getRow(1)
    expect([1, 2, 3, 4, 5].map((c) => header.getCell(c).value)).toEqual([
      'Bulgu No',
      'Açıklama',
      'Öncesi Fotoğraf',
      'Sonrası Fotoğraf',
      'Durum',
    ])
    expect(sheet.getColumn(3).width).toBe(26)
  })

  it('anchors a before and an after photo in their own cells of the finding row, and grows the row', async () => {
    const { loader } = loaderOf({ [uid(1)]: bytes(100), [uid(2)]: bytes(100) })
    const rows = [finding(1, [1], [2]), finding(2, [], [])]
    const { sheet } = await readSheet(await buildWorkbook([{ name: 'Bulgular', columns: COLUMNS, rows }], { photos: loader }))
    const placed = anchors(sheet)
    // Sheet row 2 is the first finding (zero-based row 1); columns C and D are 2 and 3.
    expect(placed.map((p) => [p.col, p.row])).toEqual([
      [2, 1],
      [3, 1],
    ])
    expect(nearPx(placed[0]?.rowOff ?? -1, 3)).toBe(true)
    // One 155 × 116 px picture plus padding needs about 91 pt.
    expect(sheet.getRow(2).height ?? 0).toBeGreaterThanOrEqual(90)
    // The second finding has no photo at all and says so.
    expect(sheet.getRow(3).getCell(3).value).toBe('Fotoğraf yok')
    expect(sheet.getRow(3).getCell(4).value).toBe('Fotoğraf yok')
  })

  it('stacks several photos of one cell down the row and counts the ones past the limit', async () => {
    const stored: Record<string, Stored> = {}
    for (const n of [1, 2, 3, 4, 5]) stored[uid(n)] = bytes(100)
    const { loader } = loaderOf(stored)
    const rows = [finding(1, [1, 2, 3, 4, 5], [])]
    const { sheet } = await readSheet(await buildWorkbook([{ name: 'Bulgular', columns: COLUMNS, rows }], { photos: loader }))
    const placed = anchors(sheet)
    expect(placed.map((p) => p.row)).toEqual([1, 1, 1])
    // Each picture is 116 px tall and 4 px apart: offsets 3, 123, 243.
    expect([3, 123, 243].map((px, i) => nearPx(placed[i]?.rowOff ?? -1, px))).toEqual([true, true, true])
    expect(sheet.getRow(2).getCell(3).value).toBe('+2 fotoğraf daha')
    // Three pictures and a note line fit inside the row.
    expect(sheet.getRow(2).height ?? 0).toBeGreaterThanOrEqual(((3 * 120 + 20) * 3) / 4)
    expect(sheet.getRow(2).height ?? 0).toBeLessThanOrEqual(409)
  })

  it('puts the existing note where Excel cannot embed the format, and where the file is gone', async () => {
    const { loader } = loaderOf({ [uid(1)]: 'unsupported', [uid(2)]: bytes(100) })
    const rows = [finding(1, [1], [2]), finding(2, [3], [])]
    const { sheet } = await readSheet(await buildWorkbook([{ name: 'Bulgular', columns: COLUMNS, rows }], { photos: loader }))
    expect(sheet.getRow(2).getCell(3).value).toBe("Fotoğraf biçimi Excel'e eklenemiyor (HEIC/WEBP)")
    expect(sheet.getRow(3).getCell(3).value).toBe('Fotoğraf okunamadı')
    expect(anchors(sheet).length).toBe(1)
    const note = String(sheet.getRow(5).getCell(1).value)
    expect(note).toContain('1 fotoğraf dosyası okunamadı')
    expect(note).toContain("1 fotoğraf Excel'in desteklemediği biçimde (HEIC/WEBP)")
  })

  it('shows one failed photo of several as a line under the pictures that did embed', async () => {
    const { loader } = loaderOf({ [uid(1)]: bytes(100), [uid(2)]: 'unsupported' })
    const rows = [finding(1, [1, 2], [])]
    const { sheet } = await readSheet(await buildWorkbook([{ name: 'Bulgular', columns: COLUMNS, rows }], { photos: loader }))
    expect(anchors(sheet).length).toBe(1)
    expect(sheet.getRow(2).getCell(3).value).toBe("Fotoğraf biçimi Excel'e eklenemiyor (HEIC/WEBP)")
  })

  it('places a photo used twice from one file in the workbook, and reads it once', async () => {
    const { loader, reads } = loaderOf({ [uid(1)]: bytes(100) })
    const rows = [finding(1, [1], [1]), finding(2, [1], [])]
    const { sheet, workbook } = await readSheet(await buildWorkbook([{ name: 'Bulgular', columns: COLUMNS, rows }], { photos: loader }))
    expect(anchors(sheet).length).toBe(3)
    expect(reads).toEqual([uid(1)])
    expect(workbook.model.media?.length).toBe(1)
  })

  it('reads the single-photo columns of an older finding', async () => {
    const { loader } = loaderOf({ [uid(7)]: bytes(100) })
    const old = { finding_no: 9, description: 'eski', status: 'open', photo_before_file_id: uid(7) }
    const { sheet } = await readSheet(await buildWorkbook([{ name: 'Bulgular', columns: COLUMNS, rows: [old] }], { photos: loader }))
    expect(anchors(sheet).length).toBe(1)
  })

  it('keeps a tall description from being clipped by a short picture row', async () => {
    const { loader } = loaderOf({ [uid(1)]: bytes(100) })
    const rows = [finding(1, [1], [], 'uzun açıklama '.repeat(60))]
    const { sheet } = await readSheet(await buildWorkbook([{ name: 'Bulgular', columns: COLUMNS, rows }], { photos: loader }))
    // 840 characters in a 30-wide column is 28 lines of 15 pt.
    expect(sheet.getRow(2).height ?? 0).toBeGreaterThanOrEqual(400)
  })

  it('leaves a workbook with no photo column alone: no loader call, no photo note', async () => {
    const { loader, reads } = loaderOf({})
    const plain = COLUMNS.filter((c) => c.kind !== 'photo')
    const rows = [finding(1, [1], [1])]
    const { sheet } = await readSheet(await buildWorkbook([{ name: 'Bulgular', columns: plain, rows }], { photos: loader }))
    expect(reads).toEqual([])
    expect(anchors(sheet).length).toBe(0)
    expect(sheet.getRow(3).getCell(1).value).toBeNull()
  })
})

describe('statusTr', () => {
  it('reads a rejected plan as waiting for its correction, and leaves the other plan statuses as they were', () => {
    expect(statusTr('rejected')).toBe('Düzeltme Bekliyor')
    expect(statusTr('pending_approval')).toBe('Onay Bekliyor')
    expect(statusTr('completed')).toBe('Tamamlandı')
    expect(statusTr('something_new')).toBe('something_new')
  })
})
