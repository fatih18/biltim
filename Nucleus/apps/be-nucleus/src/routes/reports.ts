import { Type as t } from '@sinclair/typebox'
import { type AnyRoute, defineRoute, type RouteGroup } from 'nucleus-core-ts/server'
import { type Row, query } from '../db'
import { todayAtPlant } from '../guards/businessRules'
import { callerById, isCentral } from '../guards/caller'
import { buildWorkbook, type Column, statusTr, xlsxResponse } from './excel'

/** Only YYYY-MM-DD reaches SQL; anything else becomes "no filter". */
function parseDate(value: unknown): string | null {
  const s = String(value ?? '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

/**
 * Builds `AND <col> >= $n` fragments and their params together, so a caller can
 * never bind a filter it did not also add to the SQL.
 */
function dateRange(column: string, from: string | null, to: string | null, startIndex: number) {
  const parts: string[] = []
  const params: string[] = []
  let i = startIndex
  if (from) {
    parts.push(` AND ${column} >= $${i++}`)
    params.push(from)
  }
  if (to) {
    parts.push(` AND ${column} <= $${i++}`)
    params.push(to)
  }
  return { sql: parts.join(''), params, next: i }
}

/**
 * Both reports take the same optional date window, and `location_name` narrows
 * the Excel export to one place.
 *
 * Declared rather than read raw so the two show up in /docs with their
 * parameters — the router drops anything not named here before the handler
 * sees it, which is what the handlers already assumed. Every field is an
 * optional string: a query value always IS a string, so this can only ever
 * refuse a request that omits nothing, and `parseDate` still decides what
 * reaches SQL.
 */
const dateWindow = {
  date_from: t.Optional(t.String()),
  date_to: t.Optional(t.String()),
}

async function loadDashboard(from: string | null, to: string | null) {

    const f = dateRange('f.detected_date', from, to, 1)
    const fWhere = `f.is_active = true${f.sql}`
    const fp = f.params

    // audit_date is a timestamp, so the upper bound has to cover the whole day.
    const a = dateRange('a.audit_date', from, to ? `${to} 23:59:59` : null, 1)
    const aWhere = `a.is_active = true${a.sql}`
    const ap = a.params
    /*
     * An audit, as opposed to the row the single-finding form files its
     * finding under (#23). Those carry no plan, no answers and a score of 0;
     * counted, each one was an extra audit and a 0 in every average. Their
     * findings still count wherever findings are counted.
     */
    const isAudit = `a.source IS DISTINCT FROM 'single_finding'`
    const aScored = `${aWhere} AND ${isAudit}`

    const [
      byLocationType,
      statusCounts,
      overdueActions,
      scoresByDepartment,
      byStepCode,
      scoreTrend,
      planCompliance,
      findingsPerTeam,
      departmentSummary,
      mapHeat,
    ] = await Promise.all([
      query(
        `SELECT f.location_name, f.finding_type, count(*)::int AS count
         FROM five_s_findings f WHERE ${fWhere}
         GROUP BY f.location_name, f.finding_type ORDER BY count DESC`,
        fp
      ),
      query(
        `SELECT f.location_name, l.department_name, f.status, count(*)::int AS count
         FROM five_s_findings f
         LEFT JOIN five_s_locations l ON lower(trim(l.name)) = lower(trim(f.location_name))
         WHERE ${fWhere}
         GROUP BY f.location_name, l.department_name, f.status ORDER BY count DESC`,
        fp
      ),
      query(
        `SELECT f.id, f.finding_no, f.location_name, f.finding_type, f.description,
                f.action_to_take, f.due_date, f.responsible_name, f.detected_date,
                (CURRENT_DATE - f.due_date)::int AS overdue_days
         FROM five_s_findings f
         WHERE ${fWhere} AND f.status = 'open'
           AND f.due_date IS NOT NULL AND f.due_date < CURRENT_DATE
         ORDER BY f.due_date ASC LIMIT 500`,
        fp
      ),
      query(
        `SELECT a.department_name, l.department_name AS directorate_name,
                count(*)::int AS audit_count,
                round(avg(a.total_score), 2) AS avg_total,
                round(avg(a.target_score), 2) AS avg_target,
                round(avg(a.score_s1), 2) AS avg_s1, round(avg(a.score_s2), 2) AS avg_s2,
                round(avg(a.score_s3), 2) AS avg_s3, round(avg(a.score_s4), 2) AS avg_s4,
                round(avg(a.score_s5), 2) AS avg_s5
         FROM five_s_audits a
         LEFT JOIN five_s_locations l ON lower(trim(l.name)) = lower(trim(a.department_name))
         WHERE ${aScored}
         GROUP BY a.department_name, l.department_name ORDER BY avg_total DESC`,
        ap
      ),
      query(
        `SELECT f.location_name, coalesce(f.step_code, 'Bilinmiyor') AS step_code,
                count(*)::int AS count
         FROM five_s_findings f WHERE ${fWhere}
         GROUP BY f.location_name, f.step_code ORDER BY count DESC`,
        fp
      ),
      query(
        `SELECT to_char(a.audit_date, 'YYYY-MM') AS period, count(*)::int AS audit_count,
                round(avg(a.total_score), 2) AS avg_total,
                round(avg(a.target_score), 2) AS avg_target
         FROM five_s_audits a WHERE ${aScored} GROUP BY 1 ORDER BY 1 ASC`,
        ap
      ),
      query(
        `SELECT p.status, count(*)::int AS count,
                count(*) FILTER (WHERE p.auditor_attended = true)::int AS auditor_attended,
                count(*) FILTER (WHERE p.auditor_attended = false)::int AS auditor_missed,
                count(*) FILTER (WHERE p.field_manager_attended = true)::int AS field_manager_attended,
                count(*) FILTER (WHERE p.field_manager_attended = false)::int AS field_manager_missed
         FROM five_s_audit_plans p
         WHERE p.is_active = true
           AND (p.location_id IS NOT NULL OR p.assigned_team_id IS NOT NULL)
         GROUP BY p.status`
      ),
      query(
        `SELECT coalesce(t.name, 'Ekipsiz') AS team_name,
                count(DISTINCT a.id)::int AS audit_count,
                count(f.id)::int AS finding_count,
                CASE WHEN count(DISTINCT a.id) > 0
                     THEN round(count(f.id)::numeric / count(DISTINCT a.id), 2)
                     ELSE 0 END AS avg_findings_per_audit
         FROM five_s_audits a
         LEFT JOIN five_s_findings f ON f.audit_id = a.id AND f.is_active = true
         LEFT JOIN five_s_audit_plans p ON p.id = a.plan_id
         LEFT JOIN five_s_audit_teams t ON t.id = p.assigned_team_id
         WHERE ${aScored} GROUP BY t.name ORDER BY avg_findings_per_audit DESC`,
        ap
      ),
      /*
       * The three finding counts, and what each one means.
       *
       * closed_findings read status <> 'open', so every finding someone was
       * still working on counted as resolved: on the local data the dashboard
       * reported 42 closed when 20 were, overstating completed work by more
       * than double. It now means closed, in_progress is counted on its own so
       * the three add up to the total, and a finding past its termin is overdue
       * whether or not anyone has started it — restricting that to 'open' hid
       * exactly the late work that needs chasing.
       */
      query(
        `SELECT coalesce(l.department_name, 'Tanımsız') AS department_name,
                count(DISTINCT a.id) FILTER (WHERE ${isAudit})::int AS audit_count,
                round(avg(a.total_score) FILTER (WHERE ${isAudit}), 2) AS avg_total,
                count(f.id) FILTER (WHERE f.status = 'open')::int AS open_findings,
                count(f.id) FILTER (WHERE f.status = 'in_progress')::int AS in_progress_findings,
                count(f.id) FILTER (WHERE f.status = 'closed')::int AS closed_findings,
                count(f.id) FILTER (WHERE f.status <> 'closed' AND f.due_date < CURRENT_DATE)::int
                  AS overdue_findings
         FROM five_s_audits a
         LEFT JOIN five_s_locations l ON lower(trim(l.name)) = lower(trim(a.department_name))
         LEFT JOIN five_s_findings f ON f.audit_id = a.id AND f.is_active = true
         WHERE ${aWhere} GROUP BY l.department_name ORDER BY audit_count DESC`,
        ap
      ),
      query(
        `SELECT l.id, l.name, l.map_x, l.map_y, l.department_name,
                count(f.id)::int AS total_findings,
                count(f.id) FILTER (WHERE f.status = 'open')::int AS open_findings,
                round(avg(CASE WHEN f.completed_at IS NOT NULL
                          THEN (f.completed_at - f.detected_date)::numeric END), 1)
                  AS avg_close_days
         FROM five_s_locations l
         LEFT JOIN five_s_findings f
           ON lower(trim(f.location_name)) = lower(trim(l.name)) AND f.is_active = true
         WHERE l.is_active = true
         GROUP BY l.id, l.name, l.map_x, l.map_y, l.department_name
         ORDER BY open_findings DESC`
      ),
    ])

    return {
      byLocationType,
      statusCounts,
      overdueActions,
      scoresByDepartment,
      byStepCode,
      scoreTrend,
      planCompliance,
      findingsPerTeam,
      departmentSummary,
      mapHeat,
    }
}

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>

const dashboard = defineRoute({
  method: 'GET',
  path: '/dashboard',
  query: t.Object(dateWindow),
  detail: { tags: ['Reports'], summary: '5S dashboard aggregates' },
  handler: async ({ query: q }) => {
    const from = parseDate(q?.date_from)
    const to = parseDate(q?.date_to)
    const data = await loadDashboard(from, to)
    return {
      success: true,
      message: 'Dashboard report aggregates',
      data: { ...data, filters: { date_from: from, date_to: to } },
    }
  },
})

/* ───────────────────────── Excel ───────────────────────── */

/*
 * Every report on the screen downloads as Excel (7 Oct request: "her rapora
 * Excel'e aktar"). One sheet per card, with the columns the card shows; the
 * dashboard's own date window applies. `section` picks one card, and without
 * it the workbook carries all of them.
 */
const SECTIONS: Record<
  keyof DashboardData,
  { title: string; columns: Column[] }
> = {
  scoreTrend: {
    title: 'Puan Trendi',
    columns: [
      { header: 'Dönem', key: 'period', width: 12 },
      { header: 'Denetim Sayısı', key: 'audit_count', kind: 'number' },
      { header: 'Ortalama Puan', key: 'avg_total', kind: 'number' },
      { header: 'Hedef', key: 'avg_target', kind: 'number' },
    ],
  },
  byLocationType: {
    title: 'Bölge - Bulgu Tipi',
    columns: [
      { header: 'Lokasyon', key: 'location_name', width: 28 },
      { header: 'Bulgu Tipi', key: 'finding_type', width: 24 },
      { header: 'Bulgu Sayısı', key: 'count', kind: 'number' },
    ],
  },
  statusCounts: {
    title: 'Açık - Kapalı Bulgular',
    columns: [
      { header: 'Lokasyon', key: 'location_name', width: 28 },
      { header: 'Müdürlük', key: 'department_name', width: 24 },
      { header: 'Durum', key: 'status', map: statusTr },
      { header: 'Bulgu Sayısı', key: 'count', kind: 'number' },
    ],
  },
  scoresByDepartment: {
    title: 'Bölge Puanları',
    columns: [
      { header: 'Bölge', key: 'department_name', width: 28 },
      { header: 'Müdürlük', key: 'directorate_name', width: 24 },
      { header: 'Denetim Sayısı', key: 'audit_count', kind: 'number' },
      { header: 'Ortalama Puan', key: 'avg_total', kind: 'number' },
      { header: 'Hedef', key: 'avg_target', kind: 'number' },
      { header: 'S1', key: 'avg_s1', kind: 'number' },
      { header: 'S2', key: 'avg_s2', kind: 'number' },
      { header: 'S3', key: 'avg_s3', kind: 'number' },
      { header: 'S4', key: 'avg_s4', kind: 'number' },
      { header: 'S5', key: 'avg_s5', kind: 'number' },
    ],
  },
  byStepCode: {
    title: 'Bölge - 5S Adımı',
    columns: [
      { header: 'Lokasyon', key: 'location_name', width: 28 },
      { header: '5S Adımı', key: 'step_code' },
      { header: 'Bulgu Sayısı', key: 'count', kind: 'number' },
    ],
  },
  findingsPerTeam: {
    title: 'Ekip Başına Bulgu',
    columns: [
      { header: 'Ekip', key: 'team_name', width: 28 },
      { header: 'Denetim Sayısı', key: 'audit_count', kind: 'number' },
      { header: 'Bulgu Sayısı', key: 'finding_count', kind: 'number' },
      { header: 'Ort. Bulgu / Denetim', key: 'avg_findings_per_audit', kind: 'number' },
    ],
  },
  planCompliance: {
    title: 'Denetim Planına Uyum',
    columns: [
      { header: 'Durum', key: 'status', map: statusTr },
      { header: 'Plan Sayısı', key: 'count', kind: 'number' },
      { header: 'Denetçi Katıldı', key: 'auditor_attended', kind: 'number' },
      { header: 'Denetçi Katılmadı', key: 'auditor_missed', kind: 'number' },
      { header: 'Saha Sor. Katıldı', key: 'field_manager_attended', kind: 'number' },
      { header: 'Saha Sor. Katılmadı', key: 'field_manager_missed', kind: 'number' },
    ],
  },
  departmentSummary: {
    title: 'Müdürlük Özeti',
    columns: [
      { header: 'Müdürlük', key: 'department_name', width: 28 },
      { header: 'Denetim Sayısı', key: 'audit_count', kind: 'number' },
      { header: 'Ortalama Puan', key: 'avg_total', kind: 'number' },
      { header: 'Açık', key: 'open_findings', kind: 'number' },
      { header: 'Devam Eden', key: 'in_progress_findings', kind: 'number' },
      { header: 'Kapalı', key: 'closed_findings', kind: 'number' },
      { header: 'Termini Geçen', key: 'overdue_findings', kind: 'number' },
    ],
  },
  overdueActions: {
    title: 'Termini Geçmiş Aksiyonlar',
    columns: [
      { header: 'Bulgu No', key: 'finding_no', kind: 'number' },
      { header: 'Lokasyon', key: 'location_name', width: 26 },
      { header: 'Bulgu Tipi', key: 'finding_type', width: 22 },
      { header: 'Açıklama', key: 'description', width: 48 },
      { header: 'Yapılacak Aksiyon', key: 'action_to_take', width: 36 },
      { header: 'Tespit Tarihi', key: 'detected_date', kind: 'date' },
      { header: 'Termin', key: 'due_date', kind: 'date' },
      { header: 'Gecikme (gün)', key: 'overdue_days', kind: 'number' },
      { header: 'Sorumlu', key: 'responsible_name', width: 24 },
    ],
  },
  mapHeat: {
    title: 'Lokasyon Isı Haritası',
    columns: [
      { header: 'Lokasyon', key: 'name', width: 28 },
      { header: 'Müdürlük', key: 'department_name', width: 24 },
      { header: 'Toplam Bulgu', key: 'total_findings', kind: 'number' },
      { header: 'Açık Bulgu', key: 'open_findings', kind: 'number' },
      { header: 'Ort. Kapanma (gün)', key: 'avg_close_days', kind: 'number' },
    ],
  },
}

const SECTION_KEYS = Object.keys(SECTIONS) as Array<keyof DashboardData>

const dashboardXlsx = defineRoute({
  method: 'GET',
  path: '/dashboard.xlsx',
  query: t.Object({ ...dateWindow, section: t.Optional(t.String()) }),
  detail: { tags: ['Reports'], summary: 'Dashboard reports as an Excel workbook' },
  handler: async ({ query: q }) => {
    const from = parseDate(q?.date_from)
    const to = parseDate(q?.date_to)
    const wanted = String(q?.section ?? '').trim()
    const keys = SECTION_KEYS.filter((k) => !wanted || k === wanted)
    if (keys.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Bilinmeyen rapor.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }
    const data = await loadDashboard(from, to)
    const buffer = await buildWorkbook(
      keys.map((k) => ({ name: SECTIONS[k].title, columns: SECTIONS[k].columns, rows: data[k] }))
    )
    const window = from || to ? `-${from ?? 'basi'}_${to ?? 'sonu'}` : ''
    const name = keys.length === 1 ? SECTIONS[keys[0] as keyof DashboardData].title : '5S Raporlari'
    return xlsxResponse(buffer, `${name}${window}-${todayAtPlant()}.xlsx`)
  },
})

/*
 * The findings register, as the screen filters it.
 *
 * "Ana Denetim" says which audit a finding came out of, and "Kaynak" whether
 * it was raised during an audit or on its own with the single-finding form
 * (#3). `open-findings.xlsx` stays for the bookmarked link and is now this with
 * status=open.
 */
const findingsQuery = t.Object({
  ...dateWindow,
  location_name: t.Optional(t.String()),
  status: t.Optional(t.String()),
  source: t.Optional(t.String()),
})

/**
 * The locations a field manager answers for, when that is all they may see.
 * null = no narrowing (Merkez Ekip and above, or anyone not a field manager).
 */
async function fieldManagerLocations(request: Request): Promise<string[] | null> {
  const caller = await callerById(request.headers.get('x-user-id') ?? '')
  if (!caller || isCentral(caller) || !caller.roles.includes('field manager')) return null
  const rows = await query(
    `select name from five_s_locations
      where coalesce(field_manager_user_ids, '[]'::jsonb) ? $1::text`,
    [caller.userId]
  )
  return rows.map((r) => String(r.name ?? '').trim().toLowerCase()).filter(Boolean)
}

async function findingsWorkbook(
  q: Record<string, string | undefined> | undefined,
  forceOpen: boolean,
  request: Request
) {
  const locationName = String(q?.location_name ?? '').trim()
  const status = forceOpen ? 'open' : String(q?.status ?? '').trim()
  const source = String(q?.source ?? '').trim()
  const from = parseDate(q?.date_from)
  const to = parseDate(q?.date_to)

  const clauses: string[] = []
  const params: unknown[] = []
  let i = 1
  if (locationName) {
    clauses.push(` AND lower(trim(f.location_name)) = lower(trim($${i++}))`)
    params.push(locationName)
  }
  if (status && ['open', 'in_progress', 'closed'].includes(status)) {
    clauses.push(` AND f.status = $${i++}`)
    params.push(status)
  }
  if (source === 'single_finding') clauses.push(" AND a.source = 'single_finding'")
  if (source === 'audit') clauses.push(" AND a.source IS DISTINCT FROM 'single_finding'")
  // #7/#24: the export shows a field manager what their register shows.
  const scoped = await fieldManagerLocations(request)
  if (scoped) {
    clauses.push(` AND lower(trim(f.location_name)) = ANY($${i++}::text[])`)
    params.push(scoped)
  }
  const range = dateRange('f.detected_date', from, to, i)
  clauses.push(range.sql)
  params.push(...range.params)

  const rows: Row[] = await query(
    `SELECT f.finding_no, f.detected_date, f.location_name, f.finding_type,
            coalesce(f.step_code, '') AS step_code, f.description, f.action_to_take,
            f.due_date, f.completed_at, f.responsible_name, f.auditor_name, f.status,
            CASE WHEN a.source = 'single_finding' THEN 'Tekil Bulgu'
                 WHEN a.id IS NOT NULL THEN 'Denetim' ELSE '' END AS source_label,
            CASE WHEN a.id IS NOT NULL AND a.source IS DISTINCT FROM 'single_finding'
                 THEN concat_ws(' – ', a.department_name, to_char(a.audit_date, 'DD.MM.YYYY'))
                 ELSE '' END AS audit_label
     FROM five_s_findings f
     LEFT JOIN five_s_audits a ON a.id = f.audit_id
     WHERE f.is_active = true${clauses.join('')}
     ORDER BY f.finding_no ASC NULLS LAST`,
    params
  )

  const buffer = await buildWorkbook([
    {
      name: forceOpen ? 'Açık Bulgular' : 'Bulgular',
      columns: [
        { header: 'Bulgu No', key: 'finding_no', kind: 'number', width: 10 },
        { header: 'Kaynak', key: 'source_label', width: 14 },
        { header: 'Ana Denetim', key: 'audit_label', width: 30 },
        { header: 'Tespit Tarihi', key: 'detected_date', kind: 'date' },
        { header: 'Lokasyon', key: 'location_name', width: 24 },
        { header: 'Bulgu Tipi', key: 'finding_type', width: 20 },
        { header: '5S Adımı', key: 'step_code', width: 10 },
        { header: 'Açıklama', key: 'description', width: 48 },
        { header: 'Yapılacak Aksiyon', key: 'action_to_take', width: 32 },
        { header: 'Termin', key: 'due_date', kind: 'date' },
        { header: 'Kapanış Tarihi', key: 'completed_at', kind: 'date' },
        { header: 'Sorumlu', key: 'responsible_name', width: 22 },
        { header: 'Denetçi', key: 'auditor_name', width: 22 },
        { header: 'Durum', key: 'status', map: statusTr },
      ],
      rows,
    },
  ])
  const suffix = locationName ? `-${locationName}` : ''
  return xlsxResponse(
    buffer,
    `5s-${forceOpen ? 'acik-bulgu' : 'bulgu'}-raporu${suffix}-${todayAtPlant()}.xlsx`
  )
}

const openFindings = defineRoute({
  method: 'GET',
  path: '/open-findings.xlsx',
  query: findingsQuery,
  detail: { tags: ['Reports'], summary: 'Open findings as an Excel workbook' },
  handler: ({ query: q, request }) => findingsWorkbook(q, true, request),
})

const findingsXlsx = defineRoute({
  method: 'GET',
  path: '/findings.xlsx',
  query: findingsQuery,
  detail: { tags: ['Reports'], summary: 'The findings register as an Excel workbook' },
  handler: ({ query: q, request }) => findingsWorkbook(q, false, request),
})

/**
 * Mounted under `/reports`, behind nucleus's guard chain as before.
 *
 * `AnyRoute[]` is load-bearing: `defineRoute` keeps `path` as a literal
 * type, so two routes with different paths are different types and cannot
 * share an array without it.
 */
const routes: AnyRoute[] = [dashboard, dashboardXlsx, openFindings, findingsXlsx]
export const ReportsRoutes: RouteGroup = { prefix: '/reports', routes }
