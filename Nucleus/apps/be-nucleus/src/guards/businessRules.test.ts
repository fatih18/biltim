import { describe, expect, it } from 'bun:test'
import { MAX_DATE_CHANGES, enforceBusinessRules, hasAfterPhoto, toDateKey } from './businessRules'

const req = (method: string, path: string) =>
  new Request(`http://localhost:4001${path}`, { method })

/** A request carrying its payload, as the server actually receives it. */
const jsonReq = (method: string, path: string, payload: unknown) =>
  new Request(`http://localhost:4001${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })

const reader = (rows: Record<string, unknown>[]) => async () => rows

describe('hasAfterPhoto', () => {
  it('accepts a url, a file id, or a non-empty file list', () => {
    expect(hasAfterPhoto({ photo_after_url: 'https://x/y.jpg' })).toBe(true)
    expect(hasAfterPhoto({ photo_after_file_id: 'abc' })).toBe(true)
    expect(hasAfterPhoto({ photo_after_files: [{ id: 'a' }] })).toBe(true)
    expect(hasAfterPhoto({ photo_after_files: '[{"id":"a"}]' })).toBe(true)
  })

  it('reads the camelCase twins the API layer adds', () => {
    expect(hasAfterPhoto({ photoAfterUrl: 'https://x/y.jpg' })).toBe(true)
  })

  it('rejects the shapes that look like a photo but are not one', () => {
    for (const row of [
      {},
      { photo_after_url: null },
      { photo_after_url: '' },
      { photo_after_url: '   ' },
      { photo_after_files: [] },
      { photo_after_files: '[]' },
      { photo_after_files: 'null' },
    ]) {
      expect(hasAfterPhoto(row)).toBe(false)
    }
  })
})

describe('closing a finding', () => {
  it('refuses when the stored row has no after photo', async () => {
    // The live check that started this: PUT {"status":"closed"} answered 200
    // and closed a finding whose photo_after_url was NULL.
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSFindings/abc'),
      body: { status: 'closed' },
      read: reader([{ photo_after_url: null }]),
    })
    expect(res?.status).toBe(400)
    expect(await res?.json()).toMatchObject({ isSuccess: false })
  })

  it('allows it when the stored row has one', async () => {
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSFindings/abc'),
      body: { status: 'closed' },
      read: reader([{ photo_after_url: 'https://x/y.jpg' }]),
    })
    expect(res).toBeUndefined()
  })

  it('allows a photo supplied in the same request', async () => {
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSFindings/abc'),
      body: { status: 'closed', photo_after_url: 'https://x/y.jpg' },
      read: reader([{ photo_after_url: null }]),
    })
    expect(res).toBeUndefined()
  })

  it('leaves every other status change alone', async () => {
    for (const status of ['open', 'in_progress']) {
      const res = await enforceBusinessRules({
        request: req('PUT', '/fiveSFindings/abc'),
        body: { status },
        read: reader([{ photo_after_url: null }]),
      })
      expect(res).toBeUndefined()
    }
  })

  it('does not answer for a row that is not there — the route owns 404', async () => {
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSFindings/yok'),
      body: { status: 'closed' },
      read: reader([]),
    })
    expect(res).toBeUndefined()
  })
})

describe('moving an audit date', () => {
  it('refuses once the cap is used up', async () => {
    // Live: five consecutive PUTs all answered 200 and the counter reached 5.
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSAuditPlans/p1'),
      body: { planned_date: '2026-12-01' },
      read: reader([{ planned_date: '2026-10-05', date_change_count: MAX_DATE_CHANGES }]),
    })
    expect(res?.status).toBe(400)
  })

  it('allows a move while there is budget left', async () => {
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSAuditPlans/p1'),
      body: { planned_date: '2026-12-01' },
      read: reader([{ planned_date: '2026-10-05', date_change_count: 1 }]),
    })
    expect(res).toBeUndefined()
  })

  it('does not spend a change on writing the same date back', async () => {
    // Saving a form without touching the date must not consume a slot.
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSAuditPlans/p1'),
      body: { planned_date: '2026-10-05', title: 'yeni ad' },
      read: reader([{ planned_date: '2026-10-05', date_change_count: MAX_DATE_CHANGES }]),
    })
    expect(res).toBeUndefined()
  })

  it('compares dates, not timestamps', async () => {
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSAuditPlans/p1'),
      body: { planned_date: '2026-10-05' },
      read: reader([
        { planned_date: new Date('2026-10-05T00:00:00Z'), date_change_count: MAX_DATE_CHANGES },
      ]),
    })
    expect(res).toBeUndefined()
  })

  it('ignores an update that does not touch the date', async () => {
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSAuditPlans/p1'),
      body: { status: 'completed' },
      read: reader([{ planned_date: '2026-10-05', date_change_count: 9 }]),
    })
    expect(res).toBeUndefined()
  })
})

describe('scope', () => {
  it('ignores reads and creates', async () => {
    for (const method of ['GET', 'POST', 'DELETE']) {
      const res = await enforceBusinessRules({
        request: req(method, '/fiveSFindings/abc'),
        body: { status: 'closed' },
        read: reader([{ photo_after_url: null }]),
      })
      expect(res).toBeUndefined()
    }
  })

  it('ignores other tables', async () => {
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSLocations/abc'),
      body: { status: 'closed' },
      read: reader([{ photo_after_url: null }]),
    })
    expect(res).toBeUndefined()
  })
})


describe('reading the body itself', () => {
  /*
   * The guard runs before nucleus parses the body, so ctx.body is undefined at
   * that point — the whole rule was a no-op until it read the payload itself.
   */
  it('refuses a close whose payload arrives only on the request', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSFindings/abc', { status: 'closed' }),
      body: undefined,
      read: reader([{ photo_after_url: null }]),
    })
    expect(res?.status).toBe(400)
  })

  it('allows one whose payload carries the photo', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSFindings/abc', {
        status: 'closed',
        photo_after_url: 'https://x/y.jpg',
      }),
      body: undefined,
      read: reader([{ photo_after_url: null }]),
    })
    expect(res).toBeUndefined()
  })

  it('leaves the request body readable for the route that follows', async () => {
    const request = jsonReq('PUT', '/fiveSFindings/abc', { status: 'closed' })
    await enforceBusinessRules({ request, body: undefined, read: reader([{ photo_after_url: 'u' }]) })
    // If the guard had consumed the stream, nucleus would receive nothing.
    expect(await request.json()).toEqual({ status: 'closed' })
  })

  it('ignores a non-JSON body rather than guessing at it', async () => {
    const request = new Request('http://localhost:4001/fiveSFindings/abc', {
      method: 'PUT',
      headers: { 'content-type': 'text/plain' },
      body: 'status=closed',
    })
    const res = await enforceBusinessRules({ request, body: undefined, read: reader([{}]) })
    expect(res).toBeUndefined()
  })
})


describe('toDateKey', () => {
  /*
   * node-pg gives a `date` column back as a Date at LOCAL midnight. Reading it
   * with toISOString() moves the day backwards on any positive offset — on
   * this machine (UTC+3) 2026-11-02 read as 2026-11-01, so writing the same
   * date back looked like a move and was refused.
   */
  it('reads a local-midnight Date as the day it actually is', () => {
    expect(toDateKey(new Date(2026, 10, 2))).toBe('2026-11-02')
    expect(toDateKey(new Date(2026, 0, 1))).toBe('2026-01-01')
  })

  it('takes the day off a string or an ISO timestamp', () => {
    expect(toDateKey('2026-11-02')).toBe('2026-11-02')
    expect(toDateKey('2026-11-02T13:45:00Z')).toBe('2026-11-02')
  })

  it('answers empty for nothing, rather than a wrong day', () => {
    expect(toDateKey(null)).toBe('')
    expect(toDateKey(undefined)).toBe('')
    expect(toDateKey(new Date('bozuk'))).toBe('')
  })
})

describe('re-saving a plan without moving it', () => {
  it('does not spend a change when the stored date is a local-midnight Date', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditPlans/p1', {
        planned_date: '2026-11-02',
        title: 'sadece ad degisti',
      }),
      body: undefined,
      read: reader([{ planned_date: new Date(2026, 10, 2), date_change_count: MAX_DATE_CHANGES }]),
    })
    expect(res).toBeUndefined()
  })
})

describe('a plan belongs to its period', () => {
  const period = [{ date_range_start: '2026-10-01', date_range_end: '2026-12-31', quarter: '2026-Q4' }]

  it('refuses a create dated after the period ends', async () => {
    // Live: the screen disabled the button and the API took 2027-03-15 into a
    // period running 2026-10-01 to 2026-12-31.
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAuditPlans', {
        planned_date: '2027-03-15',
        location_id: 'loc',
        assigned_team_id: 'team',
        parent_plan_id: 'pp1',
      }),
      body: undefined,
      read: reader(period),
    })
    expect(res?.status).toBe(400)
  })

  it('refuses one dated before it starts', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAuditPlans', {
        planned_date: '2026-09-30',
        location_id: 'loc',
        assigned_team_id: 'team',
        parent_plan_id: 'pp1',
      }),
      body: undefined,
      read: reader(period),
    })
    expect(res?.status).toBe(400)
  })

  it('allows the boundaries themselves', async () => {
    for (const date of ['2026-10-01', '2026-12-31', '2026-11-15']) {
      const res = await enforceBusinessRules({
        request: jsonReq('POST', '/fiveSAuditPlans', {
          planned_date: date,
          location_id: 'loc',
          assigned_team_id: 'team',
          parent_plan_id: 'pp1',
        }),
        body: undefined,
        read: reader(period),
      })
      expect(res).toBeUndefined()
    }
  })

  it('leaves a plan with no period alone — the range is the parent’s, and there is none', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAuditPlans', {
        planned_date: '2027-03-15',
        location_id: 'loc',
        assigned_team_id: 'team',
      }),
      body: undefined,
      read: reader(period),
    })
    expect(res).toBeUndefined()
  })

  it('also catches a date MOVED out of range by an update', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditPlans/p1', {
        planned_date: '2027-03-15',
        parent_plan_id: 'pp1',
      }),
      body: undefined,
      read: reader(period),
    })
    expect(res?.status).toBe(400)
  })

  it('does not block a create on some other table', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSLocations', { name: 'x' }),
      body: undefined,
      read: reader(period),
    })
    expect(res).toBeUndefined()
  })
})

describe('a plan must be one of the two shapes', () => {
  /*
   * Neither planned_date, location_id nor assigned_team_id is NOT NULL, so the
   * API accepted a plan with nothing in it. Seven such rows reached the
   * planning screen and rendered as "— ? – ? 0 denetim planı".
   */
  it('refuses a plan that is neither a period nor an audit', async () => {
    for (const body of [{}, { status: 'planned' }, { quarter: '2026-Q4' }, { planned_date: '2026-12-01' }]) {
      const res = await enforceBusinessRules({
        request: jsonReq('POST', '/fiveSAuditPlans', body),
        body: undefined,
        read: reader([]),
      })
      expect(res?.status).toBe(400)
    }
  })

  it('accepts a period plan — quarter with a range', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAuditPlans', {
        quarter: '2026-Q4',
        date_range_start: '2026-10-01',
        date_range_end: '2026-12-31',
      }),
      body: undefined,
      read: reader([]),
    })
    expect(res).toBeUndefined()
  })

  it('accepts an audit plan — date, location and team', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAuditPlans', {
        planned_date: '2026-12-01',
        location_id: 'loc',
        assigned_team_id: 'team',
      }),
      body: undefined,
      read: reader([]),
    })
    expect(res).toBeUndefined()
  })

  it('reads the camelCase twins the API layer adds', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAuditPlans', {
        plannedDate: '2026-12-01',
        locationId: 'loc',
        assignedTeamId: 'team',
      }),
      body: undefined,
      read: reader([]),
    })
    expect(res).toBeUndefined()
  })

  it('does not accept a blank string as a value', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAuditPlans', {
        planned_date: '2026-12-01',
        location_id: '   ',
        assigned_team_id: 'team',
      }),
      body: undefined,
      read: reader([]),
    })
    expect(res?.status).toBe(400)
  })
})

describe('a finding must say what was found', () => {
  const complete = {
    description: 'Sahada dağınık malzeme',
    location_name: 'Test Depo',
    finding_type: 'Test Güvenlik',
    detected_date: '2026-12-01',
  }

  it('refuses an empty body — eight such rows existed in the database', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSFindings', {}),
      body: undefined,
      read: reader([]),
    })
    expect(res?.status).toBe(400)
  })

  it('names the fields that are missing rather than saying no', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSFindings', { description: 'x' }),
      body: undefined,
      read: reader([]),
    })
    const body = (await res?.json()) as { message?: string }
    expect(body.message).toContain('location_name')
    expect(body.message).toContain('finding_type')
    expect(body.message).not.toContain('description')
  })

  it('accepts a complete finding', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSFindings', complete),
      body: undefined,
      read: reader([]),
    })
    expect(res).toBeUndefined()
  })

  it('reads the camelCase twins', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSFindings', {
        description: 'x',
        locationName: 'y',
        findingType: 'z',
        detectedDate: '2026-12-01',
      }),
      body: undefined,
      read: reader([]),
    })
    expect(res).toBeUndefined()
  })

  it('does not accept blanks as values', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSFindings', { ...complete, location_name: '  ' }),
      body: undefined,
      read: reader([]),
    })
    expect(res?.status).toBe(400)
  })

  it('leaves updates alone — this is a rule about creating one', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSFindings/abc', { description: 'yeni metin' }),
      body: undefined,
      read: reader([{ photo_after_url: null }]),
    })
    expect(res).toBeUndefined()
  })
})
