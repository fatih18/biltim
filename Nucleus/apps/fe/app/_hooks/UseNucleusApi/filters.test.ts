import { describe, expect, test } from 'bun:test'
import { normalizeFilters } from './filters'

/**
 * Each case below is a payload that a real screen sends today, quoted from the
 * file it lives in. They are here because the old backend answered 200 to all
 * of them and 0.10 answers 400, so "the screen used to work" proves nothing.
 */
const f = (payload: unknown) => (normalizeFilters(payload) as Record<string, unknown>).filters

describe('legacy filter map -> nucleus filter array', () => {
  test('a bare value is an equality — (home)/page.tsx:229', () => {
    expect(f({ filters: { is_active: true } })).toEqual([
      { field: 'is_active', operator: 'eq', value: true },
    ])
  })

  test('several fields keep their order — Header/ClientSide:128', () => {
    expect(f({ filters: { user_id: 'u1', is_seen: false } })).toEqual([
      { field: 'user_id', operator: 'eq', value: 'u1' },
      { field: 'is_seen', operator: 'eq', value: false },
    ])
  })

  test('_gte/_lte become operators, not column names — bulgular/page.tsx:226', () => {
    expect(f({ filters: { detected_date_gte: '2026-01-01', detected_date_lte: '2026-12-31' } })).toEqual([
      { field: 'detected_date', operator: 'gte', value: '2026-01-01' },
      { field: 'detected_date', operator: 'lte', value: '2026-12-31' },
    ])
  })

  test('the screens write `x || undefined` for "not set", and it must vanish', () => {
    expect(f({ filters: { status: undefined, detected_date_gte: undefined } })).toBeUndefined()
  })

  test('an empty text input is also "not set", not `field = ""`', () => {
    expect(f({ filters: { status: '', location: 'Depo' } })).toEqual([
      { field: 'location', operator: 'eq', value: 'Depo' },
    ])
  })

  test('an explicit operator survives, and `ne` is renamed to nucleus’s `neq`', () => {
    expect(f({ filters: { age: { operator: 'gte', value: 18 }, kind: { operator: 'ne', value: 'x' } } })).toEqual([
      { field: 'age', operator: 'gte', value: 18 },
      { field: 'kind', operator: 'neq', value: 'x' },
    ])
  })

  test('a list means IN', () => {
    expect(f({ filters: { status: ['open', 'closed'] } })).toEqual([
      { field: 'status', operator: 'in', value: ['open', 'closed'] },
    ])
  })

  test('an empty list is no filter, NOT "match nothing"', () => {
    expect(f({ filters: { status: [] } })).toBeUndefined()
  })

  test('null asks for IS NULL rather than `field = null`', () => {
    expect(f({ filters: { closed_at: null } })).toEqual([
      { field: 'closed_at', operator: 'isNull', value: true },
    ])
  })

  test('a payload already speaking nucleus is passed through untouched', () => {
    const already = [{ field: 'a', operator: 'eq', value: 1 }]
    expect(f({ filters: already })).toBe(already)
  })

  test('a payload with no filters key is returned as-is', () => {
    const payload = { page: 1, limit: 20 }
    expect(normalizeFilters(payload)).toBe(payload)
  })

  test('everything else in the payload is preserved — bulgular sends page/limit/search/orderBy', () => {
    expect(
      normalizeFilters({
        page: 2,
        limit: 50,
        search: 'Depo',
        orderBy: 'finding_no',
        orderDirection: 'desc',
        filters: { status: 'open' },
      })
    ).toEqual({
      page: 2,
      limit: 50,
      search: 'Depo',
      orderBy: 'finding_no',
      orderDirection: 'desc',
      filters: [{ field: 'status', operator: 'eq', value: 'open' }],
    })
  })

  test('a short field that IS the suffix is not split into an empty column name', () => {
    expect(f({ filters: { _gte: 5 } })).toEqual([{ field: '_gte', operator: 'eq', value: 5 }])
  })
})
