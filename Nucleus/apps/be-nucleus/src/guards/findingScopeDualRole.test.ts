import { describe, expect, it } from 'bun:test'
import type { Caller } from './caller'
import { enforceFindingScope } from './findingScope'
import { isPlaceLookup } from './findingScopeFilters'
import { FINDING_DISTINCT_MESSAGE, FINDING_FILTER_FORM_MESSAGE, FINDING_READ_MESSAGE, FINDING_WRITE_MESSAGE } from './findingScopeMessages'
import {
  AUDITOR_FM,
  FINDING,
  FIELD_MANAGER,
  MINE,
  OTHER,
  closing,
  request,
  world,
  type World,
} from './findingScopeKit'
import { carriesClosingKey } from './rejectedPlan'
import { enforceRequestRules } from './requestGuard'

/**
 * An auditor who is also a field manager (R49: a field manager sees only their
 * own region). Of the findings reads only the audit form's two stay open to
 * them: the open findings of the place being audited and the offline replay's
 * duplicate check. Everything else is limited like a pure field manager's.
 */

const STORED = [MINE, 'ÇELİK  HADDEHANE', OTHER]
const forced = (spellings: string[]) => ({ field: 'location_name', operator: 'in', value: spellings })
const search = (filters: object) => `?filters=${encodeURIComponent(JSON.stringify(filters))}`

const list = (caller: Caller, filters?: object, extra = '') => {
  const { read, calls } = world({ managed: [MINE], stored: STORED })
  const path = `/fiveSFindings${filters === undefined ? '' : search(filters)}${extra}`
  const query = Object.fromEntries(new URL(`http://x${path}`).searchParams)
  return { query, calls, run: () => enforceFindingScope({ request: request('GET', path), query, read, caller }) }
}

/** What the audit form sends for one place: the open findings of the location (denetim/page.tsx readOpenFindings). */
const auditForm = (place: string) => [
  { field: 'is_active', operator: 'eq', value: true },
  { field: 'location_name', operator: 'ilike', value: place },
  { field: 'status', operator: 'in', value: ['open', 'in_progress'] },
]

describe('the two list reads the audit form makes', () => {
  it('pass untouched and cost no query: the open findings of the place being audited, any place', async () => {
    for (const place of [MINE, OTHER]) {
      const { query, calls, run } = list(AUDITOR_FM, auditForm(place))
      const before = query.filters
      expect((await run()).refusal).toBeUndefined()
      expect(query.filters).toBe(before)
      expect(calls).toHaveLength(0)
    }
  })

  it('pass with an equality filter on the place or on client_finding_id', async () => {
    const lookups = [
      [{ field: 'location_name', operator: 'eq', value: OTHER }],
      [{ field: 'is_active', operator: 'eq', value: true }, { field: 'client_finding_id', operator: 'eq', value: FINDING }],
    ]
    for (const filters of lookups) {
      const { query, run } = list(AUDITOR_FM, filters)
      expect((await run()).refusal).toBeUndefined()
      expect(JSON.parse(query.filters ?? '')).toEqual(filters)
    }
  })
})

describe('every other list read of that account is limited to their own locations', () => {
  const own = forced([MINE, 'ÇELİK  HADDEHANE'])

  it('an unfiltered list gets the limit, like a pure field manager', async () => {
    const dual = list(AUDITOR_FM, undefined, '?limit=5')
    expect((await dual.run()).refusal).toBeUndefined()
    expect(JSON.parse(dual.query.filters ?? '')).toEqual([own])
    expect(dual.query.limit).toBe('5')
    const pure = list(FIELD_MANAGER, undefined, '?limit=5')
    await pure.run()
    expect(pure.query.filters).toBe(dual.query.filters)
  })

  it('a filter that is not a place lookup keeps what was asked and adds the limit', async () => {
    const asked = [{ field: 'status', operator: 'eq', value: 'open' }]
    const { query, run } = list(AUDITOR_FM, asked)
    await run()
    expect(JSON.parse(query.filters ?? '')).toEqual([...asked, own])
  })

  it('a place filter that could match many places is no lookup: in, like, a wildcard ilike, an or group', async () => {
    const attempts: object[] = [
      [{ field: 'location_name', operator: 'in', value: [MINE, OTHER] }],
      [{ field: 'location_name', operator: 'like', value: OTHER }],
      [{ field: 'location_name', operator: 'ilike', value: '%' }],
      [{ field: 'location_name', operator: 'ilike', value: 'Soğuk%' }],
      [{ field: 'location_name', operator: 'ilike', value: '______' }],
      [{ field: 'or', operator: 'or', value: [{ field: 'location_name', operator: 'eq', value: OTHER }] }],
      [{ field: 'client_finding_id', operator: 'ilike', value: FINDING }],
      [{ field: 'location_name', operator: 'eq', value: '  ' }],
      [{ field: 'location_name', operator: 'eq', value: ['a'] }],
      [{ field: 'locationName', operator: 'eq', value: OTHER }],
    ]
    for (const filters of attempts) {
      const { query, run } = list(AUDITOR_FM, filters)
      expect((await run()).refusal).toBeUndefined()
      expect(JSON.parse(query.filters ?? '')).toEqual([...(Array.isArray(filters) ? filters : []), own])
    }
  })

  it('a pure field manager is limited even when the filter names a place', async () => {
    const { query, run } = list(FIELD_MANAGER, [{ field: 'location_name', operator: 'eq', value: OTHER }])
    await run()
    expect(JSON.parse(query.filters ?? '')).toHaveLength(2)
  })

  it('the bracket form is refused: it would override a lookup that looks harmless', async () => {
    const path = `/fiveSFindings${search(auditForm(OTHER))}&filters[0][field]=status&filters[0][operator]=eq&filters[0][value]=open`
    const query = Object.fromEntries(new URL(`http://x${path}`).searchParams)
    const { refusal } = await enforceFindingScope({ request: request('GET', path), query, read: world({ managed: [MINE] }).read, caller: AUDITOR_FM })
    expect(refusal?.status).toBe(400)
    expect(await refusal?.json()).toMatchObject({ message: FINDING_FILTER_FORM_MESSAGE })
  })

  it('knows a lookup only in a filters nucleus can read', () => {
    expect(isPlaceLookup({ filters: 'not-json' })).toBe(false)
    expect(isPlaceLookup({ filters: '{"location_name":"x"}' })).toBe(false)
    expect(isPlaceLookup({})).toBe(false)
  })
})

