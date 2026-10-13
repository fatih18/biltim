import { describe, expect, it } from 'bun:test'
import type { Caller } from '../guards/caller'
import { hasBeforeAndAfterPhotos, hasPhoto, maySeeReports, refuseNonReportReaders } from './reports'

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
