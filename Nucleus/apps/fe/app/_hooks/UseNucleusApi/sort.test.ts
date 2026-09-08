import { describe, expect, it } from 'bun:test'
import { normalizeSort } from './sort'

const sortOf = (payload: unknown) => JSON.parse(String((normalizeSort(payload) as Record<string, unknown>).sort))

describe('normalizeSort', () => {
  it('translates a column name with a direction beside it', () => {
    expect(sortOf({ orderBy: 'created_at', orderDirection: 'desc' })).toEqual([
      { field: 'created_at', direction: 'desc' },
    ])
  })

  it('translates the {column, direction} list form', () => {
    // The live check that started this: this exact payload returned 3,4,5
    // while the sort form returned 5,4,3.
    expect(sortOf({ orderBy: [{ column: 'finding_no', direction: 'desc' }] })).toEqual([
      { field: 'finding_no', direction: 'desc' },
    ])
  })

  it('keeps multi-field ordering in the order it was given', () => {
    expect(
      sortOf({ orderBy: [{ column: 'status', direction: 'asc' }, { column: 'due_date', direction: 'desc' }] })
    ).toEqual([
      { field: 'status', direction: 'asc' },
      { field: 'due_date', direction: 'desc' },
    ])
  })

  it('defaults to ascending when no direction is given', () => {
    expect(sortOf({ orderBy: 'name' })).toEqual([{ field: 'name', direction: 'asc' }])
  })

  it('falls back to orderDirection for entries that omit their own', () => {
    expect(sortOf({ orderBy: [{ column: 'name' }], orderDirection: 'desc' })).toEqual([
      { field: 'name', direction: 'desc' },
    ])
  })

  it('ignores a direction that is not asc or desc rather than passing it through', () => {
    expect(sortOf({ orderBy: 'name', orderDirection: 'DESCENDING' })).toEqual([
      { field: 'name', direction: 'asc' },
    ])
  })

  it('removes the old keys so the server is not sent both dialects', () => {
    const out = normalizeSort({ orderBy: 'name', orderDirection: 'desc', page: 2 }) as Record<string, unknown>
    expect(out.orderBy).toBeUndefined()
    expect(out.orderDirection).toBeUndefined()
    expect(out.page).toBe(2)
  })

  it('leaves an explicit sort alone', () => {
    const out = normalizeSort({ orderBy: 'name', sort: [{ field: 'id', direction: 'asc' }] }) as Record<string, unknown>
    expect(out.sort).toEqual([{ field: 'id', direction: 'asc' }])
    expect(out.orderBy).toBeUndefined()
  })

  it('sends no ordering when nothing orderable was named', () => {
    for (const payload of [{ orderBy: '' }, { orderBy: [] }, { orderBy: [{ direction: 'desc' }] }, { orderBy: null }]) {
      const out = normalizeSort(payload) as Record<string, unknown>
      expect(out.sort).toBeUndefined()
    }
  })

  it('leaves a payload that never mentioned ordering untouched', () => {
    const payload = { page: 1, limit: 20 }
    expect(normalizeSort(payload)).toBe(payload)
  })
})
