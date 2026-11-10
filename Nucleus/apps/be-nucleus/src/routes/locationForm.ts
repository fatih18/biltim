import { Type as t } from '@sinclair/typebox'
import { defineRoute } from 'nucleus-core-ts/server'
import { type Row, query } from '../db'
import { todayAtPlant, toDateKey } from '../guards/businessRules'
import { callerById } from '../guards/caller'
import { auditAttendanceNote } from './auditAttendanceNote'
import { type AuditReportTarget, dayTr, loadAuditReportTarget } from './auditReport'
import { excelDay, xlsxResponse } from './excel'
import { createPhotoEmbedder } from './findingPhotos'
import { decideLocationForm } from './locationFormAccess'
import { loadFormAudits } from './locationFormAudits'
import { cleanName, nameOf, placeInYear } from './locationMatch'
import { oneAtATime, photoNote, REPORT_PHOTO_LIMITS } from './photoReport'

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

/** Field managers' names for the "Sorumlu" line, of the location rows `ids`. */
async function responsibleNames(ids: string[]): Promise<string> {
  if (ids.length === 0) return ''
  const rows = await query(
    `select coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), u.email) as name
       from five_s_locations l
       cross join lateral jsonb_array_elements_text(coalesce(l.field_manager_user_ids, '[]'::jsonb)) as fm(id)
       join users u on u.id::text = fm.id
       left join profiles p on p.user_id = u.id
      where l.id = any($1::uuid[])`,
    [ids]
  )
  return [...new Set(rows.map((r) => String(r.name ?? '')).filter(Boolean))].join(', ')
}

/*
 * `audit` narrows the workbook to one audit (the report of one audit, row 75):
 * its own question sheet and the findings raised in it — whatever place or day
 * they name — instead of the location's year. `$5` is that audit's id, or NULL
 * for the yearly form. `completedOnly` is a field manager asking: audits whose
 * plan is not approved yet stay out of both shapes, so the yearly form cannot
 * be used to read what the one-audit report refuses.
 */
