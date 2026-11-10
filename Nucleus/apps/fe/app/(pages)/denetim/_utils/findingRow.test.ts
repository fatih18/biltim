import { describe, expect, it } from 'bun:test'
import { findingFromRow, findingsFromRows } from './findingRow'

describe('findingFromRow', () => {
  it('reads the columns the panel shows, snake_case first and the camelCase twin otherwise', () => {
    const finding = findingFromRow({
      id: 'f-1',
      finding_no: 12,
      findingNo: 12,
      location_name: 'Bölge 3',
      locationName: 'Bölge 3',
      status: 'open',
      description: 'TEKİL BULGU',
      dueDate: '2026-11-20',
    })
    expect(finding?.id).toBe('f-1')
    expect(finding?.finding_no).toBe(12)
    expect(finding?.location_name).toBe('Bölge 3')
    expect(finding?.status).toBe('open')
    expect(finding?.description).toBe('TEKİL BULGU')
    expect(finding?.due_date).toBe('2026-11-20')
  })

  it('reads a number sent as text, and leaves an unnumbered finding null', () => {
    expect(findingFromRow({ id: 'f-1', finding_no: '7' })?.finding_no).toBe(7)
    expect(findingFromRow({ id: 'f-1', finding_no: ' ' })?.finding_no).toBeNull()
    expect(findingFromRow({ id: 'f-1', finding_no: 'abc' })?.finding_no).toBeNull()
    expect(findingFromRow({ id: 'f-1' })?.finding_no).toBeNull()
  })

  it('reads the before photos, a missing one as null', () => {
    const finding = findingFromRow({
      id: 'f-1',
      photo_before_files: [{ file_id: 'p-1', url: '/cdn/p-1' }, { fileId: 'p-2' }, 'junk', null],
    })
    expect(finding?.photo_before_files).toEqual([
      { file_id: 'p-1', url: '/cdn/p-1' },
      { file_id: 'p-2', url: null },
    ])
    expect(findingFromRow({ id: 'f-1' })?.photo_before_files).toBeNull()
  })

  it('carries every other column along, for the detail modal', () => {
    const finding = findingFromRow({ id: 'f-1', audit_id: 'a-1', closed_at: null, photo_after_url: '/cdn/x' })
    expect(finding).toMatchObject({ audit_id: 'a-1', photo_after_url: '/cdn/x' })
  })

  it('is no finding without an id', () => {
    expect(findingFromRow({ finding_no: 3 })).toBeNull()
    expect(findingFromRow({ id: '' })).toBeNull()
    expect(findingFromRow({ id: 5 })).toBeNull()
  })
})

describe('findingsFromRows', () => {
  it('drops the rows that are no finding and keeps the order', () => {
    expect(findingsFromRows([{ id: 'a' }, { name: 'x' }, { id: 'b' }]).map((f) => f.id)).toEqual(['a', 'b'])
  })
})
