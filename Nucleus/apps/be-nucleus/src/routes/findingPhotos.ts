import type { Workbook, Worksheet } from 'exceljs'
import type { Row } from '../db'
import {
  emptyTally,
  NOTE_CAPPED,
  NOTE_MISSING,
  NOTE_UNSUPPORTED,
  type PhotoLimits,
  type PhotoLoader,
  type PhotoSlot,
  type PhotoTally,
  REPORT_PHOTO_LIMITS,
} from './photoReport'
import { fitBox, locatePhotos, type PhotoFile, photoIds, readPhoto } from './photos'

/**
 * Before / after photos inside a report workbook, for every report that lists
 * findings (the register, the overdue actions, the location form).
 *
 * exceljs holds the whole workbook, pictures included, in memory until
 * writeBuffer, so an export is capped twice: by files and by bytes. Once a
 * photo would cross either cap no further photo is read; its cell says so
 * and the sheet's note repeats it, rather than the export failing. Photos are
 * read one at a time, only while there is room (see locatePhotos).
 *
 * A cell holds up to `perSide` pictures stacked top to bottom; the rest are
 * counted in the cell as "+k fotoğraf daha". The row is made tall enough for
 * its pictures BEFORE they are placed, because exceljs turns a fractional row
 * offset into EMU using the row's height at that moment.
 */

const defaultLoader: PhotoLoader = { locate: locatePhotos, read: readPhoto }

/* One picture's box, in pixels; the column is 26 characters ≈ 187 px wide. */
const BOX_W = 178
const BOX_H = 116
const GAP_PX = 4
const PAD_PX = 3
const NOTE_LINE_PX = 20
const NOTE_LINE_CHARS = 24
const PT_PER_PX = 0.75
const MAX_ROW_PT = 409
const EMU_PER_PX = 9525

type Embedded = { imageId: number; width: number; height: number }
type Placed = { imageId: number; box: { width: number; height: number }; offsetPx: number }
type Cell = { slot: PhotoSlot; images: Placed[]; lines: string[]; px: number }

/** exceljs measures a column offset against 10000 EMU per width unit, 640000 for a default column. */
const colBase = (width: number) => (width === 9 ? 640000 : Math.floor(width * 10000))
const colFraction = (px: number, width: number) => Math.min(0.999, (px * EMU_PER_PX) / colBase(width))
const rowFraction = (px: number, heightPt: number) => Math.min(0.999, (px * EMU_PER_PX) / Math.floor(heightPt * 10000))

const noteLines = (lines: string[]) => lines.reduce((n, l) => n + Math.max(1, Math.ceil(l.length / NOTE_LINE_CHARS)), 0)

