import { describe, expect, it } from 'bun:test'
import { buildListPayload, mergePages, readListResponse } from './index'

const base = { search: '', pageSize: 25 }

describe('buildListPayload', () => {
  it('asks for one page, not the whole table', () => {
    // The screens this replaces sent limit: 500 (and 1000) and filtered in the
    // browser, which answered from the first 500 rows only.
    expect(buildListPayload(base, 1)).toEqual({ page: 1, limit: 25 })
    expect(buildListPayload({ ...base, pageSize: 50 }, 3)).toEqual({ page: 3, limit: 50 })
  })

  it('sends the search to the server with the fields it applies to', () => {
    const p = buildListPayload({ ...base, search: '  Güvenlik ', searchFields: ['finding_type', 'description'] }, 1)
    expect(p.search).toBe('Güvenlik')
    expect(p.searchFields).toBe('finding_type,description')
  })

  it('omits an empty or whitespace-only search rather than matching nothing', () => {
    expect(buildListPayload({ ...base, search: '   ' }, 1).search).toBeUndefined()
    expect(buildListPayload({ ...base, search: '', searchFields: ['a'] }, 1).searchFields).toBeUndefined()
  })

  it('serialises sort and passes filters in the dialect UseNucleusApi translates', () => {
    const p = buildListPayload(
      { ...base, sort: [{ field: 'finding_no', direction: 'desc' }], filters: { status: 'open' } },
      1
    )
    expect(p.sort).toBe('[{"field":"finding_no","direction":"desc"}]')
    expect(p.filters).toEqual({ status: 'open' })
  })

  it('omits empty sort and filters instead of sending [] or {}', () => {
    const p = buildListPayload({ ...base, sort: [], filters: {} }, 1)
    expect(p.sort).toBeUndefined()
    expect(p.filters).toBeUndefined()
  })

  it('merges a fixed scope without letting it overwrite the paging', () => {
    const p = buildListPayload({ ...base, extraPayload: { audit_id: 'a1' } }, 2)
    expect(p).toEqual({ page: 2, limit: 25, audit_id: 'a1' })
  })
})

describe('readListResponse', () => {
  it('reads the translated shape the screens receive', () => {
    const r = readListResponse<{ id: string }>({
      data: [{ id: '1' }],
      pagination: { hasNext: true, total: 42 },
    })
    expect(r.items).toHaveLength(1)
    expect(r.hasNext).toBe(true)
    expect(r.total).toBe(42)
  })

  it('also reads nucleus\'s own items/meta shape', () => {
    const r = readListResponse({ items: [{ id: '1' }, { id: '2' }], meta: { hasNextPage: false, totalItems: 2 } })
    expect(r.items).toHaveLength(2)
    expect(r.hasNext).toBe(false)
    expect(r.total).toBe(2)
  })

  it('treats a body with no list as empty and finished, not as more to come', () => {
    // Answering hasNext=true here would spin the scroll sentinel forever.
    for (const body of [null, undefined, {}, { data: null }]) {
      const r = readListResponse(body)
      expect(r.items).toEqual([])
      expect(r.hasNext).toBe(false)
      expect(r.total).toBeNull()
    }
  })
})

describe('mergePages', () => {
  it('appends the next page', () => {
    expect(mergePages([{ id: 'a' }], [{ id: 'b' }])).toEqual([{ id: 'a' }, { id: 'b' }])
  })

  it('drops a row already held', () => {
    // Offset paging repeats the boundary row when something is inserted between
    // two reads; rendering it twice also breaks React's keys.
    const merged = mergePages([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }])
    expect(merged.map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })

  it('keeps rows that carry no id rather than collapsing them into one', () => {
    const merged = mergePages([{ name: 'x' }], [{ name: 'y' }, { name: 'z' }])
    expect(merged).toHaveLength(3)
  })
})
