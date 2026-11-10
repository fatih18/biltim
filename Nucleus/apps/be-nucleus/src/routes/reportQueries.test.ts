import { describe, expect, it } from 'bun:test'
import { DASHBOARD_PHOTO_HINT, PHOTO_COLUMNS, PHOTO_HINT } from './photoReport'
import { FINDING_PLACE, overdueActionsSql } from './reportQueries'

describe('FINDING_PLACE', () => {
  it('falls back to the audit’s department when the finding’s own place is empty or blank', () => {
    expect(FINDING_PLACE).toBe(`coalesce(nullif(trim(f.location_name), ''), a.department_name)`)
  })
})

describe('overdueActionsSql', () => {
  const where = 'f.is_active = true AND f.location_name = ANY($1::text[])'

  it('prints the place with the audit fallback, so the cell is not NULL or blank (R47 c)', () => {
    const sql = overdueActionsSql(where, 2, false)
    expect(sql).toContain(`${FINDING_PLACE} AS location_name`)
    expect(sql).toContain('LEFT JOIN five_s_audits a ON a.id = f.audit_id')
    expect(sql).not.toContain('f.finding_type, f.location_name')
  })

  it('counts days against the plant’s today and keeps the filter, the open status and the cap', () => {
    const sql = overdueActionsSql(where, 2, false)
    expect(sql).toContain('($2::date - f.due_date)::int AS overdue_days')
    expect(sql).toContain('f.due_date < $2::date')
    expect(sql).toContain(`WHERE ${where} AND f.status = 'open'`)
    expect(sql).toContain('LIMIT 500')
    const used = new Set([...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1])))
    expect([...used].sort()).toEqual([1, 2])
  })

  it('selects no photo column for the JSON, and all six for the Excel', () => {
    expect(overdueActionsSql(where, 2, false)).not.toContain('photo_')
    const withPhotos = overdueActionsSql(where, 2, true)
    for (const column of PHOTO_COLUMNS.split(', ')) expect(withPhotos).toContain(column)
    expect(PHOTO_COLUMNS.split(', ').length).toBe(6)
  })
})

describe('photo hints', () => {
  it('lets the findings sheets narrow by place, status and date range', () => {
    for (const word of ['lokasyon', 'durum', 'tarih aralığı']) expect(PHOTO_HINT).toContain(word)
  })

  it('offers the dashboard only what it takes: a date range', () => {
    expect(DASHBOARD_PHOTO_HINT).toContain('tarih aralığı')
    expect(DASHBOARD_PHOTO_HINT).not.toContain('lokasyon')
    expect(DASHBOARD_PHOTO_HINT).not.toContain('durum')
  })
})
