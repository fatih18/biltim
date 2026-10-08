import { toDateKey } from '../guards/businessRules'

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
  kind?: 'date' | 'number' | 'text'
  /** Turns a raw value into what the cell shows (e.g. a status into Turkish). */
  map?: (value: unknown, row: Record<string, unknown>) => unknown
}

export type Sheet = { name: string; columns: Column[]; rows: Record<string, unknown>[] }

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

export async function buildWorkbook(sheets: Sheet[]): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Biltim 5S'
  workbook.created = new Date()
  const taken = new Set<string>()

  for (const spec of sheets) {
    const sheet = workbook.addWorksheet(sheetName(spec.name, taken), {
      views: [{ state: 'frozen', ySplit: 1 }],
    })
    sheet.columns = spec.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? Math.max(12, c.header.length + 4),
      style: c.kind === 'date' ? { numFmt: 'dd.mm.yyyy' } : undefined,
    }))
    const head = sheet.getRow(1)
    head.font = { bold: true }
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
    head.alignment = { vertical: 'middle', wrapText: true }

    for (const row of spec.rows) {
      const out: Record<string, unknown> = {}
      for (const c of spec.columns) {
        const raw = c.map ? c.map(row[c.key], row) : row[c.key]
        if (c.kind === 'date') out[c.key] = excelDay(raw)
        else if (c.kind === 'number') {
          const n = Number(raw)
          out[c.key] = raw === null || raw === undefined || raw === '' || !Number.isFinite(n) ? null : n
        } else out[c.key] = raw === null || raw === undefined ? '' : raw
      }
      const added = sheet.addRow(out)
      added.alignment = { vertical: 'top', wrapText: true }
    }
    if (spec.rows.length > 0) {
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: spec.columns.length },
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
