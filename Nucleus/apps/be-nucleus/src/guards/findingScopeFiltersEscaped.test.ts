import { describe, expect, it } from 'bun:test'
import { enforceFindingScope, narrowFindingQuery } from './findingScope'
import { isPlaceLookup, isPlainIlike } from './findingScopeFilters'
import { AUDITOR_FM, FIELD_MANAGER, MINE, OTHER, request, world } from './findingScopeKit'

/**
 * A place whose name holds an underscore or a percent sign ("Hat_1", "Yüzde%")
 * is looked up with its wildcards escaped, and the field manager's own limit
 * names places as they are written, never as a pattern.
 */

const HAT = 'Hat_1'
const PERCENT = 'Yüzde%'
const ilike = (value: string) => [{ field: 'location_name', operator: 'ilike', value }]
const eq = (value: string) => [{ field: 'location_name', operator: 'eq', value }]
const asFilters = (filters: object) => ({ filters: JSON.stringify(filters) })

describe('isPlainIlike: a pattern is a plain name once the escaped characters are taken out', () => {
  it('accepts a name with no wildcard, and one whose wildcards are escaped', () => {
    expect(isPlainIlike(OTHER)).toBe(true)
    expect(isPlainIlike('Hat\\_1')).toBe(true)
    expect(isPlainIlike('Yüzde\\%')).toBe(true)
    expect(isPlainIlike('A\\_B\\%C')).toBe(true)
  })

  it('refuses a wildcard that is not escaped, wherever it stands', () => {
    for (const pattern of ['Hat_1', 'Yüzde%', '%', '_', 'Hat\\__1', 'Yüzde\\%%', '%Hat\\_1']) {
      expect(isPlainIlike(pattern)).toBe(false)
    }
  })

  it('reads an escaped backslash as one literal backslash, so a wildcard after it is still a wildcard', () => {
    expect(isPlainIlike('A\\\\B')).toBe(true)
    expect(isPlainIlike('A\\\\_B')).toBe(false)
    expect(isPlainIlike('A\\\\%')).toBe(false)
    expect(isPlainIlike('A\\\\\\_B')).toBe(true)
  })

  it('refuses a backslash left alone at the end: PostgreSQL rejects such a pattern', () => {
    expect(isPlainIlike('Hat\\')).toBe(false)
    expect(isPlainIlike('Hat\\\\\\')).toBe(false)
  })
})

describe('isPlaceLookup with names that hold a wildcard character', () => {
  it('accepts the escaped ilike of the audit form', () => {
    expect(isPlaceLookup(asFilters(ilike('Hat\\_1')))).toBe(true)
    expect(isPlaceLookup(asFilters(ilike('Yüzde\\%')))).toBe(true)
  })

  it('accepts an eq filter whatever the name holds', () => {
    expect(isPlaceLookup(asFilters(eq(HAT)))).toBe(true)
    expect(isPlaceLookup(asFilters(eq(PERCENT)))).toBe(true)
    expect(isPlaceLookup(asFilters(eq(OTHER)))).toBe(true)
  })

  it('refuses the same names written as a pattern, which would match other places too', () => {
    expect(isPlaceLookup(asFilters(ilike(HAT)))).toBe(false)
    expect(isPlaceLookup(asFilters(ilike(PERCENT)))).toBe(false)
    expect(isPlaceLookup(asFilters(ilike('Hat\\\\_1')))).toBe(false)
  })
})

describe('an auditor who is also a field manager auditing a foreign place with a wildcard in its name', () => {
  const STORED = [MINE, HAT, 'HAT_1', 'Hat-1', PERCENT]
  const list = (filters: object) => {
    const { read, calls } = world({ managed: [MINE], stored: STORED })
    const query = { filters: JSON.stringify(filters) }
    const run = () => enforceFindingScope({ request: request('GET', '/fiveSFindings'), query, read, caller: AUDITOR_FM })
    return { query, calls, run }
  }

  it('reads that place untouched and costs no query when the form escapes the name', async () => {
    for (const place of [HAT, PERCENT]) {
      const lookup = [
        { field: 'is_active', operator: 'eq', value: true },
        ...ilike(place.replace(/[%_\\]/g, '\\$&')),
        { field: 'status', operator: 'in', value: ['open', 'in_progress'] },
      ]
      const { query, calls, run } = list(lookup)
      const before = query.filters
      expect((await run()).refusal).toBeUndefined()
      expect(query.filters).toBe(before)
      expect(calls).toHaveLength(0)
    }
  })

  it('is limited to their own places when the name goes out unescaped, a wildcard being a wildcard', async () => {
    const { query, run } = list(ilike(HAT))
    expect((await run()).refusal).toBeUndefined()
    const sent = JSON.parse(query.filters ?? '')
    expect(sent).toHaveLength(2)
    expect(sent[1]).toEqual({ field: 'location_name', operator: 'in', value: [MINE] })
  })
})

describe('the field manager own-location limit names places literally', () => {
  it('adds an `in` of the exact spellings and never a pattern, for names with _ and %', async () => {
    const stored = [HAT, 'HAT_1', 'Hat-1', 'HatX1', PERCENT, 'Yüzde 5', 'Yüzde', MINE]
    const { read } = world({ managed: [HAT, PERCENT], stored })
    const query: Record<string, string | undefined> = {}
    const { refusal } = await enforceFindingScope({ request: request('GET', '/fiveSFindings'), query, read, caller: FIELD_MANAGER })
    expect(refusal).toBeUndefined()
    const added = JSON.parse(query.filters ?? '')
    expect(added).toEqual([{ field: 'location_name', operator: 'in', value: [HAT, 'HAT_1', PERCENT] }])
    expect(query.filters).not.toContain('like')
  })

  it('does not rewrite a spelling: the value is carried as stored', () => {
    const query: Record<string, string | undefined> = { filters: '' }
    expect(narrowFindingQuery(query, [HAT, PERCENT, 'A\\B'])).toBeUndefined()
    expect(JSON.parse(query.filters ?? '')).toEqual([{ field: 'location_name', operator: 'in', value: [HAT, PERCENT, 'A\\B'] }])
  })
})
