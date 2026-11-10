import { describe, expect, it } from 'bun:test'
import { NucleusTestApp } from 'nucleus-core-ts/server'
import type { Caller } from './caller'
import { enforceFindingScope } from './findingScope'
import {
  FINDING_DISTINCT_MESSAGE,
  FINDING_FILTER_FORM_MESSAGE,
  FINDING_READ_MESSAGE,
  UNIDENTIFIED_MESSAGE,
} from './findingScopeMessages'
import {
  AUDITOR,
  CENTRAL,
  FINDING,
  FIELD_MANAGER,
  GOD,
  MANAGER,
  MANAGER_FM,
  MINE,
  OTHER,
  SUPER_ADMIN,
  closing,
  request,
  world,
  type World,
} from './findingScopeKit'
import { enforceRequestRules } from './requestGuard'

const STORED = [MINE, 'ÇELİK  HADDEHANE', OTHER, 'Çelik Haddehane 2']

const read = (caller: Caller | null, w: World, path: string, search = '') => {
  const { read: sql, calls } = world(w)
  const query = Object.fromEntries(new URL(`http://x${path}${search}`).searchParams)
  return { query, calls, run: () => enforceFindingScope({ request: request('GET', path + search), query, read: sql, caller }) }
}

const forced = (spellings: string[]) => ({ field: 'location_name', operator: 'in', value: spellings })

describe('a field manager listing findings', () => {
  it('gets their own locations added to what they asked for, in every spelling stored', async () => {
    const { query, run } = read(FIELD_MANAGER, { managed: [MINE], stored: STORED }, '/fiveSFindings')
    expect((await run()).refusal).toBeUndefined()
    expect(JSON.parse(query.filters ?? '')).toEqual([forced([MINE, 'ÇELİK  HADDEHANE'])])
  })

  it('keeps their own filters and ANDs the limit on top', async () => {
    const asked = [{ field: 'status', operator: 'eq', value: 'open' }]
    const search = `?limit=25&filters=${encodeURIComponent(JSON.stringify(asked))}`
    const { query, run } = read(FIELD_MANAGER, { managed: [MINE], stored: STORED }, '/fiveSFindings/', search)
    await run()
    expect(JSON.parse(query.filters ?? '')).toEqual([...asked, forced([MINE, 'ÇELİK  HADDEHANE'])])
    expect(query.limit).toBe('25')
  })

  it('cannot widen it with a filter of their own: the limit is one more condition', async () => {
    const asked = [{ field: 'location_name', operator: 'eq', value: OTHER }]
    const { query, run } = read(FIELD_MANAGER, { managed: [MINE], stored: STORED }, '/fiveSFindings', `?filters=${encodeURIComponent(JSON.stringify(asked))}`)
    await run()
    expect(JSON.parse(query.filters ?? '')).toHaveLength(2)
  })

  it('with no location gets an empty list, never the plant: `in ()` is false in nucleus', async () => {
    const { query, run, calls } = read(FIELD_MANAGER, { managed: [], stored: STORED }, '/fiveSFindings')
    await run()
    expect(JSON.parse(query.filters ?? '')).toEqual([forced([])])
    expect(calls.some((c) => c.text.includes('select distinct'))).toBe(false)
  })

  it('treats an empty `filters=` as no filter and still limits', async () => {
    const { query, run } = read(FIELD_MANAGER, { managed: [MINE], stored: STORED }, '/fiveSFindings', '?filters=')
    await run()
    expect(JSON.parse(query.filters ?? '')).toEqual([forced([MINE, 'ÇELİK  HADDEHANE'])])
  })

  it('leaves a `filters` nucleus cannot read alone: nucleus answers 400 before any row is read', async () => {
    for (const bad of ['not-json', '{"a":1}', 'null', '"x"']) {
      const { query, run } = read(FIELD_MANAGER, { managed: [MINE], stored: STORED }, '/fiveSFindings', `?filters=${encodeURIComponent(bad)}`)
      expect((await run()).refusal).toBeUndefined()
      expect(query.filters).toBe(bad)
    }
  })

  it('is refused the bracket form of filters, which would override the limit', async () => {
    const { query, run } = read(FIELD_MANAGER, { managed: [MINE], stored: STORED }, '/fiveSFindings', '?filters[0][field]=status&filters[0][operator]=eq&filters[0][value]=open')
    const { refusal } = await run()
    expect(refusal?.status).toBe(400)
    expect(await refusal?.json()).toMatchObject({ message: FINDING_FILTER_FORM_MESSAGE })
    expect(query.filters).toBeUndefined()
  })

  it('is refused the distinct values, which no filter can narrow', async () => {
    const { run } = read(FIELD_MANAGER, { managed: [MINE] }, '/fiveSFindings/distinct/description')
    const { refusal } = await run()
    expect(refusal?.status).toBe(403)
    expect(await refusal?.json()).toMatchObject({ message: FINDING_DISTINCT_MESSAGE })
  })
})

