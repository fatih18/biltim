import { Type as t } from '@sinclair/typebox'
import { defineRoute } from 'nucleus-core-ts/server'
import { type Row, query } from '../db'
import { todayAtPlant, toDateKey } from '../guards/businessRules'
import { callerById, isCentral } from '../guards/caller'
import { excelDay, xlsxResponse } from './excel'
import { fitBox, locatePhotos, type Photo, photoIds, readPhoto } from './photos'

/**
 * A location's year on the customer's own paper form (F2, 7 Oct mail).
 *
 * The plant keeps one workbook per area per year, "5S Denetim Bulgu ve Soru
 * Formu": a findings sheet ("5S DENETİM BULGU FORMU" — number, date, type,
 * description, before/after photos, action, due date, completion date) and
 * one question sheet per audit ("5S Denetim Formu (Mart)" …) with every
 * question's rating, explanation and points, the step totals and the overall
 * score. They asked for reports "in the structure of the attached form"; this
 * writes that workbook from the records, so the paper copy no longer has to
 * be kept by hand. Layout and wording follow their file.
 */

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]
const RATING_TR: Record<string, string> = { good: 'İyi', medium: 'Orta', bad: 'Kötü' }
const RATING_FACTOR: Record<string, number> = { good: 1, medium: 0.5, bad: 0 }

const thin = { style: 'thin' as const, color: { argb: 'FF9CA3AF' } }
const BOX = { top: thin, left: thin, bottom: thin, right: thin }
const HEAD_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFDDEBF7' } }

/** The finding's own words: the "Açıklama:" line the audit form writes, or all of it. */
function findingText(description: unknown): string {
  const text = String(description ?? '').trim()
  const explanation = /(?:^|\n)Açıklama:\s*(.+)/.exec(text)?.[1]?.trim()
  const question = /(?:^|\n)Soru:\s*(.+)/.exec(text)?.[1]?.trim()
  if (explanation && question) return `${question}\n${explanation}`
  return explanation || text
}

/** Field managers' names for the "Sorumlu" line. */
async function responsibleNames(locationName: string): Promise<string> {
  const rows = await query(
    `select coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), u.email) as name
       from five_s_locations l
       cross join lateral jsonb_array_elements_text(coalesce(l.field_manager_user_ids, '[]'::jsonb)) as fm(id)
       join users u on u.id::text = fm.id
       left join profiles p on p.user_id = u.id
      where lower(trim(l.name)) = lower(trim($1))`,
    [locationName]
  )
  return rows.map((r) => String(r.name ?? '')).filter(Boolean).join(', ')
}

/*
 * One location form at a time, in the process.
 *
 * exceljs holds the whole workbook — every embedded photo — in memory until
 * writeBuffer, which then writes a second copy as the zip. At the photo cap
 * (buildForm) that is 150 MB of pictures held twice, and two people pressing
 * the button together would hold it four times. Later requests wait in order
 * rather than being refused: the export is rare, and a wait beats an error.
 */
let formQueue: Promise<unknown> = Promise.resolve()

