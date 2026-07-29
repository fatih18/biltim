import { getTenantDB } from '@monorepo/drizzle-manager'
import { sql } from 'drizzle-orm'
import { withChecks } from '@/controllers/utils'
import type { CompanyInfo } from '@/middlewares'
import type { ElysiaRequestWOBody } from '@/server'
import { generateResponse } from '@/utils'

type Row = Record<string, unknown>

function extractRows(res: unknown): Row[] {
  if (Array.isArray(res)) return res as Row[]
  const withRows = res as { rows?: Row[] }
  if (Array.isArray(withRows?.rows)) return withRows.rows
  return []
}

function getSchemaName(request: ElysiaRequestWOBody): string {
  try {
    const companyInfo = JSON.parse(
      request.request.headers.get('company_info') || '{}'
    ) as CompanyInfo
    return companyInfo.schema_name || 'main'
  } catch {
    return 'main'
  }
}

function parseDateParam(value: unknown): string | null {
  const s = String(value ?? '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

/**
 * GET /reports/dashboard
 * Dashboard raporları için tek çağrıda aggregate veriler.
 * Query: date_from, date_to (YYYY-MM-DD, opsiyonel)
 */
export async function DashboardReport(request: ElysiaRequestWOBody) {
  return withChecks({
    req: request,
    operationName: 'Dashboard report aggregates',
    endpoint: async function endpoint() {
      const schemaName = getSchemaName(request)
      const db = await getTenantDB(schemaName)

      const dateFrom = parseDateParam(request.query?.date_from)
      const dateTo = parseDateParam(request.query?.date_to)

      const fWhere = sql`f.is_active = true${
        dateFrom ? sql` AND f.detected_date >= ${dateFrom}` : sql``
      }${dateTo ? sql` AND f.detected_date <= ${dateTo}` : sql``}`

      const aWhere = sql`a.is_active = true${
        dateFrom ? sql` AND a.audit_date >= ${dateFrom}::timestamp` : sql``
      }${dateTo ? sql` AND a.audit_date <= (${dateTo}::date + interval '1 day')` : sql``}`

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
        // 1. Bölge / bulgu tipi dağılımı
        db.execute(sql`
          SELECT f.location_name, f.finding_type, count(*)::int AS count
          FROM five_s_findings f
          WHERE ${fWhere}
          GROUP BY f.location_name, f.finding_type
          ORDER BY count DESC
        `),

        // 2. Açık / kapalı bulgu sayıları (bölge + müdürlük)
        db.execute(sql`
          SELECT f.location_name, l.department_name, f.status, count(*)::int AS count
          FROM five_s_findings f
          LEFT JOIN five_s_locations l ON lower(trim(l.name)) = lower(trim(f.location_name))
          WHERE ${fWhere}
          GROUP BY f.location_name, l.department_name, f.status
          ORDER BY count DESC
        `),

        // 4. Termin tarihini geçmiş açık aksiyonlar
        db.execute(sql`
          SELECT f.id, f.finding_no, f.location_name, f.finding_type, f.description,
                 f.action_to_take, f.due_date, f.responsible_name, f.detected_date,
                 (CURRENT_DATE - f.due_date)::int AS overdue_days
          FROM five_s_findings f
          WHERE ${fWhere} AND f.status = 'open' AND f.due_date IS NOT NULL AND f.due_date < CURRENT_DATE
          ORDER BY f.due_date ASC
          LIMIT 500
        `),

        // 5. Puanların müdürlük ve bölge bazında raporlanması
        db.execute(sql`
          SELECT a.department_name,
                 l.department_name AS directorate_name,
                 count(*)::int AS audit_count,
                 round(avg(a.total_score), 2) AS avg_total,
                 round(avg(a.target_score), 2) AS avg_target,
                 round(avg(a.score_s1), 2) AS avg_s1,
                 round(avg(a.score_s2), 2) AS avg_s2,
                 round(avg(a.score_s3), 2) AS avg_s3,
                 round(avg(a.score_s4), 2) AS avg_s4,
                 round(avg(a.score_s5), 2) AS avg_s5
          FROM five_s_audits a
          LEFT JOIN five_s_locations l ON lower(trim(l.name)) = lower(trim(a.department_name))
          WHERE ${aWhere}
          GROUP BY a.department_name, l.department_name
          ORDER BY avg_total DESC
        `),

        // 6. Bölge / 5S adımı dağılımı
        db.execute(sql`
          SELECT f.location_name, coalesce(f.step_code, 'Bilinmiyor') AS step_code, count(*)::int AS count
          FROM five_s_findings f
          WHERE ${fWhere}
          GROUP BY f.location_name, f.step_code
          ORDER BY count DESC
        `),

        // 7. Denetim dönemlerine göre 5S puan trendi (hedef karşılaştırmalı)
        db.execute(sql`
          SELECT to_char(a.audit_date, 'YYYY-MM') AS period,
                 count(*)::int AS audit_count,
                 round(avg(a.total_score), 2) AS avg_total,
                 round(avg(a.target_score), 2) AS avg_target
          FROM five_s_audits a
          WHERE ${aWhere}
          GROUP BY 1
          ORDER BY 1 ASC
        `),

        // 8. Denetim planına uyum
        db.execute(sql`
          SELECT p.status,
                 count(*)::int AS count,
                 count(*) FILTER (WHERE p.auditor_attended = true)::int AS auditor_attended,
                 count(*) FILTER (WHERE p.auditor_attended = false)::int AS auditor_missed,
                 count(*) FILTER (WHERE p.field_manager_attended = true)::int AS field_manager_attended,
                 count(*) FILTER (WHERE p.field_manager_attended = false)::int AS field_manager_missed
          FROM five_s_audit_plans p
          WHERE p.is_active = true AND (p.location_id IS NOT NULL OR p.assigned_team_id IS NOT NULL)
          GROUP BY p.status
        `),

        // 9. Ekip başına denetim başına ortalama bulgu
        db.execute(sql`
          SELECT coalesce(t.name, 'Ekipsiz') AS team_name,
                 count(DISTINCT a.id)::int AS audit_count,
                 count(f.id)::int AS finding_count,
                 CASE WHEN count(DISTINCT a.id) > 0
                      THEN round(count(f.id)::numeric / count(DISTINCT a.id), 2)
                      ELSE 0 END AS avg_findings_per_audit
          FROM five_s_audits a
          LEFT JOIN five_s_findings f ON f.audit_id = a.id AND f.is_active = true
          LEFT JOIN five_s_audit_plans p ON p.id = a.plan_id
          LEFT JOIN five_s_audit_teams t ON t.id = p.assigned_team_id
          WHERE ${aWhere}
          GROUP BY t.name
          ORDER BY avg_findings_per_audit DESC
        `),

        // 10. Müdürlük bazlı özet
        db.execute(sql`
          SELECT coalesce(l.department_name, 'Tanımsız') AS department_name,
                 count(DISTINCT a.id)::int AS audit_count,
                 round(avg(a.total_score), 2) AS avg_total,
                 count(f.id) FILTER (WHERE f.status = 'open')::int AS open_findings,
                 count(f.id) FILTER (WHERE f.status <> 'open')::int AS closed_findings,
                 count(f.id) FILTER (WHERE f.status = 'open' AND f.due_date < CURRENT_DATE)::int AS overdue_findings
          FROM five_s_audits a
          LEFT JOIN five_s_locations l ON lower(trim(l.name)) = lower(trim(a.department_name))
          LEFT JOIN five_s_findings f ON f.audit_id = a.id AND f.is_active = true
          WHERE ${aWhere}
          GROUP BY l.department_name
          ORDER BY audit_count DESC
        `),

        // 11. Fabrika krokisi ısı haritası verisi
        db.execute(sql`
          SELECT l.id, l.name, l.map_x, l.map_y, l.department_name,
                 count(f.id)::int AS total_findings,
                 count(f.id) FILTER (WHERE f.status = 'open')::int AS open_findings,
                 round(avg(
                   CASE WHEN f.completed_at IS NOT NULL
                        THEN (f.completed_at - f.detected_date)::numeric
                   END
                 ), 1) AS avg_close_days
          FROM five_s_locations l
          LEFT JOIN five_s_findings f
            ON lower(trim(f.location_name)) = lower(trim(l.name)) AND f.is_active = true
          WHERE l.is_active = true
          GROUP BY l.id, l.name, l.map_x, l.map_y, l.department_name
          ORDER BY open_findings DESC
        `),
      ])

      return generateResponse({
        isSuccess: true,
        message: 'Dashboard report aggregates',
        data: {
          byLocationType: extractRows(byLocationType),
          statusCounts: extractRows(statusCounts),
          overdueActions: extractRows(overdueActions),
          scoresByDepartment: extractRows(scoresByDepartment),
          byStepCode: extractRows(byStepCode),
          scoreTrend: extractRows(scoreTrend),
          planCompliance: extractRows(planCompliance),
          findingsPerTeam: extractRows(findingsPerTeam),
          departmentSummary: extractRows(departmentSummary),
          mapHeat: extractRows(mapHeat),
          filters: { date_from: dateFrom, date_to: dateTo },
        },
        request,
      })
    },
  })
}

