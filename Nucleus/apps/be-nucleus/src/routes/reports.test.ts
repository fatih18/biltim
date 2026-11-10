import { describe, expect, it } from 'bun:test'
import type { Caller } from '../guards/caller'
import {
  type FindingFilters,
  findingsFilter,
  hasBeforeAndAfterPhotos,
  hasPhoto,
  maySeeReports,
  refuseNonReportReaders,
} from './reports'

const who = (roles: string[], isGod = false): Caller => ({ userId: 'u-1', isGod, roles })

describe('maySeeReports', () => {
  it('lets every 5S role read the reports', () => {
    for (const role of ['godmin', 'super admin', 'content manager core team', 'manager', 'field manager', 'auditor']) {
      expect(maySeeReports(who([role]))).toBe(true)
    }
    expect(maySeeReports(who([], true))).toBe(true)
    expect(maySeeReports(who(['basic', 'auditor']))).toBe(true)
  })

  it('refuses a self-registered account, one with no role, and nobody', () => {
    expect(maySeeReports(who(['basic']))).toBe(false)
    expect(maySeeReports(who([]))).toBe(false)
    expect(maySeeReports(null)).toBe(false)
  })
})

describe('refuseNonReportReaders', () => {
  /** A stand-in for the two reads callerById makes: the user row, then their role names. */
  const reader = (user: Record<string, unknown> | null, roles: string[]) => async (text: string) =>
    text.includes('from main.users') ? (user ? [user] : []) : roles.map((name) => ({ name }))
  const request = (userId?: string) =>
    new Request('http://api/reports/findings.xlsx', { headers: userId ? { 'x-user-id': userId } : {} })

  it('answers 403 for a basic account', async () => {
    const res = await refuseNonReportReaders({ request: request('u-1') }, reader({ is_god: false }, ['Basic']))
    expect(res?.status).toBe(403)
    expect((await res?.json()).message).toBe('Raporları görme yetkiniz yok.')
  })

  it('answers 403 when the caller cannot be named', async () => {
    expect((await refuseNonReportReaders({ request: request() }, reader(null, [])))?.status).toBe(403)
    expect((await refuseNonReportReaders({ request: request('gone') }, reader(null, [])))?.status).toBe(403)
  })

  it('lets a 5S role through, and the godmin flag alone', async () => {
    expect(await refuseNonReportReaders({ request: request('u-1') }, reader({ is_god: false }, ['Auditor']))).toBe(
      undefined
    )
    expect(await refuseNonReportReaders({ request: request('u-1') }, reader({ is_god: true }, []))).toBe(undefined)
  })
})

describe('hasBeforeAndAfterPhotos', () => {
  const photo = [{ file_id: '6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c6' }]

  it('needs a photo on both sides', () => {
    expect(hasBeforeAndAfterPhotos({ photo_before_files: photo, photo_after_files: photo })).toBe(true)
    expect(hasBeforeAndAfterPhotos({ photo_before_files: photo, photo_after_files: [] })).toBe(false)
    expect(hasBeforeAndAfterPhotos({ photo_before_files: [], photo_after_files: photo })).toBe(false)
    expect(hasBeforeAndAfterPhotos({})).toBe(false)
  })

  it('counts the single-photo columns that preceded the array', () => {
    expect(
      hasBeforeAndAfterPhotos({
        photo_before_files: [],
        photo_before_file_id: '6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c6',
        photo_after_files: [],
        photo_after_url: '/cdn/6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c7',
      })
    ).toBe(true)
    expect(hasPhoto({ photo_before_file_id: null, photo_before_url: '   ' }, 'before')).toBe(false)
  })

  it('reads the array when it arrives as JSON text', () => {
    expect(hasPhoto({ photo_after_files: JSON.stringify(photo) }, 'after')).toBe(true)
    expect(hasPhoto({ photo_after_files: '[]' }, 'after')).toBe(false)
    expect(hasPhoto({ photo_after_files: 'not json' }, 'after')).toBe(false)
  })
})

describe('findingsFilter', () => {
  const none: FindingFilters = { spellings: null, status: '', source: '', from: null, to: null, scopeSpellings: null }

  it('adds no clause and no parameter when nothing is filtered', () => {
    expect(findingsFilter(none)).toEqual({ sql: '', params: [] })
  })

  it('matches the location on every stored spelling, as one text[] parameter', () => {
    const f = findingsFilter({ ...none, spellings: ['Bölge 3', 'BÖLGE  3'] })
    expect(f.sql).toBe(' AND f.location_name = ANY($1::text[])')
    expect(f.params).toEqual([['Bölge 3', 'BÖLGE  3']])
  })

  it('matches nothing, never everything, when no spelling of the place exists', () => {
    const f = findingsFilter({ ...none, spellings: [] })
    expect(f.sql).toContain('ANY($1::text[])')
    expect(f.params).toEqual([[]])
  })

  it('narrows a field manager to the spellings of their places, and to nothing when they have none', () => {
    const f = findingsFilter({ ...none, scopeSpellings: ['Bölge  3'] })
    expect(f.sql).toBe(' AND f.location_name = ANY($1::text[])')
    expect(f.params).toEqual([['Bölge  3']])
    expect(findingsFilter({ ...none, scopeSpellings: [] }).params).toEqual([[]])
  })

  it('numbers every placeholder in the order its value is pushed', () => {
    const f = findingsFilter({
      spellings: ['Pres'],
      status: 'closed',
      source: 'audit',
      from: '2026-01-01',
      to: '2026-12-31',
      scopeSpellings: ['Pres', 'PRES '],
    })
    expect(f.params).toEqual([['Pres'], 'closed', ['Pres', 'PRES '], '2026-01-01', '2026-12-31'])
    expect(f.sql).toContain('ANY($1::text[])')
    expect(f.sql).toContain('f.status = $2')
    // The field manager's scope is the second text[] parameter, matched on the stored spellings.
    expect(f.sql).toContain('f.location_name = ANY($3::text[])')
    expect(f.sql).not.toContain('lower(trim(')
    expect(f.sql).toContain('f.detected_date >= $4')
    expect(f.sql).toContain('f.detected_date <= $5')
    // R74: a single finding raised inside an audit is that audit's finding, so "audit" keeps it.
    expect(f.sql).toContain("NOT (a.source IS NOT DISTINCT FROM 'single_finding'")
    expect(f.sql).toContain("'Tekil Bulgu'")
    // Every $n in the SQL has a value, and no value is left without one.
    const used = new Set([...f.sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1])))
    expect([...used].sort()).toEqual(f.params.map((_, n) => n + 1))
  })

  it('lists only standalone single findings for source single_finding (R74)', () => {
    const f = findingsFilter({ ...none, source: 'single_finding' })
    expect(f.sql).toContain("AND (a.source IS NOT DISTINCT FROM 'single_finding'")
    expect(f.sql).not.toContain('AND NOT')
  })

  it('ignores a status it does not know', () => {
    expect(findingsFilter({ ...none, status: 'bogus' })).toEqual({ sql: '', params: [] })
  })
})
