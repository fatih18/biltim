import { Type as t } from '@sinclair/typebox'
import { type AnyRoute, defineRoute, type RouteGroup } from 'nucleus-core-ts/server'
import { type Row, query } from '../db'
import { todayAtPlant } from '../guards/businessRules'
import { type Caller, callerById, type QueryParam } from '../guards/caller'
import { buildWorkbook, type Column, statusTr, xlsxResponse } from './excel'
import { countFindings, FINDINGS_FROM_WHERE } from './findingsCount'
import { parseStatuses } from './findingStatuses'
import { locationFormXlsx } from './locationForm'
import { findingSpellings } from './locationMatch'
import { FINDING_NUMBERS_SELECT, FINDINGS_SHEET_COLUMNS, PHOTO_SHEET_COLUMNS } from './findingsSheet'
import { DASHBOARD_PHOTO_HINT, PHOTO_COLUMNS, PHOTO_HINT } from './photoReport'
import { FINDING_PLACE, overdueActionsSql } from './reportQueries'
import { type FieldScope, fieldManagerScope, inManagedLocations, scoped } from './reportScope'
import { describedWithoutRoleAsTeam } from './teamLine'

/* ───────────────────────── who may read reports ───────────────────────── */

/**
 * The roles that work in the 5S programme. Every report — the dashboard, each
 * Excel, the location form — is for them and nobody else.
 *
 * nucleus only checks that someone is signed in before these routes, and
 * config.json leaves public sign-up open with the default role 'basic', which
 * holds no 5S claim. Without this, such an account got 403 on GET
 * /fiveSFindings but downloaded the whole findings register, and the location
 * form with its photos, from here.
 */
export const REPORT_ROLES = [
  'godmin',
  'super admin',
  'content manager core team',
  'manager',
  'field manager',
  'auditor',
] as const

export function maySeeReports(caller: Caller | null): boolean {
  if (!caller) return false
  return caller.isGod || caller.roles.some((r) => (REPORT_ROLES as readonly string[]).includes(r))
}

/**
 * The guard on the whole /reports group, so a route added later is covered
 * without remembering to. Group guards run after nucleus's auth middleware,
 * which sets `x-user-id`. A caller it cannot name gets the same 403: closed,
 * never open.
 */
export async function refuseNonReportReaders(
  { request }: { request: Request },
  read?: Parameters<typeof callerById>[1]
): Promise<Response | undefined> {
  const caller = await callerById(request.headers.get('x-user-id')?.trim() ?? '', read)
  if (maySeeReports(caller)) return undefined
  return new Response(JSON.stringify({ success: false, message: 'Raporları görme yetkiniz yok.' }), {
    status: 403,
    headers: { 'content-type': 'application/json' },
  })
}

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

/* ───────────────────────── field manager scope ───────────────────────── */

/** A field manager's narrowing (FieldScope, scoped, inManagedLocations) lives in reportScope.ts. */