describe('everyone else lists the findings as before', () => {
  it('leaves the query alone and asks nothing of the database', async () => {
    for (const caller of [GOD, SUPER_ADMIN, CENTRAL, MANAGER, AUDITOR, MANAGER_FM]) {
      for (const path of ['/fiveSFindings', '/fiveSFindings/distinct/status']) {
        const { query, run, calls } = read(caller, { managed: [MINE], stored: STORED }, path, '?limit=5')
        expect((await run()).refusal).toBeUndefined()
        expect(query).toEqual({ limit: '5' })
        expect(calls).toHaveLength(0)
      }
    }
  })
})

describe('reading one finding', () => {
  const one = (caller: Caller | null, w: World) => read(caller, w, `/fiveSFindings/${FINDING}`).run()

  it('is the field manager own locations only', async () => {
    expect((await one(FIELD_MANAGER, { finding: 'ÇELİK HADDEHANE', managed: [MINE] })).refusal).toBeUndefined()
    const { refusal } = await one(FIELD_MANAGER, { finding: OTHER, managed: [MINE] })
    expect(refusal?.status).toBe(403)
    expect(await refusal?.json()).toMatchObject({ message: FINDING_READ_MESSAGE })
    expect((await one(FIELD_MANAGER, { finding: MINE, managed: [] })).refusal?.status).toBe(403)
  })

  it('leaves a finding that is not there to the route (404) and the other roles to theirs', async () => {
    expect((await one(FIELD_MANAGER, { managed: [MINE] })).refusal).toBeUndefined()
    for (const caller of [GOD, CENTRAL, MANAGER, AUDITOR, MANAGER_FM]) {
      expect((await one(caller, { finding: OTHER, managed: [] })).refusal).toBeUndefined()
    }
  })
})

describe('a request nobody can be identified for', () => {
  it('is asked to sign in again (401, which the offline queue keeps for a retry), not refused', async () => {
    for (const method of ['GET', 'PATCH']) {
      const { refusal } = await enforceFindingScope({ request: request(method, `/fiveSFindings/${FINDING}`, method === 'GET' ? undefined : closing), query: {}, read: world().read, caller: null })
      expect(refusal?.status).toBe(401)
      expect(await refusal?.json()).toMatchObject({ message: UNIDENTIFIED_MESSAGE })
    }
  })

  it('is left to nucleus when it carries no credential at all', async () => {
    const bare = request('GET', '/fiveSFindings', undefined, {})
    const query = {}
    const { refusal } = await enforceFindingScope({ request: bare, query, read: world().read, caller: null })
    expect(refusal).toBeUndefined()
    expect(query).toEqual({})
  })
})

describe('the field manager closing a finding of their own (also replayed from the offline queue)', () => {
  const camel = { _id: FINDING, photoAfterFiles: [{ fileId: 'a1' }], photoAfterFileId: 'a1', photoAfterUrl: '/cdn/a1', status: 'closed' }
  const run = (method: string, payload: object, w: World) =>
    enforceRequestRules({ request: request(method, `/fiveSFindings/${FINDING}`, payload), body: undefined, query: {}, read: world(w).read, caller: FIELD_MANAGER })

  it('passes the whole pipeline, both spellings of the keys, even when the plan is sent back', async () => {
    for (const method of ['PUT', 'PATCH']) {
      for (const payload of [closing, camel]) {
        for (const rejectedTeams of [[], ['t1']]) {
          expect(await run(method, payload, { finding: ' çelik  haddehane', managed: [MINE], rejectedTeams })).toBeUndefined()
        }
      }
    }
  })

  it('is never answered with a status the queue drops unless the finding is truly not theirs', async () => {
    const own = await run('PATCH', camel, { finding: MINE, managed: [MINE] })
    expect(own).toBeUndefined()
    const foreign = await run('PATCH', camel, { finding: OTHER, managed: [MINE] })
    expect(foreign?.status).toBe(403)
  })
})

describe('what nucleus does with the narrowed query', () => {
  it('reaches the generic route handler: the router passes the guard its own query object', async () => {
    const app = new NucleusTestApp()
    app.get('/fiveSFindings', (ctx: { query: Record<string, string | undefined> }) => ({ seen: ctx.query }))
    const { read: sql } = world({ managed: [MINE], stored: STORED })
    app.onRequest(({ request: req, body, query }) =>
      enforceRequestRules({ request: req, body, query, read: sql, caller: FIELD_MANAGER })
    )
    const asked = [{ field: 'status', operator: 'eq', value: 'open' }]
    const res = await app.handle(request('GET', `/fiveSFindings?limit=7&filters=${encodeURIComponent(JSON.stringify(asked))}`))
    const { seen } = await res.json()
    expect(seen.limit).toBe('7')
    expect(JSON.parse(seen.filters)).toEqual([...asked, forced([MINE, 'ÇELİK  HADDEHANE'])])
  })
})