export function oneAtATime<T>(task: () => Promise<T>): Promise<T> {
  const run = formQueue.then(task)
  formQueue = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

async function buildForm(locationName: string, year: number): Promise<Response> {
  const from = `${year}-01-01`
  const to = `${year}-12-31`
  const [findings, audits, steps, questions, sorumlu] = await Promise.all([
    query(
      `select f.finding_no, f.detected_date, f.location_name, f.finding_type, f.description,
              f.action_to_take, f.due_date, f.completed_at, f.status,
              f.photo_before_files, f.photo_before_file_id, f.photo_before_url,
              f.photo_after_files, f.photo_after_file_id, f.photo_after_url
         from five_s_findings f
        where f.is_active = true and lower(trim(f.location_name)) = lower(trim($1))
          and f.detected_date between $2 and $3
        order by f.detected_date asc, f.finding_no asc nulls last`,
      [locationName, from, to]
    ),
    query(
      `select a.id, a.audit_date, a.auditor_name, a.total_score, a.target_score,
              a.score_s1, a.score_s2, a.score_s3, a.score_s4, a.score_s5
         from five_s_audits a
        where a.is_active = true and a.source is distinct from 'single_finding'
          and lower(trim(a.department_name)) = lower(trim($1))
          and a.audit_date >= $2 and a.audit_date < ($3::date + 1)
        order by a.audit_date asc`,
      [locationName, from, to]
    ),
    query(`select code, title, max_score, "order" from five_s_steps where is_active order by "order"`),
    query(
      `select q.external_id, q."order", q.text, q.max_score, s.code as step_code
         from five_s_questions q join five_s_steps s on s.id = q.step_id
        where q.is_active order by s."order", q."order"`
    ),
    responsibleNames(locationName),
  ])

  const answersByAudit = new Map<string, Map<string, Row>>()
  if (audits.length > 0) {
    const rows = await query(
      `select audit_id, question_id, rating, explanation from five_s_audit_answers
        where is_active and audit_id = any($1::uuid[])`,
      [audits.map((a) => String(a.id))]
    )
    for (const r of rows) {
      const key = String(r.audit_id)
      const m = answersByAudit.get(key) ?? new Map<string, Row>()
      m.set(String(r.question_id), r)
      answersByAudit.set(key, m)
    }
  }

  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Biltim 5S'
  workbook.created = new Date()
  const LOC = locationName.toLocaleUpperCase('tr')

  /* ── 5S DENETİM BULGU FORMU ── */
  const fs = workbook.addWorksheet('5S DENETİM BULGU FORMU', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  fs.columns = [
    { width: 9 }, { width: 13 }, { width: 22 }, { width: 24 }, { width: 44 },
    { width: 26 }, { width: 26 }, { width: 26 }, { width: 13 }, { width: 13 },
  ]
  fs.getCell('A1').value = 'KYS.137/Rev.1/202502'
  fs.mergeCells('A2:J2')
  fs.getCell('A2').value = `${year} YILI ${LOC} 5S DENETİM BULGU FORMU`
  fs.getCell('A2').font = { bold: true, size: 13 }
  fs.getCell('A2').alignment = { horizontal: 'center' }
  fs.getCell('A3').value = 'Sorumlu'
  fs.getCell('A3').font = { bold: true }
  fs.getCell('B3').value = sorumlu || '—'
  const head = fs.getRow(5)
  head.values = [
    'Bulgu No', 'Tespit Tarihi', 'Tespit Edildiği Yer', 'Bulgu Tipi', 'Bulgu Açıklaması',
    'Fotoğraf / Öncesi', 'Fotoğraf / Sonrası', 'Alınacak Faaliyet', 'Termin Tarihi', 'İşin Tam. Tar.',
  ]
  head.font = { bold: true }
  head.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  head.eachCell((c) => {
    c.fill = HEAD_FILL
    c.border = BOX
  })

  /*
   * One photo per side — the first, as on the paper form — found in one
   * lookup and read one at a time as the rows are written. exceljs builds the
   * whole file in memory, so a year's export is capped twice: by count, and
   * by the bytes embedded — 400 photos of up to 15 MB each is 6 GB, and the
   * count alone let all of it in. Once a photo would cross either cap, no
   * further photo is read; the cell says so rather than the export failing.
   */
  const MAX_PHOTOS = 400
  const MAX_PHOTO_TOTAL_BYTES = 150 * 1024 * 1024
  const wantedIds = findings.flatMap((f) => [photoIds(f, 'before')[0], photoIds(f, 'after')[0]]).filter(
    (id): id is string => Boolean(id)
  )
  const files = await locatePhotos(wantedIds)
  const embeddedByFile = new Map<string, { imageId: number; photo: Pick<Photo, 'width' | 'height'> }>()
  const failedByFile = new Map<string, 'unsupported' | null>()
  let embeddedBytes = 0
  let full = false

  let r = 6
  let embedded = 0
  let missing = 0
  let unsupported = 0
  let capped = 0
  for (const f of findings) {
    const row = fs.getRow(r)
    row.values = [
      f.finding_no == null ? '' : Number(f.finding_no),
      excelDay(f.detected_date),
      String(f.location_name ?? ''),
      String(f.finding_type ?? ''),
      findingText(f.description),
      '',
      '',
      String(f.action_to_take ?? ''),
      excelDay(f.due_date),
      excelDay(f.completed_at),
    ]
    row.alignment = { vertical: 'top', wrapText: true }
    for (const col of [2, 9, 10]) row.getCell(col).numFmt = 'dd.mm.yyyy'
    row.eachCell({ includeEmpty: true }, (c, n) => {
      if (n <= 10) c.border = BOX
    })

    let tall = false
    for (const [col, side] of [[5, 'before'], [6, 'after']] as const) {
      const id = photoIds(f, side)[0]
      if (!id) continue
      const cell = row.getCell(col + 1)
      // A photo already in the workbook is placed again at no cost.
      let image = embeddedByFile.get(id)
      if (!image) {
        // Read each file once: a photo that failed is not read again for its next cell.
        let failed = failedByFile.get(id)
        if (!failedByFile.has(id)) {
          if (full || embeddedByFile.size >= MAX_PHOTOS) {
            full = true
            capped += 1
            cell.value = 'Fotoğraf sınırı aşıldı'
            continue
          }
          const file = files.get(id)
          const read = file ? await readPhoto(file, MAX_PHOTO_TOTAL_BYTES - embeddedBytes) : null
          if (read === 'over-budget') {
            full = true
            capped += 1
            cell.value = 'Fotoğraf sınırı aşıldı'
            continue
          }
          if (read === null || read === 'unsupported') {
            failed = read
            failedByFile.set(id, read)
          } else {
            image = {
              imageId: workbook.addImage({ buffer: read.buffer as never, extension: read.extension }),
              photo: { width: read.width, height: read.height },
            }
            embeddedByFile.set(id, image)
            embeddedBytes += read.buffer.length
          }
        }
        if (!image) {
          if (failed === 'unsupported') {
            unsupported += 1
            cell.value = "Fotoğraf biçimi Excel'e eklenemiyor (HEIC/WEBP)"
          } else {
            missing += 1
            cell.value = 'Fotoğraf okunamadı'
          }
          continue
        }
      }
      // Column F/G are 26 characters ≈ 185 px wide; row height 92 pt ≈ 122 px.
      const box = fitBox(image.photo, 178, 116)
      fs.addImage(image.imageId, { tl: { col: col + 0.03, row: r - 1 + 0.03 }, ext: box })
      embedded += 1
      tall = true
    }
    row.height = tall ? 92 : Math.max(30, Math.min(120, 15 * Math.ceil(findingText(f.description).length / 50)))
    r += 1
  }

  r += 1
  const open = findings.filter((f) => f.status !== 'closed').length
  for (const [label, value] of [
    ['Toplam Bul.', findings.length],
    ['Açık Bul.', open],
    ['Kapanan Bul.', findings.length - open],
  ] as const) {
    fs.getCell(`A${r}`).value = label
    fs.getCell(`A${r}`).font = { bold: true }
    fs.getCell(`B${r}`).value = value
    r += 1
  }
  const notes = [
    missing > 0 ? `${missing} fotoğraf dosyası okunamadı` : '',
    unsupported > 0 ? `${unsupported} fotoğraf Excel'in desteklemediği biçimde (HEIC/WEBP)` : '',
    capped > 0
      ? `${capped} fotoğraf, rapor başına ${MAX_PHOTOS} fotoğraf / ${MAX_PHOTO_TOTAL_BYTES / (1024 * 1024)} MB sınırını aştığı için eklenmedi`
      : '',
  ].filter(Boolean)
  if (notes.length > 0) {
    fs.getCell(`A${r + 1}`).value = `${notes.join('; ')} — ilgili hücrelerde not olarak belirtildi.`
    fs.getCell(`A${r + 1}`).font = { italic: true, color: { argb: 'FFB45309' } }
  }

  /* ── 5S Denetim Formu (<ay>) — one per audit ── */
  const usedNames = new Set<string>()
  const questionsByStep = new Map<string, Row[]>()
  for (const qq of questions) {
    const list = questionsByStep.get(String(qq.step_code)) ?? []
    list.push(qq)
    questionsByStep.set(String(qq.step_code), list)
  }

  for (const a of audits) {
    const key = toDateKey(a.audit_date)
    const month = MONTHS_TR[Number(key.slice(5, 7)) - 1] ?? key
    // One sheet per audit, named by month as on the paper form; a second
    // audit in the same month gets its day, a third on the same day a number.
    let name = `5S Denetim Formu (${month})`
    if (usedNames.has(name.toLowerCase())) name = `5S Denetim Formu (${key.slice(8, 10)} ${month})`
    for (let n = 2; usedNames.has(name.toLowerCase()); n++) {
      name = `5S Denetim Formu (${key.slice(8, 10)} ${month} ${n})`
    }
    name = name.slice(0, 31)
    usedNames.add(name.toLowerCase())
    const ws = workbook.addWorksheet(name, {
      pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    })
    ws.columns = [{ width: 6 }, { width: 70 }, { width: 36 }, { width: 13 }, { width: 10 }]
    ws.getCell('A1').value = 'KYS.180/Rev.0/202502'
    ws.mergeCells('A2:E2')
    ws.getCell('A2').value = '5S Denetim Formu (Sahalar)'
    ws.getCell('A2').font = { bold: true, size: 13 }
    ws.getCell('A2').alignment = { horizontal: 'center' }

    const info: Array<[string, unknown]> = [
      ['Bölüm', locationName],
      ['Denetimi Yapan', String(a.auditor_name ?? '')],
      ['Tarih', excelDay(a.audit_date)],
      ['Puan', Number(a.total_score ?? 0)],
    ]
    let row = 4
    for (const [label, value] of info) {
      ws.getCell(`A${row}`).value = label
      ws.getCell(`A${row}`).font = { bold: true }
      ws.mergeCells(`B${row}:C${row}`)
      ws.getCell(`B${row}`).value = value as never
      if (label === 'Tarih') ws.getCell(`B${row}`).numFmt = 'dd.mm.yyyy'
      if (label === 'Puan') ws.getCell(`B${row}`).numFmt = '0.00'
      row += 1
    }
    row += 1

    const answers = answersByAudit.get(String(a.id)) ?? new Map<string, Row>()
    const summary: Array<[string, number]> = []
    for (const step of steps) {
      const code = String(step.code)
      const list = questionsByStep.get(code) ?? []
      const stepMax = Number(step.max_score ?? 20)
      const rawMax = list.reduce((s, qq) => s + Number(qq.max_score ?? 0), 0)
      const scale = rawMax > 0 ? stepMax / rawMax : 0

      const h = ws.getRow(row)
      h.values = [String(step.title ?? code), '', 'Açıklama', 'İyi/Orta/Kötü', 'Puan']
      ws.mergeCells(`A${row}:B${row}`)
      h.font = { bold: true }
      h.eachCell((c) => {
        c.fill = HEAD_FILL
        c.border = BOX
      })
      row += 1

      for (const qq of list) {
        const ans = answers.get(String(qq.external_id))
        const rating = String(ans?.rating ?? '')
        const points =
          rating in RATING_FACTOR ? Number(qq.max_score ?? 0) * RATING_FACTOR[rating]! * scale : null
        const qr = ws.getRow(row)
        qr.values = [
          Number(qq.order ?? 0),
          String(qq.text ?? ''),
          String(ans?.explanation ?? ''),
          RATING_TR[rating] ?? '',
          points,
        ]
        qr.alignment = { vertical: 'top', wrapText: true }
        qr.getCell(5).numFmt = '0.00'
        qr.eachCell({ includeEmpty: true }, (c, n) => {
          if (n <= 5) c.border = BOX
        })
        row += 1
      }

      // The stored step score: it carries the plant's rules (e.g. 5.1 → step 5 = 0).
      const stored = Number(a[`score_${code.toLowerCase()}`] ?? 0)
      ws.getCell(`D${row}`).value = `Toplam Puan ( ${stepMax} )`
      ws.getCell(`D${row}`).font = { bold: true }
      ws.getCell(`E${row}`).value = stored
      ws.getCell(`E${row}`).numFmt = '0.00'
      ws.getCell(`E${row}`).font = { bold: true }
      summary.push([String(step.title ?? code), stored])
      row += 2
    }

    if (answers.size === 0) {
      ws.getCell(`A${row}`).value =
        'Bu denetimin soru yanıtları kaydedilmemiş (eski kayıt); yalnız adım puanları gösteriliyor.'
      ws.getCell(`A${row}`).font = { italic: true, color: { argb: 'FFB45309' } }
      row += 2
    }

    ws.getCell(`A${row}`).value =
      `* Puanlama ; İyi tam puan, Orta yarım puan, Kötü 0 · Hedef puan: ${Number(a.target_score ?? 75)} · Açıklama sütunun doldurulması zorunludur.`
    ws.getCell(`A${row}`).font = { italic: true, size: 9 }
    row += 2
    ws.getCell(`A${row}`).value = 'Değerlendirme'
    ws.getCell(`A${row}`).font = { bold: true }
    row += 1
    const sh = ws.getRow(row)
    sh.values = ['', 'Adım', '', '', 'Puan']
    sh.font = { bold: true }
    row += 1
    for (const [title, score] of summary) {
      ws.getCell(`B${row}`).value = title
      ws.getCell(`E${row}`).value = score
      ws.getCell(`E${row}`).numFmt = '0.00'
      row += 1
    }
    ws.getCell(`B${row}`).value = 'Toplam (100)'
    ws.getCell(`B${row}`).font = { bold: true }
    ws.getCell(`E${row}`).value = Number(a.total_score ?? 0)
    ws.getCell(`E${row}`).numFmt = '0.00'
    ws.getCell(`E${row}`).font = { bold: true }
    if (Math.abs(summary.reduce((s, [, v]) => s + v, 0) - Number(a.total_score ?? 0)) > 0.01) {
      ws.getCell(`C${row}`).value = 'Kurallar uygulandı (ör. %10 düşüm / katılım)'
      ws.getCell(`C${row}`).font = { italic: true, size: 9 }
    }
  }

  if (audits.length === 0) {
    const ws = workbook.addWorksheet('5S Denetim Formu')
    ws.getCell('A1').value = `${year} yılında ${locationName} için kayıtlı denetim yok.`
  }

  console.log(
    `[location-form] ${locationName} ${year}: ${findings.length} bulgu, ${audits.length} denetim, ${embedded} fotoğraf gömüldü (${embeddedByFile.size} dosya, ${Math.round(embeddedBytes / 1024)} KB), ${missing} okunamadı, ${unsupported} desteklenmeyen, ${capped} sınır dışı`
  )
  const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer
  return xlsxResponse(buffer, `5S-Denetim-Bulgu-ve-Soru-Formu-${year}-${locationName}.xlsx`)
}

export const locationFormXlsx = defineRoute({
  method: 'GET',
  path: '/location-form.xlsx',
  query: t.Object({ location_name: t.String(), year: t.Optional(t.String()) }),
  detail: { tags: ['Reports'], summary: "A location's year as the plant's 5S findings and question form" },
  handler: async ({ query: q, request }) => {
    const locationName = String(q?.location_name ?? '').trim()
    const year = /^\d{4}$/.test(String(q?.year ?? '')) ? Number(q?.year) : Number(todayAtPlant().slice(0, 4))
    if (!locationName) {
      return new Response(JSON.stringify({ success: false, message: 'Lokasyon seçilmedi.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }

    // A field manager gets the form of their own locations only, as the register shows them (#7/#24).
    const caller = await callerById(request.headers.get('x-user-id') ?? '')
    if (caller && !isCentral(caller) && caller.roles.includes('field manager')) {
      const own = await query(
        `select 1 from five_s_locations
          where lower(trim(name)) = lower(trim($1))
            and coalesce(field_manager_user_ids, '[]'::jsonb) ? $2::text`,
        [locationName, caller.userId]
      )
      if (own.length === 0) {
        return new Response(JSON.stringify({ success: false, message: 'Bu lokasyonun formunu görme yetkiniz yok.' }), {
          status: 403,
          headers: { 'content-type': 'application/json' },
        })
      }
    }

    // The checks above answer at once; the build waits its turn.
    return oneAtATime(() => buildForm(locationName, year))
  },
})