async function loadDashboard(
  from: string | null,
  to: string | null,
  scope: FieldScope | null = null,
  // "Overdue" is judged on the plant's calendar. The pool's CURRENT_DATE is
  // UTC (db.ts), still yesterday between 00:00 and 03:00 in Istanbul.
  today: string = todayAtPlant(),
  // Only the Excel draws photos; the JSON of /reports/dashboard carries none.
  withPhotos = false
) {
    const f = dateRange('f.detected_date', from, to, 1)
    // #7/#24: a field manager's dashboard counts their locations, as their
    // register and export do; every finding query is narrowed by location_name.
    const fScope = scoped(scope?.spellings ?? null, f.params)
    const fWhere = `f.is_active = true${f.sql}${fScope.on('f.location_name')}`
    const fp = fScope.params

    // audit_date is a timestamp, so the upper bound has to cover the whole day.
    const a = dateRange('a.audit_date', from, to ? `${to} 23:59:59` : null, 1)
    // …and every audit query by the audited place, department_name.
    const aScope = scoped(scope?.spellings ?? null, a.params)
    const aWhere = `a.is_active = true${a.sql}${aScope.on('a.department_name')}`
    const ap = aScope.params
    // Findings joined under those audits are narrowed too (same $n).
    const fUnderA = aScope.on('f.location_name')
    // The map has no date window; its $1 is the spellings. Plans name their place by id: their $1 is the user.
    const nScope = scoped(scope?.spellings ?? null, [])
    const np = nScope.params
    const planParams = scope ? [scope.userId] : []
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
      query(overdueActionsSql(fWhere, fp.length + 1, withPhotos), [...fp, today]),
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
           AND (p.location_id IS NOT NULL OR p.assigned_team_id IS NOT NULL)${
             // A plan names its place by id; a field manager's are the plans of their locations.
             scope
               ? ` AND p.location_id IN (
                   SELECT fm_l.id FROM five_s_locations fm_l
                    WHERE coalesce(fm_l.field_manager_user_ids, '[]'::jsonb) ? $1::text)`
               : ''
           }
         GROUP BY p.status`,
        planParams
      ),
      query(
        `SELECT coalesce(t.name, 'Ekipsiz') AS team_name,
                count(DISTINCT a.id)::int AS audit_count,
                count(f.id)::int AS finding_count,
                CASE WHEN count(DISTINCT a.id) > 0
                     THEN round(count(f.id)::numeric / count(DISTINCT a.id), 2)
                     ELSE 0 END AS avg_findings_per_audit
         FROM five_s_audits a
         LEFT JOIN five_s_findings f ON f.audit_id = a.id AND f.is_active = true${fUnderA}
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
       *
       * avg_total is one vote per audit. It was taken over the audits JOINED
       * to their findings, so an audit with nine findings weighed nine times
       * and one with none once: on the local data Üretim averaged 99.40 here
       * against 96.43 on the scores card, from the same seven audits. The
       * findings are counted per audit first (fc) and the location is picked
       * once per audit (loc — two rows spelling one name would double it
       * again), so nothing fans an audit out before the average.
       */
      query(
        `SELECT coalesce(loc.department_name, 'Tanımsız') AS department_name,
                count(DISTINCT a.id) FILTER (WHERE ${isAudit})::int AS audit_count,
                round(avg(a.total_score) FILTER (WHERE ${isAudit}), 2) AS avg_total,
                coalesce(sum(fc.open_findings), 0)::int AS open_findings,
                coalesce(sum(fc.in_progress_findings), 0)::int AS in_progress_findings,
                coalesce(sum(fc.closed_findings), 0)::int AS closed_findings,
                coalesce(sum(fc.overdue_findings), 0)::int AS overdue_findings
         FROM five_s_audits a
         LEFT JOIN LATERAL (
           SELECT l.department_name FROM five_s_locations l
            WHERE lower(trim(l.name)) = lower(trim(a.department_name))
            ORDER BY l.is_active DESC NULLS LAST, l.id
            LIMIT 1
         ) loc ON true
         LEFT JOIN (
           SELECT f.audit_id,
                  count(*) FILTER (WHERE f.status = 'open') AS open_findings,
                  count(*) FILTER (WHERE f.status = 'in_progress') AS in_progress_findings,
                  count(*) FILTER (WHERE f.status = 'closed') AS closed_findings,
                  count(*) FILTER (WHERE f.status <> 'closed' AND f.due_date < $${ap.length + 1}::date)
                    AS overdue_findings
             FROM five_s_findings f
            WHERE f.is_active = true AND f.audit_id IS NOT NULL${fUnderA}
            GROUP BY f.audit_id
         ) fc ON fc.audit_id = a.id
         WHERE ${aWhere} GROUP BY loc.department_name ORDER BY audit_count DESC`,
        [...ap, today]
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
         WHERE l.is_active = true${nScope.on('l.name')}
         GROUP BY l.id, l.name, l.map_x, l.map_y, l.department_name
         ORDER BY open_findings DESC`,
        np
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
  handler: async ({ query: q, request }) => {
    const from = parseDate(q?.date_from)
    const to = parseDate(q?.date_to)
    const data = await loadDashboard(from, to, await fieldManagerScope(request))
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
      ...PHOTO_SHEET_COLUMNS,
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
  handler: async ({ query: q, request }) => {
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
    // The workbook carries what the screen shows this caller, no more (#7/#24).
    // Photo columns are read only when the overdue sheet, the one that draws them, is in it.
    const data = await loadDashboard(
      from,
      to,
      await fieldManagerScope(request),
      todayAtPlant(),
      keys.includes('overdueActions')
    )
    // This report narrows by date range only (see DASHBOARD_PHOTO_HINT).
    const buffer = await buildWorkbook(
      keys.map((k) => ({
        name: SECTIONS[k].title,
        columns: SECTIONS[k].columns,
        // Only this sheet prints a finding's description; single findings from before R19 carry a role as their team.
        rows: k === 'overdueActions' ? data[k].map(describedWithoutRoleAsTeam) : data[k],
      })),
      { photoHint: DASHBOARD_PHOTO_HINT }
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
  // '1': only findings with a before AND an after photo (the "Önce / Sonra
  // Fotoğraflı Bulgular" card), so its file lists what the card lists.
  with_photos: t.Optional(t.String()),
})

/*
 * A single finding raised on its own: its carrier audit row says so and its
 * form_title is still the plain "Tekil Bulgu". One raised inside an audit sits
 * under a carrier row too, but carries that audit's name in form_title (R74),
 * so the register and this export list it with the audit's findings.
 */
const STANDALONE_SINGLE = `(a.source IS NOT DISTINCT FROM 'single_finding' AND coalesce(nullif(trim(f.form_title), ''), 'Tekil Bulgu') = 'Tekil Bulgu')`

/**
 * Does the finding carry a photo on this side? Any of the three places a photo
 * has been kept counts: the array column (a non-empty list), or the
 * single-photo id / url columns that preceded it. The array is read as
 * photos.ts reads it, also when it arrives as JSON text.
 */
export function hasPhoto(f: Row, side: 'before' | 'after'): boolean {
  let list: unknown = f[`photo_${side}_files`]
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list)
    } catch {
      list = []
    }
  }
  if (Array.isArray(list) && list.length > 0) return true
  return [f[`photo_${side}_file_id`], f[`photo_${side}_url`]].some((v) => String(v ?? '').trim() !== '')
}

export const hasBeforeAndAfterPhotos = (f: Row) => hasPhoto(f, 'before') && hasPhoto(f, 'after')

export type FindingFilters = {
  /** Every stored spelling of the chosen location (findingSpellings); null = no location filter. */
  spellings: string[] | null
  status: string
  source: string
  from: string | null
  to: string | null
  /** Every stored spelling of the field manager's places (managedSpellings); null = not narrowed to a field manager. */
  scopeSpellings: string[] | null
}

/** The register's WHERE fragments and their parameters, built together so a placeholder always has its value. */
export function findingsFilter(f: FindingFilters): { sql: string; params: QueryParam[] } {
  const clauses: string[] = []
  const params: QueryParam[] = []
  let i = 1
  if (f.spellings) {
    // Matched on the spellings the findings use for this place (locationMatch.ts), not
    // lower(trim()) in SQL, which kept a "Bölge  3" or non-breaking-space row out.
    clauses.push(` AND f.location_name = ANY($${i++}::text[])`)
    params.push(f.spellings)
  }
  // `status` names one status or a comma list (R48: Açık = open,in_progress). One keeps its plain equality.
  const statuses = parseStatuses(f.status)
  if (statuses.length === 1) {
    clauses.push(` AND f.status = $${i++}`)
    params.push(...statuses)
  } else if (statuses.length > 1) {
    clauses.push(` AND f.status = ANY($${i++}::text[])`)
    params.push(statuses)
  }
  // A single finding raised inside an audit is that audit's finding (R74): only a standalone one is "single_finding".
  if (f.source === 'single_finding') clauses.push(` AND ${STANDALONE_SINGLE}`)
  if (f.source === 'audit') clauses.push(` AND NOT ${STANDALONE_SINGLE}`)
  // #7/#24: the export shows a field manager what their register shows.
  // Matched on the spellings found by locationKey (reportScope.ts), not lower(trim()) in SQL.
  if (f.scopeSpellings) {
    clauses.push(inManagedLocations('f.location_name', i++))
    params.push(f.scopeSpellings)
  }
  const range = dateRange('f.detected_date', f.from, f.to, i)
  clauses.push(range.sql)
  params.push(...range.params)
  return { sql: clauses.join(''), params }
}

type FindingsRequest = Record<string, string | undefined> | undefined

/**
 * The filter a findings request names, resolved against the stored spellings of
 * the place and the caller's own scope (a field manager's places, #7/#24). The
 * workbook and its count both start here, so they name the same findings (R48).
 */
async function requestedFilter(q: FindingsRequest, forceOpen: boolean, request: Request) {
  const locationName = String(q?.location_name ?? '').trim()
  const filter = findingsFilter({
    spellings: locationName ? await findingSpellings(locationName) : null,
    status: forceOpen ? 'open' : String(q?.status ?? '').trim(),
    source: String(q?.source ?? '').trim(),
    from: parseDate(q?.date_from),
    to: parseDate(q?.date_to),
    scopeSpellings: (await fieldManagerScope(request))?.spellings ?? null,
  })
  return { locationName, ...filter }
}

async function findingsWorkbook(q: FindingsRequest, forceOpen: boolean, request: Request) {
  const withPhotos = ['1', 'true'].includes(String(q?.with_photos ?? '').trim().toLowerCase())
  const { locationName, sql: where, params } = await requestedFilter(q, forceOpen, request)

  const all: Row[] = await query(
    `SELECT ${FINDING_NUMBERS_SELECT}, f.detected_date, ${FINDING_PLACE} AS location_name, f.finding_type,
            coalesce(f.step_code, '') AS step_code, f.description, f.action_to_take,
            f.due_date, f.completed_at, f.responsible_name, f.auditor_name, f.status,
            CASE WHEN ${STANDALONE_SINGLE} THEN 'Tekil Bulgu'
                 WHEN a.id IS NOT NULL THEN 'Denetim' ELSE '' END AS source_label,
            CASE WHEN a.id IS NOT NULL AND a.source IS DISTINCT FROM 'single_finding'
                 THEN concat_ws(' – ', a.department_name, to_char(a.audit_date, 'DD.MM.YYYY'))
                 WHEN a.source IS NOT DISTINCT FROM 'single_finding' AND NOT ${STANDALONE_SINGLE}
                 THEN replace(f.form_title, ' · ', ' – ')
                 ELSE '' END AS audit_label, ${PHOTO_COLUMNS}
     ${FINDINGS_FROM_WHERE}${where}
     ORDER BY f.finding_no ASC NULLS LAST`,
    params
  )
  // Single findings from before R19 carry "Ekip: <role name>" in the description; the register leaves it out.
  const rows = (withPhotos ? all.filter(hasBeforeAndAfterPhotos) : all).map(describedWithoutRoleAsTeam)

  const buffer = await buildWorkbook([
    {
      name: withPhotos ? 'Önce-Sonra Fotoğraflı Bulgular' : forceOpen ? 'Açık Bulgular' : 'Bulgular',
      columns: FINDINGS_SHEET_COLUMNS,
      rows,
    },
  ], { photoHint: PHOTO_HINT })
  const suffix = locationName ? `-${locationName}` : ''
  const kind = withPhotos ? 'fotografli-bulgu' : forceOpen ? 'acik-bulgu' : 'bulgu'
  return xlsxResponse(buffer, `5s-${kind}-raporu${suffix}-${todayAtPlant()}.xlsx`)
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

/*
 * How many findings `findings.xlsx` would list for the same parameters (R48), so
 * the screen can say "12 açık ve devam eden bulgu indirilecek" before the download. Same
 * filter, same scope, same rows; `with_photos` is the one parameter it does not
 * take, because that narrowing happens after the read and the screen never sets it.
 */
const findingsCountQuery = t.Object({
  ...dateWindow,
  location_name: t.Optional(t.String()),
  status: t.Optional(t.String()),
  source: t.Optional(t.String()),
})

const findingsCount = defineRoute({
  method: 'GET',
  path: '/findings-count',
  query: findingsCountQuery,
  detail: { tags: ['Reports'], summary: 'How many findings the findings Excel would list' },
  handler: async ({ query: q, request }) => {
    const { sql: where, params } = await requestedFilter(q, false, request)
    return { success: true, message: 'Findings count', data: { total: await countFindings(where, params) } }
  },
})

/**
 * Mounted under `/reports`, behind nucleus's guard chain as before, and then
 * behind the 5S-role check for every route in the group.
 *
 * `AnyRoute[]` is load-bearing: `defineRoute` keeps `path` as a literal
 * type, so two routes with different paths are different types and cannot
 * share an array without it.
 */
const routes: AnyRoute[] = [dashboard, dashboardXlsx, openFindings, findingsXlsx, findingsCount, locationFormXlsx]
export const ReportsRoutes: RouteGroup = {
  prefix: '/reports',
  guards: [(context) => refuseNonReportReaders(context)],
  routes,
}