describe('distinct and the single read of that account', () => {
  const one = (w: World) =>
    enforceFindingScope({ request: request('GET', `/fiveSFindings/${FINDING}`), query: {}, read: world(w).read, caller: AUDITOR_FM })

  it('distinct is refused: its values cover every location', async () => {
    const { refusal } = await enforceFindingScope({ request: request('GET', '/fiveSFindings/distinct/description'), query: {}, read: world({ managed: [MINE] }).read, caller: AUDITOR_FM })
    expect(refusal?.status).toBe(403)
    expect(await refusal?.json()).toMatchObject({ message: FINDING_DISTINCT_MESSAGE })
  })

  it('a finding of their own location is readable, one of a foreign location is refused', async () => {
    expect((await one({ finding: 'ÇELİK HADDEHANE', managed: [MINE] })).refusal).toBeUndefined()
    const { refusal } = await one({ finding: OTHER, managed: [MINE] })
    expect(refusal?.status).toBe(403)
    expect(await refusal?.json()).toMatchObject({ message: FINDING_READ_MESSAGE })
    expect((await one({ finding: MINE, managed: [] })).refusal?.status).toBe(403)
  })
})

describe('a team member who is also an auditor and field manager, under a rejected plan', () => {
  const foreign: World = { finding: OTHER, managed: [MINE], rejectedTeams: ['t1'], onTeam: true }
  const write = (method: string, payload: object, w: World) =>
    enforceRequestRules({ request: request(method, `/fiveSFindings/${FINDING}`, payload), body: undefined, query: {}, read: world(w).read, caller: AUDITOR_FM })

  it('passes a correction that sets no closing key through the whole pipeline', async () => {
    for (const method of ['PUT', 'PATCH']) {
      expect(await write(method, { description: 'Kırık raf' }, foreign)).toBeUndefined()
    }
  })

  it('is refused the same correction when the team does not include them', async () => {
    const res = await write('PATCH', { description: 'Kırık raf' }, { ...foreign, onTeam: false })
    expect(res?.status).toBe(403)
  })

  it('is refused a closing with one more key beside it: the status or an after photo makes it a closing', async () => {
    const mixed: object[] = [
      { status: 'closed', photo_after_files: [{ file_id: 'a1' }], description: 'x' },
      { _id: FINDING, status: 'closed', description: 'x' },
      { photoAfterUrl: '/cdn/a1', description: 'x' },
      { description: 'x', completed_at: '2026-10-05' },
      { description: 'x', closedAt: '2026-10-05' },
      { Status: 'closed', description: 'x' },
      { 'photo-after-file-id': 'a1', description: 'x' },
    ]
    for (const payload of mixed) {
      for (const method of ['PUT', 'PATCH']) {
        const scope = await enforceFindingScope({ request: request(method, `/fiveSFindings/${FINDING}`, payload), query: {}, read: world(foreign).read, caller: AUDITOR_FM })
        expect(scope.refusal?.status).toBe(403)
        expect(await scope.refusal?.json()).toMatchObject({ message: FINDING_WRITE_MESSAGE })
        expect((await write(method, payload, foreign))?.status).toBe(403)
      }
    }
    expect((await write('PATCH', closing, foreign))?.status).toBe(403)
  })
})

describe('carriesClosingKey', () => {
  it('is true for the status or any closing key in any spelling, alone or mixed', () => {
    expect(carriesClosingKey({ status: 'closed' })).toBe(true)
    expect(carriesClosingKey({ description: 'x', photoAfterFiles: [] })).toBe(true)
    expect(carriesClosingKey({ description: 'x', photo_after_url: null })).toBe(true)
    expect(carriesClosingKey({ description: 'x', ClosedAt: null })).toBe(true)
  })

  it('is false for a body without one', () => {
    expect(carriesClosingKey({})).toBe(false)
    expect(carriesClosingKey({ description: 'x', due_date: '2026-10-05', photo_before_files: [] })).toBe(false)
  })
})