async function buildForm(
  askedName: string,
  year: number,
  audit: AuditReportTarget | null = null,
  completedOnly = false
): Promise<Response> {
  const from = `${year}-01-01`
  const to = `${year}-12-31`
  const auditId = audit?.auditId ?? null
  /*
   * The place, as the data spells it: findings and audits are linked to a
   * location by text, so every spelling of the name that year used is matched
   * (placeInYear), and audits planned on the location by its id as well, so a
   * renamed location keeps its history. `locationName` is the location row's
   * own name when there is one: the header and the "Bölüm" line never come
   * out empty or in the spelling of a stray row.
   */
  const place = await placeInYear(askedName, { from, to })
  const locationName = place.name
  const audits = await loadFormAudits(place, { from, to }, auditId, completedOnly)
  const [findings, steps, questions, sorumlu] = await Promise.all([
    query(
      `select f.finding_no, f.detected_date, f.location_name, f.finding_type, f.description,
              f.action_to_take, f.due_date, f.completed_at, f.status,
              f.photo_before_files, f.photo_before_file_id, f.photo_before_url,
              f.photo_after_files, f.photo_after_file_id, f.photo_after_url
         from five_s_findings f
        where f.is_active = true
          and ($5::text is null
               and (f.location_name = any($1::text[]) or f.audit_id = any($4::uuid[]))
               and f.detected_date between $2 and $3
               or f.audit_id::text = $5)
        order by f.detected_date asc, f.finding_no asc nulls last`,
      [place.findingNames, from, to, audits.map((a) => String(a.id)), auditId]
    ),
    query(`select code, title, max_score, "order" from five_s_steps where is_active order by "order"`),
    query(
      `select q.external_id, q."order", q.text, q.max_score, s.code as step_code
         from five_s_questions q join five_s_steps s on s.id = q.step_id
        where q.is_active order by s."order", q."order"`
    ),
    responsibleNames(place.ids),
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

  /*
   * Whether each audit's plan records the field manager (or whoever they
   * appointed) as present. An audit saved without attendance carries no answers
   * on purpose, and its sheet must say so rather than "eski kayıt".
   */
  const attendedByPlan = new Map<string, boolean | null>()
  const planIds = [...new Set(audits.map((a) => String(a.plan_id ?? '')).filter(Boolean))]
  if (planIds.length > 0) {
    const rows = await query(
      `select id, field_manager_attended from five_s_audit_plans where id = any($1::uuid[])`,
      [planIds]
    )
    for (const r of rows) {
      attendedByPlan.set(String(r.id), typeof r.field_manager_attended === 'boolean' ? r.field_manager_attended : null)
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
  fs.getCell('A2').value = audit
    ? `${LOC} 5S DENETİM BULGU FORMU (${dayTr(audit.auditDay)} DENETİMİ)`
    : `${year} YILI ${LOC} 5S DENETİM BULGU FORMU`
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
   * Photos go through the shared embedder (findingPhotos.ts): up to three
   * pictures a side, found in one lookup and read one at a time, capped by
   * files and by bytes embedded — 400 photos of up to 15 MB each is 6 GB, and
   * a count alone let all of it in. Once a photo would cross either cap, no
   * further photo is read; the cell says so rather than the export failing.
   * Where a finding has no photo the paper form's cell stays empty.
   */
  const textHeight = (f: Row) => Math.max(30, Math.min(120, 15 * Math.ceil(findingText(f.description).length / 50)))

  let r = 6
  for (const f of findings) {
    const row = fs.getRow(r)
    row.values = [
      f.finding_no == null ? '' : Number(f.finding_no),
      excelDay(f.detected_date),
      cleanName(String(f.location_name ?? '')) || locationName,
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
    row.height = textHeight(f)
    r += 1
  }

  const embedder = createPhotoEmbedder(workbook)
  const tally = await embedder.fill({
    sheet: fs,
    rows: findings,
    firstRow: 6,
    slots: [
      { col: 6, side: 'before', width: 26 },
      { col: 7, side: 'after', width: 26 },
    ],
    textPt: (i) => textHeight(findings[i] ?? {}),
  })

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
  // What is wrong, what it means, what to do: never an empty form without a word.
  const notes = [
    photoNote(tally, REPORT_PHOTO_LIMITS),
    place.ids.length === 0 ? `"${locationName}" adı Ana Veri Yönetimi'ndeki lokasyonlarla eşleşmedi.` : '',
    findings.length === 0 && audits.length === 0
      ? `${year} yılında bu lokasyon adıyla kayıtlı bulgu ya da denetim yok. Kayıtlar lokasyona adıyla bağlıdır; ad sonradan değiştirildiyse eski kayıtlar eski adı taşır. Ana Veri Yönetimi'nde lokasyon adını ve yılı kontrol edin.`
      : '',
  ].filter(Boolean)
  for (const [n, note] of notes.entries()) {
    fs.getCell(`A${r + 1 + n}`).value = note
    fs.getCell(`A${r + 1 + n}`).font = { italic: true, color: { argb: 'FFB45309' } }
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

    const attendanceNote = auditAttendanceNote({
      attended: attendedByPlan.get(String(a.plan_id ?? '')) ?? null,
      total: Number(a.total_score ?? 0),
      hasAnswers: answers.size > 0,
    })
    if (attendanceNote) {
      ws.getCell(`A${row}`).value = attendanceNote
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
    `[location-form] ${locationName} ${year}: ${findings.length} bulgu, ${audits.length} denetim, ${tally.placed} fotoğraf gömüldü (${embedder.usage().files} dosya, ${Math.round(embedder.usage().bytes / 1024)} KB), ${tally.missing} okunamadı, ${tally.unsupported} desteklenmeyen, ${tally.capped} sınır dışı, ${tally.hidden} hücre sınırı dışı; ${place.ids.length} lokasyon kaydı, ${place.findingNames.length}/${place.auditNames.length} yazım`
  )
  const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer
  return xlsxResponse(
    buffer,
    audit
      ? `5S-Denetim-Raporu-${locationName}-${audit.auditDay}.xlsx`
      : `5S-Denetim-Bulgu-ve-Soru-Formu-${year}-${locationName}.xlsx`
  )
}

/** The names of the locations the user is a field manager of. */
async function managedLocationNames(userId: string): Promise<string[]> {
  const rows = await query(
    `select name from five_s_locations
      where coalesce(field_manager_user_ids, '[]'::jsonb) ? $1::text`,
    [userId]
  )
  return rows.map(nameOf)
}

export const locationFormXlsx = defineRoute({
  method: 'GET',
  path: '/location-form.xlsx',
  query: t.Object({
    location_name: t.Optional(t.String()),
    year: t.Optional(t.String()),
    // One audit's report: its location and year come from the audit itself.
    audit_id: t.Optional(t.String()),
  }),
  detail: {
    tags: ['Reports'],
    summary: "A location's year (or one audit) as the plant's 5S findings and question form",
  },
  handler: async ({ query: q, request }) => {
    const decision = await decideLocationForm(
      {
        auditId: q?.audit_id,
        locationName: q?.location_name,
        year: q?.year,
        userId: request.headers.get('x-user-id') ?? '',
      },
      {
        loadAudit: (id) => loadAuditReportTarget(id),
        findCaller: (id) => callerById(id),
        managedLocationNames,
        currentYear: Number(todayAtPlant().slice(0, 4)),
      }
    )
    if (decision.kind === 'refused') {
      return new Response(JSON.stringify({ success: false, message: decision.message }), {
        status: decision.status,
        headers: { 'content-type': 'application/json' },
      })
    }

    // The checks above answer at once; the build waits its turn.
    return oneAtATime(() => buildForm(decision.locationName, decision.year, decision.audit, decision.completedOnly))
  },
})