export function createPhotoEmbedder(
  workbook: Workbook,
  loader: PhotoLoader = defaultLoader,
  limits: PhotoLimits = REPORT_PHOTO_LIMITS
) {
  const embedded = new Map<string, Embedded>()
  const failed = new Map<string, 'unsupported' | 'missing'>()
  let bytes = 0
  let full = false

  /** The picture for one file id: placed again at no cost when already in the workbook, read once otherwise. */
  async function resolve(
    id: string,
    files: Map<string, PhotoFile | null>
  ): Promise<Embedded | 'unsupported' | 'missing' | 'capped'> {
    const have = embedded.get(id)
    if (have) return have
    const bad = failed.get(id)
    if (bad) return bad
    if (full || embedded.size >= limits.maxFiles) {
      full = true
      return 'capped'
    }
    const file = files.get(id)
    const read = file ? await loader.read(file, limits.maxBytes - bytes) : null
    if (read === 'over-budget') {
      full = true
      return 'capped'
    }
    if (read === null || read === 'unsupported') {
      const why = read === null ? 'missing' : 'unsupported'
      failed.set(id, why)
      return why
    }
    /*
     * Handed over as base64: exceljs types `buffer` as an ArrayBuffer-shaped
     * interface a Node Buffer does not satisfy, and the other typed ways in
     * (a filename read again at write time, a cast) are worse: the first fails
     * the whole export if a file vanishes in between, the second hides the
     * mismatch. The string is a third larger than the file; `bytes` below
     * counts the file, so the cap holds about 200 MB of strings.
     */
    const image = {
      imageId: workbook.addImage({ base64: read.buffer.toString('base64'), extension: read.extension }),
      width: read.width,
      height: read.height,
    }
    embedded.set(id, image)
    bytes += read.buffer.length
    return image
  }

  async function layout(
    slot: PhotoSlot,
    ids: string[],
    files: Map<string, PhotoFile | null>,
    tally: PhotoTally,
    emptyNote: string
  ): Promise<Cell> {
    const shown = ids.slice(0, limits.perSide)
    const hidden = ids.length - shown.length
    const images: Placed[] = []
    let offsetPx = PAD_PX
    let unsupported = 0
    let missing = 0
    let capped = 0
    for (const id of shown) {
      const got = await resolve(id, files)
      if (got === 'unsupported') unsupported += 1
      else if (got === 'missing') missing += 1
      else if (got === 'capped') capped += 1
      else {
        const box = fitBox(got, BOX_W, BOX_H)
        images.push({ imageId: got.imageId, box, offsetPx })
        offsetPx += box.height + GAP_PX
      }
    }
    const lines: string[] = []
    if (ids.length === 0 && emptyNote) lines.push(emptyNote)
    if (unsupported > 0) lines.push(unsupported === 1 ? NOTE_UNSUPPORTED : `${unsupported} fotoğraf Excel'e eklenemiyor (HEIC/WEBP)`)
    if (missing > 0) lines.push(missing === 1 ? NOTE_MISSING : `${missing} fotoğraf okunamadı`)
    if (capped > 0) lines.push(NOTE_CAPPED)
    if (hidden > 0) lines.push(`+${hidden} fotoğraf daha`)
    tally.unsupported += unsupported
    tally.missing += missing
    tally.capped += capped
    tally.hidden += hidden
    return { slot, images, lines, px: offsetPx + noteLines(lines) * NOTE_LINE_PX + PAD_PX }
  }

  /**
   * Fills the photo columns of rows already added to `sheet`, in row order, so
   * the caps spend on the first rows. `textPt(i)` is the height row i needs
   * for its own text, so a tall description is not clipped by the pictures'
   * row height. `emptyNote` is written where a finding has no photo.
   */
  async function fill(opts: {
    sheet: Worksheet
    rows: Row[]
    firstRow: number
    slots: PhotoSlot[]
    textPt?: (index: number) => number
    emptyNote?: string
  }): Promise<PhotoTally> {
    const tally = emptyTally()
    const wanted = opts.rows.flatMap((r) => opts.slots.flatMap((s) => photoIds(r, s.side).slice(0, limits.perSide)))
    const files = await loader.locate(wanted)
    for (const [i, source] of opts.rows.entries()) {
      const rowNumber = opts.firstRow + i
      const row = opts.sheet.getRow(rowNumber)
      const cells: Cell[] = []
      for (const slot of opts.slots) {
        cells.push(await layout(slot, photoIds(source, slot.side), files, tally, opts.emptyNote ?? ''))
      }
      const withImages = cells.some((c) => c.images.length > 0)
      if (withImages) {
        const need = Math.max(...cells.map((c) => c.px)) * PT_PER_PX
        row.height = Math.min(MAX_ROW_PT, Math.max(opts.textPt?.(i) ?? 0, need))
      }
      for (const cell of cells) {
        if (cell.lines.length > 0) {
          const target = row.getCell(cell.slot.col)
          target.value = cell.lines.join('\n')
          target.alignment = { vertical: cell.images.length > 0 ? 'bottom' : 'top', wrapText: true }
        }
        const heightPt = row.height ?? 0
        for (const img of cell.images) {
          const leftPx = Math.max(2, Math.floor((cell.slot.width * 7 + 5 - img.box.width) / 2))
          opts.sheet.addImage(img.imageId, {
            tl: {
              col: cell.slot.col - 1 + colFraction(leftPx, cell.slot.width),
              row: rowNumber - 1 + rowFraction(img.offsetPx, heightPt),
            },
            ext: img.box,
          })
          tally.placed += 1
        }
      }
    }
    return tally
  }

  return { fill, usage: () => ({ files: embedded.size, bytes }) }
}
