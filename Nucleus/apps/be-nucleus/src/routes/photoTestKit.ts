import type { Column } from './excel'
import type { PhotoLoader } from './photoReport'

/** Shared by the photo tests: a stand-in for the storage directory and a way to read a built sheet back. */

/** A UUID the photo reader accepts, numbered. */
export const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
export const files = (...ids: number[]) => ids.map((n) => ({ file_id: uid(n) }))
export const bytes = (size: number) => Buffer.alloc(size, 1)

export type Stored = Buffer | 'unsupported' | null

/** Ids not listed are files that are gone. `reads` records every file actually read. */
export function loaderOf(stored: Record<string, Stored>): { loader: PhotoLoader; reads: string[] } {
  const reads: string[] = []
  const loader: PhotoLoader = {
    locate: async (ids) => new Map(ids.map((id) => [id, { id, abs: id }])),
    read: async (file, budget) => {
      reads.push(file.id)
      const hit = stored[file.id]
      if (hit === 'unsupported') return 'unsupported'
      if (!hit) return null
      if (hit.length > budget) return 'over-budget'
      return { buffer: hit, extension: 'png', width: 640, height: 480 }
    },
  }
  return { loader, reads }
}

export const COLUMNS: Column[] = [
  { header: 'Bulgu No', key: 'finding_no', kind: 'number' },
  { header: 'Açıklama', key: 'description', width: 30 },
  { header: 'Öncesi Fotoğraf', key: 'photo_before', kind: 'photo', side: 'before', width: 26 },
  { header: 'Sonrası Fotoğraf', key: 'photo_after', kind: 'photo', side: 'after', width: 26 },
  { header: 'Durum', key: 'status' },
]

export const finding = (no: number, before: number[], after: number[], description = `bulgu ${no}`) => ({
  finding_no: no,
  description,
  status: 'open',
  photo_before_files: files(...before),
  photo_after_files: files(...after),
})

export async function readSheet(buffer: ArrayBuffer, sheetName = 'Bulgular') {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.getWorksheet(sheetName)
  if (!sheet) throw new Error(`no sheet ${sheetName}`)
  return { workbook, sheet }
}

export const anchors = (sheet: Awaited<ReturnType<typeof readSheet>>['sheet']) =>
  sheet.getImages().map((image) => ({
    col: image.range.tl.nativeCol,
    row: image.range.tl.nativeRow,
    rowOff: image.range.tl.nativeRowOff,
  }))

const EMU = 9525
/** `actual` EMU is `px` pixels, to within rounding. */
export const nearPx = (actual: number, px: number) => Math.abs(actual - px * EMU) <= 2
