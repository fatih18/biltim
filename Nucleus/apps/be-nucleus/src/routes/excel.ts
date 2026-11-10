import { toDateKey } from '../guards/businessRules'
import { createPhotoEmbedder } from './findingPhotos'
import {
  oneAtATime,
  PHOTO_COLUMN_WIDTH,
  type PhotoLimits,
  type PhotoLoader,
  type PhotoSide,
  photoNote,
  REPORT_PHOTO_LIMITS,
} from './photoReport'

/**
 * One way to turn report rows into an .xlsx, so every report exports alike.
 *
 * Dates go in as real Excel dates shown dd.mm.yyyy. The first export wrote
 * `String(row.detected_date).slice(0, 10)`, and node-pg hands a `date` column
 * over as a Date — so every date in the file read "Tue Sep 08": no year, an
 * English weekday, and not sortable. Measured on the file the customer was
 * sent on 8 September.
 */

export type Column = {
  header: string
  key: string
  width?: number
  /** 'photo' shows the finding's photos of `side`, read from the row's photo columns (see findingPhotos.ts). */
  kind?: 'date' | 'number' | 'text' | 'photo'
  side?: PhotoSide
  /** Turns a raw value into what the cell shows (e.g. a status into Turkish). */
  map?: (value: unknown, row: Record<string, unknown>) => unknown
}

export type Sheet = { name: string; columns: Column[]; rows: Record<string, unknown>[] }

export type WorkbookOptions = {
  /** Where photos come from; the storage directory unless a test injects one. */
  photos?: PhotoLoader
  limits?: PhotoLimits
  /** Said after the photo note when a cap left photos out, e.g. how to narrow the report. */
  photoHint?: string
}

/** Height a row needs for its own text: one 15 pt line per `width` characters, wrapped. */
function textHeightPt(columns: Column[], values: Record<string, unknown>): number {
  let lines = 1
  for (const c of columns) {
    const v = values[c.key]
    if (c.kind === 'photo' || typeof v !== 'string' || v === '') continue
    const per = Math.max(1, Math.floor(c.width ?? Math.max(12, c.header.length + 4)))
    lines = Math.max(lines, v.split('\n').reduce((n, part) => n + Math.max(1, Math.ceil(part.length / per)), 0))
  }
  return lines * 15 + 3
}

/** A calendar day as an Excel date, without the time zone moving it. */
export function excelDay(value: unknown): Date | null {
  const key = toDateKey(value)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!m) return null
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
}

const STATUS_TR: Record<string, string> = {
  open: 'Açık',
  in_progress: 'Devam Ediyor',
  closed: 'Kapalı',
  planned: 'Planlandı',
  pending_approval: 'Onay Bekliyor',
  rejected: 'Düzeltme Bekliyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
}

export const statusTr = (value: unknown) => STATUS_TR[String(value ?? '')] ?? String(value ?? '')

/** Excel refuses sheet names over 31 characters or with []:*?/\ in them. */
function sheetName(name: string, taken: Set<string>): string {
  let base = name.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31).trim() || 'Sayfa'
  let candidate = base
  for (let n = 2; taken.has(candidate); n++) {
    const suffix = ` (${n})`
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`
  }
  taken.add(candidate)
  base = candidate
  return base
}

/** A workbook with photo columns waits its turn (memory, see findingPhotos.ts); one without does not. */
export function buildWorkbook(sheets: Sheet[], options: WorkbookOptions = {}): Promise<ArrayBuffer> {
  const withPhotos = sheets.some((s) => s.columns.some((c) => c.kind === 'photo'))
  return withPhotos ? oneAtATime(() => writeWorkbook(sheets, options)) : writeWorkbook(sheets, options)
}

async function writeWorkbook(sheets: Sheet[], options: WorkbookOptions): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Biltim 5S'
  workbook.created = new Date()
  const taken = new Set<string>()
  const limits = options.limits ?? REPORT_PHOTO_LIMITS
  const embedder = createPhotoEmbedder(workbook, options.photos, limits)

  for (const spec of sheets) {
    const sheet = workbook.addWorksheet(sheetName(spec.name, taken), {
      views: [{ state: 'frozen', ySplit: 1 }],
    })
    sheet.columns = spec.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? (c.kind === 'photo' ? PHOTO_COLUMN_WIDTH : Math.max(12, c.header.length + 4)),
      style: c.kind === 'date' ? { numFmt: 'dd.mm.yyyy' } : undefined,
    }))
    const head = sheet.getRow(1)
    head.font = { bold: true }
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
    head.alignment = { vertical: 'middle', wrapText: true }

    const written: Record<string, unknown>[] = []
    for (const row of spec.rows) {
      const out: Record<string, unknown> = {}
      for (const c of spec.columns) {
        const raw = c.map ? c.map(row[c.key], row) : row[c.key]
        if (c.kind === 'photo') out[c.key] = ''
        else if (c.kind === 'date') out[c.key] = excelDay(raw)
        else if (c.kind === 'number') {
          const n = Number(raw)
          out[c.key] = raw === null || raw === undefined || raw === '' || !Number.isFinite(n) ? null : n
        } else out[c.key] = raw === null || raw === undefined ? '' : raw
      }
      written.push(out)
      const added = sheet.addRow(out)
      added.alignment = { vertical: 'top', wrapText: true }
    }
    if (spec.rows.length > 0) {
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: spec.columns.length },
      }
    }

    const slots = spec.columns.flatMap((c, i) =>
      c.kind === 'photo' && c.side ? [{ col: i + 1, side: c.side, width: c.width ?? PHOTO_COLUMN_WIDTH }] : []
    )
    if (slots.length > 0) {
      const tally = await embedder.fill({
        sheet,
        rows: spec.rows,
        firstRow: 2,
        slots,
        textPt: (i) => textHeightPt(spec.columns, written[i] ?? {}),
        emptyNote: 'Fotoğraf yok',
      })
      // Two rows under the table, so the filter range ends where the data does.
      const note = photoNote(tally, limits, options.photoHint)
      if (note) {
        const cell = sheet.getCell(spec.rows.length + 3, 1)
        cell.value = note
        cell.font = { italic: true, color: { argb: 'FFB45309' } }
        cell.alignment = { vertical: 'top', wrapText: false }
      }
    }
  }
  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer
}

/** ASCII-only filename; the header cannot carry "ş" and browsers disagree on RFC 5987. */
export function xlsxResponse(buffer: ArrayBuffer, filename: string): Response {
  const safe = filename
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safe}"`,
      'Cache-Control': 'no-store',
    },
  })
}