/**
 * GET /reports/open-findings.xlsx
 * Açık bulguların Excel raporu (download).
 * Query: location_name (opsiyonel), date_from, date_to (opsiyonel)
 */
export async function OpenFindingsExcel(request: ElysiaRequestWOBody) {
  const schemaName = getSchemaName(request)
  const db = await getTenantDB(schemaName)

  const locationName = String(request.query?.location_name ?? '').trim()
  const dateFrom = parseDateParam(request.query?.date_from)
  const dateTo = parseDateParam(request.query?.date_to)

  const where = sql`f.is_active = true AND f.status = 'open'${
    locationName ? sql` AND lower(trim(f.location_name)) = lower(trim(${locationName}))` : sql``
  }${dateFrom ? sql` AND f.detected_date >= ${dateFrom}` : sql``}${
    dateTo ? sql` AND f.detected_date <= ${dateTo}` : sql``
  }`

  const res = await db.execute(sql`
    SELECT f.finding_no, f.detected_date, f.location_name, f.finding_type,
           coalesce(f.step_code, '') AS step_code, f.description, f.action_to_take,
           f.due_date, f.responsible_name, f.auditor_name, f.status
    FROM five_s_findings f
    WHERE ${where}
    ORDER BY f.finding_no ASC
  `)
  const rows = extractRows(res)

  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Nucleus 5S'
  const sheet = workbook.addWorksheet('Açık Bulgular')

  sheet.columns = [
    { header: 'Bulgu No', key: 'finding_no', width: 10 },
    { header: 'Tespit Tarihi', key: 'detected_date', width: 14 },
    { header: 'Lokasyon', key: 'location_name', width: 24 },
    { header: 'Bulgu Tipi', key: 'finding_type', width: 20 },
    { header: '5S Adımı', key: 'step_code', width: 10 },
    { header: 'Açıklama', key: 'description', width: 48 },
    { header: 'Yapılacak Aksiyon', key: 'action_to_take', width: 32 },
    { header: 'Termin', key: 'due_date', width: 14 },
    { header: 'Sorumlu', key: 'responsible_name', width: 22 },
    { header: 'Denetçi', key: 'auditor_name', width: 22 },
    { header: 'Durum', key: 'status', width: 10 },
  ]

  sheet.getRow(1).font = { bold: true }
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDDEBF7' },
  }

  for (const row of rows) {
    sheet.addRow({
      finding_no: row.finding_no,
      detected_date: row.detected_date ? String(row.detected_date).slice(0, 10) : '',
      location_name: row.location_name ?? '',
      finding_type: row.finding_type ?? '',
      step_code: row.step_code ?? '',
      description: row.description ?? '',
      action_to_take: row.action_to_take ?? '',
      due_date: row.due_date ? String(row.due_date).slice(0, 10) : '',
      responsible_name: row.responsible_name ?? '',
      auditor_name: row.auditor_name ?? '',
      status: row.status === 'open' ? 'Açık' : String(row.status ?? ''),
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const today = new Date().toISOString().slice(0, 10)
  const suffix = locationName ? `-${locationName.replace(/[^a-zA-Z0-9-_]/g, '_')}` : ''
  const filename = `5s-acik-bulgu-raporu${suffix}-${today}.xlsx`

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
