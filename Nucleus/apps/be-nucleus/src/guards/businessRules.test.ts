import { describe, expect, it } from 'bun:test'
import {
  MAX_DATE_CHANGES,
  PENDING_APPROVAL,
  canonicalId,
  enforceBusinessRules,
  hasAfterPhoto,
  isPlainDate,
  photoCount,
  photoNames,
  toDateKey,
  toSnakeKeys,
  todayAtPlant,
} from './businessRules'
import type { Row } from '../db'
import type { Caller, QueryParam } from './caller'

const GOD: Caller = { userId: 'u-god', isGod: true, roles: ['godmin'] }
const CENTRAL: Caller = { userId: 'u-ce', isGod: false, roles: ['content manager core team'] }
const AUDITOR: Caller = { userId: 'u-aud', isGod: false, roles: ['auditor'] }
const FIELD_MANAGER: Caller = { userId: 'u-fm', isGod: false, roles: ['field manager'] }
const MANAGER: Caller = { userId: 'u-mgr', isGod: false, roles: ['manager'] }
const SUPER_ADMIN: Caller = { userId: 'u-sa', isGod: false, roles: ['super admin'] }

/** Every request the browser sends carries its session; one without is nucleus's to answer 401. */
const SESSION = { cookie: 'nucleus_session_token=s1' }

const req = (method: string, path: string) =>
  new Request(`http://localhost:4001${path}`, { method, headers: SESSION })

/** A request carrying its payload, as the server actually receives it. */
const jsonReq = (method: string, path: string, payload: unknown) =>
  new Request(`http://localhost:4001${path}`, {
    method,
    headers: { ...SESSION, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })

const reader = (rows: Record<string, unknown>[]) => async () => rows

/** Answers each query by the first needle its text contains. */
const script =
  (answers: Record<string, Record<string, unknown>[]>) => async (text: string) => {
    for (const [needle, rows] of Object.entries(answers)) if (text.includes(needle)) return rows
    return []
  }

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
      caller: FIELD_MANAGER,
    })
    expect(res?.status).toBe(400)
    expect(await res?.json()).toMatchObject({ isSuccess: false })
  })

  it('allows it when the stored row has one', async () => {
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSFindings/abc'),
      body: { status: 'closed' },
      read: reader([{ photo_after_url: 'https://x/y.jpg' }]),
      caller: FIELD_MANAGER,
    })
    expect(res).toBeUndefined()
  })

  it('allows a photo supplied in the same request', async () => {
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSFindings/abc'),
      body: { status: 'closed', photo_after_url: 'https://x/y.jpg' },
      read: reader([{ photo_after_url: null }]),
      caller: FIELD_MANAGER,
    })
    expect(res).toBeUndefined()
  })

  it('leaves every other status change alone', async () => {
    for (const status of ['open', 'in_progress']) {
      const res = await enforceBusinessRules({
        request: req('PUT', '/fiveSFindings/abc'),
        body: { status },
        read: reader([{ photo_after_url: null }]),
        caller: FIELD_MANAGER,
      })
      expect(res).toBeUndefined()
    }
  })

  it('does not answer for a row that is not there — the route owns 404', async () => {
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSFindings/yok'),
      body: { status: 'closed' },
      read: reader([]),
      caller: FIELD_MANAGER,
    })
    expect(res).toBeUndefined()
  })
})

describe('moving an audit date', () => {
  // Müdür is the central role that keeps the cap: Merkez Ekip, Super Admin and the
  // godmin move any date any number of times (Notlar 22.10, satır 34).
  it('refuses once the cap is used up', async () => {
    // Live: five consecutive PUTs all answered 200 and the counter reached 5.
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSAuditPlans/p1'),
      body: { planned_date: '2026-12-01' },
      read: reader([{ planned_date: '2026-10-05', date_change_count: MAX_DATE_CHANGES }]),
      caller: MANAGER,
    })
    expect(res?.status).toBe(400)
  })

  it('allows a move while there is budget left', async () => {
    // The screen sends the spent change along with the date: used + 1.
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSAuditPlans/p1'),
      body: { planned_date: '2026-12-01', date_change_count: 2 },
      read: reader([{ planned_date: '2026-10-05', date_change_count: 1 }]),
      caller: MANAGER,
    })
    expect(res).toBeUndefined()
  })

  it('Merkez Ekip moves a date with no changes left, without spending one (satır 34)', async () => {
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSAuditPlans/p1'),
      body: { planned_date: '2026-12-01', date_change_count: MAX_DATE_CHANGES },
      read: reader([{ planned_date: '2026-10-05', date_change_count: MAX_DATE_CHANGES, status: 'planned' }]),
      caller: CENTRAL,
    })
    expect(res).toBeUndefined()
  })

  it('Merkez Ekip cannot be charged a change for a date move', async () => {
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSAuditPlans/p1'),
      body: { planned_date: '2026-12-01', date_change_count: 1 },
      read: reader([{ planned_date: '2026-10-05', date_change_count: 0, status: 'planned' }]),
      caller: CENTRAL,
    })
    expect(res?.status).toBe(400)
    expect((await res?.json()).message).toContain('harcamaz')
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
      body: { status: PENDING_APPROVAL, audit_id: 'a1' },
      read: reader([{ planned_date: '2026-10-05', date_change_count: 9, status: 'planned' }]),
      caller: CENTRAL,
    })
    expect(res).toBeUndefined()
  })

  it('lets the godmin move a date with no changes left, without spending one (#32)', async () => {
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSAuditPlans/p1'),
      body: { planned_date: '2026-11-20', date_change_count: 2 },
      read: reader([{ planned_date: '2026-11-02', date_change_count: 2, status: 'planned' }]),
      caller: GOD,
    })
    expect(res).toBeUndefined()
  })

  it('still holds Merkez Ekip to the two changes on a planned audit', async () => {
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSAuditPlans/p1'),
      body: { planned_date: '2026-11-20', date_change_count: 3 },
      read: reader([{ planned_date: '2026-11-02', date_change_count: 2, status: 'planned' }]),
      caller: CENTRAL,
    })
    expect(res?.status).toBe(400)
  })

  it('lets only Merkez Ekip correct the date of a completed audit (#16)', async () => {
    const read = reader([{ planned_date: '2026-10-02', date_change_count: 0, status: 'completed' }])
    const asLeader = await enforceBusinessRules({
      request: req('PUT', '/fiveSAuditPlans/p1'),
      body: { planned_date: '2026-10-03', date_change_count: 1 },
      read,
      caller: AUDITOR,
    })
    expect(asLeader?.status).toBe(400)
    expect((await asLeader?.json()).message).toContain('yalnız Merkez Ekip')

    const asCentral = await enforceBusinessRules({
      request: req('PUT', '/fiveSAuditPlans/p1'),
      body: { planned_date: '2026-10-03', date_change_count: 0 },
      read,
      caller: CENTRAL,
    })
    expect(asCentral).toBeUndefined()
  })

  it('does not let anyone but the godmin give a date change back', async () => {
    const read = reader([{ planned_date: '2026-10-02', date_change_count: 2, status: 'planned' }])
    const asCentral = await enforceBusinessRules({
      request: req('PUT', '/fiveSAuditPlans/p1'),
      body: { date_change_count: 0 },
      read,
      caller: CENTRAL,
    })
    expect(asCentral?.status).toBe(400)
    expect(
      await enforceBusinessRules({
        request: req('PUT', '/fiveSAuditPlans/p1'),
        body: { date_change_count: 0 },
        read,
        caller: GOD,
      })
    ).toBeUndefined()
  })
})

describe('approving an audit (#28)', () => {
  const planned = reader([{ planned_date: '2026-10-02', date_change_count: 0, status: PENDING_APPROVAL }])

  it('refuses `completed` from the auditor who sent the form', async () => {
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSAuditPlans/p1'),
      body: { status: 'completed' },
      read: planned,
      caller: AUDITOR,
    })
    expect(res?.status).toBe(400)
    expect((await res?.json()).message).toContain('Onay Bekliyor')
  })

  it('refuses it from a caller nobody can identify — 401, so the client signs in again', async () => {
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSAuditPlans/p1'),
      body: { status: 'completed' },
      read: planned,
      caller: null,
    })
    expect(res?.status).toBe(401)
  })

  it('lets Merkez Ekip and the godmin approve', async () => {
    for (const caller of [CENTRAL, GOD]) {
      const res = await enforceBusinessRules({
        request: req('PUT', '/fiveSAuditPlans/p1'),
        body: { status: 'completed' },
        read: planned,
        caller,
      })
      expect(res).toBeUndefined()
    }
  })

  it('keeps a completed audit completed unless Merkez Ekip reopens it', async () => {
    const done = reader([{ planned_date: '2026-10-02', date_change_count: 0, status: 'completed' }])
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSAuditPlans/p1'),
      body: { status: 'planned' },
      read: done,
      caller: AUDITOR,
    })
    expect(res?.status).toBe(400)
  })
})

describe('a field manager and their own location', () => {
  it('refuses a plan whose team holds the location field manager (#13)', async () => {
    const res = await enforceBusinessRules({
      request: req('POST', '/fiveSAuditPlans'),
      body: { planned_date: '2026-10-20', location_id: 'L1', assigned_team_id: 'T1' },
      read: script({
        'from main.five_s_locations': [{ field_manager_user_ids: ['u-fm'] }],
        'from main.five_s_audit_teams': [{ leader_user_id: 'u-lead' }],
        'from main.five_s_audit_team_members': [{ user_id: 'u-fm' }],
        'from main.users': [{ name: 'Ayşe Saha' }],
      }),
      caller: CENTRAL,
    })
    expect(res?.status).toBe(400)
    expect((await res?.json()).message).toContain('Ayşe Saha bu lokasyonun saha sorumlusu')
  })

  it('allows a team with no one responsible for the place', async () => {
    const res = await enforceBusinessRules({
      request: req('POST', '/fiveSAuditPlans'),
      body: { planned_date: '2026-10-20', location_id: 'L1', assigned_team_id: 'T1' },
      read: script({
        'from main.five_s_locations': [{ field_manager_user_ids: '["u-fm"]' }],
        'from main.five_s_audit_teams': [{ leader_user_id: 'u-lead' }],
        'from main.five_s_audit_team_members': [{ user_id: 'u-other' }],
      }),
      caller: CENTRAL,
    })
    expect(res).toBeUndefined()
  })

  it('refuses the audit when the person starting it is the field manager (#27)', async () => {
    const res = await enforceBusinessRules({
      request: req('POST', '/fiveSAudits'),
      body: { plan_id: 'p1', department_name: 'Kaynak' },
      read: script({ 'from main.five_s_audit_plans p': [{ field_manager_user_ids: ['u-aud'] }] }),
      caller: AUDITOR,
    })
    expect(res?.status).toBe(400)
  })
})

describe('photos on a closed finding (#31)', () => {
  const closed = reader([
    { status: 'closed', photo_after_files: [{ id: 'a' }, { id: 'b' }], photo_after_url: 'u1' },
  ])

  it('refuses removing one for anyone but Merkez Ekip / Super Admin', async () => {
    const res = await enforceBusinessRules({
      request: req('PUT', '/fiveSFindings/f1'),
      body: { photo_after_files: [{ id: 'a' }] },
      read: closed,
      caller: FIELD_MANAGER,
    })
    expect(res?.status).toBe(400)
  })

  it('lets anyone add one, and an admin remove one', async () => {
    expect(
      await enforceBusinessRules({
        request: req('PUT', '/fiveSFindings/f1'),
        body: { photo_after_files: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] },
        read: closed,
        caller: FIELD_MANAGER,
      })
    ).toBeUndefined()
    expect(
      await enforceBusinessRules({
        request: req('PUT', '/fiveSFindings/f1'),
        body: { photo_after_files: [], photo_after_url: null },
        read: closed,
        caller: CENTRAL,
      })
    ).toBeUndefined()
  })
})

describe('scope', () => {
  it('ignores reads and creates', async () => {
    // A finding's DELETE is no longer ignored: it asks whether the finding's audit is finished (see
    // 'deleting a finding of a sent or approved audit' below).
    for (const method of ['GET', 'POST']) {
      const res = await enforceBusinessRules({
        request: req(method, '/fiveSFindings/abc'),
        body: { status: 'closed' },
        read: reader([{ photo_after_url: null }]),
        caller: FIELD_MANAGER,
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
      caller: FIELD_MANAGER,
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
      caller: FIELD_MANAGER,
    })
    expect(res).toBeUndefined()
  })

  it('leaves the request body readable for the route that follows', async () => {
    const request = jsonReq('PUT', '/fiveSFindings/abc', { status: 'closed' })
    await enforceBusinessRules({ request, body: undefined, read: reader([{ photo_after_url: 'u' }]) })
    // If the guard had consumed the stream, nucleus would receive nothing.
    expect(await request.json()).toEqual({ status: 'closed' })
  })

  it('refuses a non-JSON body rather than guessing at it', async () => {
    // It used to be ignored, and ignoring it meant every rule saw an empty body.
    const request = new Request('http://localhost:4001/fiveSFindings/abc', {
      method: 'PUT',
      headers: { ...SESSION, 'content-type': 'text/plain' },
      body: 'status=closed',
    })
    const res = await enforceBusinessRules({ request, body: undefined, read: reader([{}]) })
    expect(res?.status).toBe(415)
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
    detected_date: '2026-08-01',
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
        detectedDate: '2026-08-01',
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
      caller: FIELD_MANAGER,
    })
    expect(res).toBeUndefined()
  })
})

describe('gelecekteki tarihler', () => {
  const gunSonra = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)

  it('bugünü tesisin takvimine göre çözer', () => {
    // 31 Aralık 22:00 UTC — Istanbul'da saat 1 Ocak 01:00. Sunucu hâlâ 31
    // Aralık derken kullanıcı 1 Ocak yaşıyor; o an kaydedilen bir bulgu
    // "gelecek" sayılmamalı.
    expect(todayAtPlant(new Date('2025-12-31T22:00:00Z'))).toBe('2026-01-01')
    expect(todayAtPlant(new Date('2026-01-01T00:30:00Z'))).toBe('2026-01-01')
  })

  it('yarın tespit edilmiş bulguyu reddeder', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSFindings', {
        description: 'x',
        location_name: 'y',
        finding_type: 'z',
        detected_date: gunSonra(2),
      }),
      body: undefined,
    })
    expect(res?.status).toBe(400)
    expect((await res?.json()).message).toBe('Tespit tarihi gelecekte olamaz.')
  })

  it('yarına tarihlenmiş denetimi reddeder', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAudits', { audit_date: gunSonra(2) }),
      body: undefined,
    })
    expect(res?.status).toBe(400)
    expect((await res?.json()).message).toBe('Denetim tarihi gelecekte olamaz.')
  })

  it('bugün tespit edilmiş bulguyu geçirir', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSFindings', {
        description: 'x',
        location_name: 'y',
        finding_type: 'z',
        detected_date: todayAtPlant(),
      }),
      body: undefined,
    })
    expect(res).toBeUndefined()
  })

  it('planın tarihi ileride olabilir — plan zaten ileriye kurulur', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAuditPlans', {
        planned_date: gunSonra(30),
        location_id: 'a',
        assigned_team_id: 'b',
      }),
      body: undefined,
      read: reader([]),
    })
    expect(res).toBeUndefined()
  })
})

describe('puan sınırları', () => {
  it('100 üstü toplam puanı reddeder', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PATCH', '/fiveSAudits/abc', { total_score: '150.00' }),
      body: undefined,
    })
    expect(res?.status).toBe(400)
    expect((await res?.json()).message).toContain('0 ile 100 arasında')
  })

  it('negatif adım puanını reddeder', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PATCH', '/fiveSAudits/abc', { score_s3: '-1' }),
      body: undefined,
    })
    expect(res?.status).toBe(400)
  })

  it('camelCase ikizini de görür', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PATCH', '/fiveSAudits/abc', { totalScore: 101 }),
      body: undefined,
    })
    expect(res?.status).toBe(400)
  })

  it('sayı olmayanı reddeder', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PATCH', '/fiveSAudits/abc', { total_score: 'yüz' }),
      body: undefined,
    })
    expect(res?.status).toBe(400)
  })

  it('geçerli puanı geçirir — sınırlar dahil', async () => {
    for (const v of ['0', '0.00', '75.5', '100', '100.00']) {
      const res = await enforceBusinessRules({
        request: jsonReq('PATCH', '/fiveSAudits/abc', { total_score: v }),
        body: undefined,
        read: reader([]),
        caller: CENTRAL,
      })
      expect(res).toBeUndefined()
    }
  })

  it('puan taşımayan denetim yazmasına karışmaz', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PATCH', '/fiveSAudits/abc', { auditor_name: 'x' }),
      body: undefined,
      read: reader([]),
      caller: CENTRAL,
    })
    expect(res).toBeUndefined()
  })
})

describe('master data an open plan still uses', () => {
  const LOC = '/fiveSLocations/ca47d356-7903-4be0-8dc0-cf2fab0eadb7'
  const TEAM = '/fiveSAuditTeams/a5b1476f-9896-4d7c-a2e9-d19679559625'

  it('refuses deleting a location an open plan points at, and says what to do', async () => {
    const res = await enforceBusinessRules({ request: req('DELETE', LOC), body: undefined, read: reader([{ n: 2 }]) })
    expect(res?.status).toBe(400)
    const body = await res?.json()
    expect(body.message).toContain('Bu lokasyon 2 açık denetim planında kullanılıyor')
    expect(body.message).toContain('pasif')
  })

  it('refuses deleting a team an open plan is assigned to', async () => {
    const res = await enforceBusinessRules({ request: req('DELETE', TEAM), body: undefined, read: reader([{ n: 1 }]) })
    expect(res?.status).toBe(400)
    expect((await res?.json()).message).toContain('Bu ekip 1 açık denetim planında')
  })

  it('lets the delete through when no open plan uses it', async () => {
    expect(await enforceBusinessRules({ request: req('DELETE', LOC), body: undefined, read: reader([{ n: 0 }]) })).toBeUndefined()
    expect(await enforceBusinessRules({ request: req('DELETE', TEAM), body: undefined, read: reader([]) })).toBeUndefined()
  })

  it('asks only about the row being deleted, by the right column', async () => {
    const seen: Array<{ text: string; params: QueryParam[] }> = []
    const read = async (text: string, params: QueryParam[]) => {
      seen.push({ text, params })
      return [{ n: 0 }]
    }
    await enforceBusinessRules({ request: req('DELETE', TEAM), body: undefined, read })
    expect(seen).toHaveLength(1)
    expect(seen[0]?.text).toContain('assigned_team_id::text = $1')
    expect(seen[0]?.text).toContain("not in ('completed', 'cancelled')")
    expect(seen[0]?.params).toEqual(['a5b1476f-9896-4d7c-a2e9-d19679559625'])
  })

  it('does not touch other deletes, the collection, or reads', async () => {
    const boom = async () => {
      throw new Error('must not query')
    }
    for (const r of [
      req('DELETE', '/fiveSFindingTypes/x'),
      req('DELETE', '/fiveSAuditPlans/x'),
      req('DELETE', '/fiveSLocations'),
      req('GET', LOC),
    ]) {
      expect(await enforceBusinessRules({ request: r, body: undefined, read: boom })).toBeUndefined()
    }
  })
})

describe('camelCase bodies — what the frontend’s nucleus client actually sends', () => {
  /*
   * createServerFactory camelCases every key before it sends, so the server
   * receives plannedDate, dateChangeCount, photoAfterUrl… Each rule below was
   * written against the snake_case spelling and has to hold for both.
   */
  const inFuture = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)

  it('folds keys the way nucleus does: later key wins, nested values untouched', () => {
    expect(toSnakeKeys({ plannedDate: 'a', scoreS1: 1, photoAfterFiles: [{ fileId: 'x' }] })).toEqual({
      planned_date: 'a',
      score_s1: 1,
      photo_after_files: [{ fileId: 'x' }],
    })
    expect(toSnakeKeys({ planned_date: 'old', plannedDate: 'new' })).toEqual({ planned_date: 'new' })
    expect(toSnakeKeys({ plannedDate: 'new', planned_date: 'old' })).toEqual({ planned_date: 'old' })
  })

  it('#16: a completed audit’s date stays Merkez Ekip’s to correct', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditPlans/p1', { plannedDate: '2026-10-03', dateChangeCount: 1 }),
      body: undefined,
      read: reader([{ planned_date: '2026-10-02', date_change_count: 0, status: 'completed' }]),
      caller: AUDITOR,
    })
    expect(res?.status).toBe(400)
    expect((await res?.json()).message).toContain('yalnız Merkez Ekip')
  })

  it('#32: the godmin moves a date with no changes left', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditPlans/p1', { plannedDate: '2026-11-20', dateChangeCount: 2 }),
      body: undefined,
      read: reader([{ planned_date: '2026-11-02', date_change_count: 2, status: 'planned' }]),
      caller: GOD,
    })
    expect(res).toBeUndefined()
  })

  it('the cap: a third move is refused', async () => {
    // Before this, the planning screen's own PUT carried plannedDate and the
    // cap check never saw a date at all.
    const res = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditPlans/p1', { plannedDate: '2026-12-01', dateChangeCount: 3 }),
      body: undefined,
      read: reader([{ planned_date: '2026-10-05', date_change_count: MAX_DATE_CHANGES, status: 'planned' }]),
      caller: MANAGER,
    })
    expect(res?.status).toBe(400)
    expect((await res?.json()).message).toContain('hak kalmadı')
  })

  it('the cap cannot be dodged by sending both spellings', async () => {
    const read = reader([{ planned_date: '2026-10-05', date_change_count: MAX_DATE_CHANGES, status: 'planned' }])
    // nucleus writes the later key — the new date — so this is a move.
    const sneaky = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditPlans/p1', { planned_date: '2026-10-05', plannedDate: '2026-12-01' }),
      body: undefined,
      read,
      caller: MANAGER,
    })
    expect(sneaky?.status).toBe(400)
    // Here the later key is the stored date, which is what nucleus writes.
    const harmless = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditPlans/p1', { plannedDate: '2026-12-01', planned_date: '2026-10-05' }),
      body: undefined,
      read,
      caller: MANAGER,
    })
    expect(harmless).toBeUndefined()
  })

  it('a spent change is not given back', async () => {
    const read = reader([{ planned_date: '2026-10-02', date_change_count: 2, status: 'planned' }])
    const asCentral = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditPlans/p1', { dateChangeCount: 0 }),
      body: undefined,
      read,
      caller: CENTRAL,
    })
    expect(asCentral?.status).toBe(400)
    const asGod = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditPlans/p1', { dateChangeCount: 0 }),
      body: undefined,
      read,
      caller: GOD,
    })
    expect(asGod).toBeUndefined()
  })

  it('#13: a plan whose team holds the field manager, on create and on re-placement', async () => {
    const read = script({
      'from main.five_s_audit_plans where id': [{ location_id: 'L1', assigned_team_id: 'T0' }],
      'from main.five_s_locations': [{ field_manager_user_ids: ['u-fm'] }],
      'from main.five_s_audit_teams': [{ leader_user_id: 'u-lead' }],
      'from main.five_s_audit_team_members': [{ user_id: 'u-fm' }],
      'from main.users': [{ name: 'Ayşe Saha' }],
    })
    const created = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAuditPlans', { plannedDate: '2026-10-20', locationId: 'L1', assignedTeamId: 'T1' }),
      body: undefined,
      read,
      caller: CENTRAL,
    })
    expect(created?.status).toBe(400)
    expect((await created?.json()).message).toContain('Ayşe Saha bu lokasyonun saha sorumlusu')

    const moved = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditPlans/p1', { assignedTeamId: 'T1' }),
      body: undefined,
      read,
      caller: CENTRAL,
    })
    expect(moved?.status).toBe(400)
  })

  it('the period range', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAuditPlans', {
        plannedDate: '2027-03-15',
        locationId: 'loc',
        assignedTeamId: 'team',
        parentPlanId: 'pp1',
      }),
      body: undefined,
      read: reader([{ date_range_start: '2026-10-01', date_range_end: '2026-12-31', quarter: '2026-Q4' }]),
      caller: CENTRAL,
    })
    expect(res?.status).toBe(400)
    expect((await res?.json()).message).toContain('aralığı dışında')
  })

  it('#27: the field manager starting the audit of their own location', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAudits', { planId: 'p1', departmentName: 'Kaynak' }),
      body: undefined,
      read: script({ 'from main.five_s_audit_plans p': [{ field_manager_user_ids: ['u-aud'] }] }),
      caller: AUDITOR,
    })
    expect(res?.status).toBe(400)
  })

  it('#28: a plan created as completed, and a completion by the auditor', async () => {
    const created = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAuditPlans', {
        plannedDate: '2026-10-20',
        locationId: 'loc',
        assignedTeamId: 'team',
        status: 'completed',
      }),
      body: undefined,
      read: reader([]),
      caller: AUDITOR,
    })
    expect(created?.status).toBe(400)

    const completed = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditPlans/p1', { status: 'completed', fieldManagerAttended: true }),
      body: undefined,
      read: reader([{ planned_date: '2026-10-02', date_change_count: 0, status: PENDING_APPROVAL }]),
      caller: AUDITOR,
    })
    expect(completed?.status).toBe(400)
  })

  it('#31: removing a photo from a closed finding', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSFindings/f1', { photoAfterFiles: [{ id: 'a' }] }),
      body: undefined,
      read: reader([{ status: 'closed', photo_after_files: [{ id: 'a' }, { id: 'b' }], photo_after_url: 'u1' }]),
      caller: FIELD_MANAGER,
    })
    expect(res?.status).toBe(400)
  })

  it('closing without an after photo, and with one in the same request', async () => {
    const read = reader([{ photo_after_url: null }])
    const without = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSFindings/f1', { status: 'closed' }),
      body: undefined,
      read,
      caller: FIELD_MANAGER,
    })
    expect(without?.status).toBe(400)
    const withPhoto = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSFindings/f1', { status: 'closed', photoAfterUrl: 'https://x/y.jpg' }),
      body: undefined,
      read,
      caller: FIELD_MANAGER,
    })
    expect(withPhoto).toBeUndefined()
  })

  it('a finding number sent by the client', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSFindings', {
        description: 'x',
        locationName: 'y',
        findingType: 'z',
        detectedDate: '2026-08-01',
        findingNo: 7,
      }),
      body: undefined,
      read: reader([]),
    })
    expect(res?.status).toBe(400)
    expect((await res?.json()).message).toContain('finding_no')
  })

  it('R61: the old number of a renumbered finding is the system\'s: refused on create, and on every later write', async () => {
    const created = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSFindings', {
        description: 'x',
        locationName: 'y',
        findingType: 'z',
        detectedDate: '2026-08-01',
        previousFindingNo: 1,
      }),
      body: undefined,
      read: reader([]),
    })
    expect(created?.status).toBe(400)
    expect((await created?.json()).message).toContain('previous_finding_no')
    for (const method of ['PUT', 'PATCH']) {
      for (const key of ['previousFindingNo', 'findingNo']) {
        const res = await enforceBusinessRules({
          request: jsonReq(method, '/fiveSFindings/f1', { [key]: 3 }),
          body: undefined,
          read: reader([{ status: 'open' }]),
          caller: GOD,
        })
        expect(res?.status).toBe(400)
      }
    }
  })

  it('a required field left blank', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSFindings', {
        description: 'x',
        locationName: '  ',
        findingType: 'z',
        detectedDate: '2026-08-01',
      }),
      body: undefined,
      read: reader([]),
    })
    expect(res?.status).toBe(400)
    expect((await res?.json()).message).toContain('location_name')
  })

  it('dates in the future', async () => {
    const finding = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSFindings', {
        description: 'x',
        locationName: 'y',
        findingType: 'z',
        detectedDate: inFuture(2),
      }),
      body: undefined,
      read: reader([]),
    })
    expect((await finding?.json()).message).toBe('Tespit tarihi gelecekte olamaz.')
    const audit = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAudits', { auditDate: inFuture(2) }),
      body: undefined,
      read: reader([]),
    })
    expect((await audit?.json()).message).toBe('Denetim tarihi gelecekte olamaz.')
  })

  it('a step score outside 0–100', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PATCH', '/fiveSAudits/abc', { scoreS3: -1 }),
      body: undefined,
      read: reader([]),
    })
    expect(res?.status).toBe(400)
    expect((await res?.json()).message).toContain('S3 puanı')
  })
})

describe('bodies that are not JSON', () => {
  /*
   * nucleus parses form posts into the same columns; the guard reads JSON
   * only. A form body therefore passed every rule as "empty" and was written.
   */
  const withBody = (method: string, path: string, init: { headers?: Record<string, string>; body: BodyInit }) =>
    new Request(`http://localhost:4001${path}`, { method, body: init.body, headers: { ...SESSION, ...init.headers } })

  it('refuses a form post closing a finding', async () => {
    const res = await enforceBusinessRules({
      request: withBody('PUT', '/fiveSFindings/abc', {
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'status=closed',
      }),
      body: undefined,
      read: reader([{ photo_after_url: null }]),
      caller: FIELD_MANAGER,
    })
    expect(res?.status).toBe(415)
    expect((await res?.json()).message).toContain('JSON')
  })

  it('refuses multipart on plans and audits', async () => {
    const form = new FormData()
    form.append('planned_date', '2026-12-01')
    for (const path of ['/fiveSAuditPlans/p1', '/fiveSAudits']) {
      const res = await enforceBusinessRules({
        request: withBody(path.endsWith('p1') ? 'PATCH' : 'POST', path, { body: form }),
        body: undefined,
        read: reader([]),
      })
      expect(res?.status).toBe(415)
    }
  })

  it('reads the content type the way nucleus does — a form that mentions JSON is still a form', async () => {
    const res = await enforceBusinessRules({
      request: withBody('PUT', '/fiveSFindings/abc', {
        headers: { 'content-type': 'application/x-www-form-urlencoded; note=application/json' },
        body: 'status=closed',
      }),
      body: undefined,
      read: reader([{ photo_after_url: null }]),
      caller: FIELD_MANAGER,
    })
    expect(res?.status).toBe(415)
  })

  it('refuses a body with no content type at all', async () => {
    const res = await enforceBusinessRules({
      request: withBody('PUT', '/fiveSAuditPlans/p1', { body: new Uint8Array([123, 125]) }),
      body: undefined,
      read: reader([]),
    })
    expect(res?.status).toBe(415)
  })

  it('takes JSON with a charset, and a write with no body at all', async () => {
    const json = await enforceBusinessRules({
      request: withBody('PUT', '/fiveSFindings/abc', {
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ description: 'x' }),
      }),
      body: undefined,
      read: reader([]),
      caller: FIELD_MANAGER,
    })
    expect(json).toBeUndefined()
    const empty = await enforceBusinessRules({ request: req('PUT', '/fiveSFindings/abc'), body: undefined, read: reader([]),
      caller: FIELD_MANAGER,
    })
    expect(empty).toBeUndefined()
  })

  it('covers the master-data writes the #13 checks read, and nothing else', async () => {
    const form = { headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'x=1' }
    const location = await enforceBusinessRules({
      request: withBody('PUT', '/fiveSLocations/L1', form),
      body: undefined,
      read: reader([]),
    })
    expect(location?.status).toBe(415)
    const other = await enforceBusinessRules({
      request: withBody('PUT', '/fiveSFindingTypes/x', form),
      body: undefined,
      read: reader([]),
    })
    expect(other).toBeUndefined()
  })
})

describe('starting an audit (#27), every door', () => {
  const plan = (managers: string[]) => script({ 'from main.five_s_audit_plans p': [{ field_manager_user_ids: managers }] })

  it('refuses a caller nobody can identify when the location has a field manager', async () => {
    // It used to let them through — the one person the rule exists for. 401,
    // not 400: the offline queue retries a 401 after sign-in and sets a 400
    // aside as refused.
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAudits', { planId: 'p1' }),
      body: undefined,
      read: plan(['u-fm']),
      caller: null,
    })
    expect(res?.status).toBe(401)
    expect((await res?.json()).message).toBe('Oturum doğrulanamadı; lütfen yeniden giriş yapın.')
  })

  it('does not need to know the caller when nobody is responsible for the place', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAudits', { planId: 'p1' }),
      body: undefined,
      read: plan([]),
      caller: null,
    })
    expect(res).toBeUndefined()
  })

  it('lets Merkez Ekip and other auditors start it', async () => {
    for (const caller of [CENTRAL, AUDITOR]) {
      const res = await enforceBusinessRules({
        request: jsonReq('POST', '/fiveSAudits', { planId: 'p1' }),
        body: undefined,
        read: plan(['u-fm']),
        caller,
      })
      expect(res).toBeUndefined()
    }
  })

  it('refuses an audit with no plan that names the location by name or by id', async () => {
    const seen: QueryParam[][] = []
    const read = async (text: string, params: QueryParam[]) => {
      seen.push(params)
      return text.includes('from main.five_s_locations') ? [{ field_manager_user_ids: ['u-fm'] }] : []
    }
    for (const payload of [{ departmentName: 'Test Depo' }, { locationId: 'L1' }]) {
      const res = await enforceBusinessRules({
        request: jsonReq('POST', '/fiveSAudits', payload),
        body: undefined,
        read,
        caller: FIELD_MANAGER,
      })
      expect(res?.status).toBe(400)
    }
    expect(seen).toEqual([
      ['', 'Test Depo'],
      ['L1', ''],
    ])
  })

  it('leaves an audit of somebody else’s location alone', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAudits', { departmentName: 'Test Depo' }),
      body: undefined,
      read: script({ 'from main.five_s_locations': [{ field_manager_user_ids: ['u-someone'] }] }),
      caller: FIELD_MANAGER,
    })
    expect(res).toBeUndefined()
  })

  it('refuses the plan write that links the audit or sends it for approval', async () => {
    const read = script({
      'from main.five_s_audit_plans p': [{ field_manager_user_ids: ['u-fm'] }],
      'from main.five_s_audit_plans where id': [{ planned_date: '2026-10-02', date_change_count: 0, status: 'planned' }],
    })
    for (const payload of [{ auditId: 'a1' }, { status: PENDING_APPROVAL }]) {
      const asManager = await enforceBusinessRules({
        request: jsonReq('PUT', '/fiveSAuditPlans/p1', payload),
        body: undefined,
        read,
        caller: FIELD_MANAGER,
      })
      expect(asManager?.status).toBe(400)
      const asCentral = await enforceBusinessRules({
        request: jsonReq('PUT', '/fiveSAuditPlans/p1', payload),
        body: undefined,
        read,
        caller: CENTRAL,
      })
      expect(asCentral).toBeUndefined()
    }
  })
})

describe('who may start the audit of their own location (R71) and open a plan-less single finding (R27)', () => {
  // koray: Merkez Ekip and, at the same time, the field manager of the place being audited.
  const KORAY: Caller = { userId: 'u-koray', isGod: false, roles: ['content manager core team'] }
  const SUPER_ADMIN_FM: Caller = { userId: 'u-sa-fm', isGod: false, roles: ['super admin'] }
  /** The godmin by the flag alone: no role row, as an account flagged by hand. */
  const GOD_FLAG_ONLY: Caller = { userId: 'u-god-fm', isGod: true, roles: [] }
  const GOD_ROLE_FM: Caller = { userId: 'u-god-role', isGod: true, roles: ['godmin'] }
  const MANAGER_FM: Caller = { userId: 'u-mgr-fm', isGod: false, roles: ['manager'] }
  const AUDITOR_FM: Caller = { userId: 'u-aud-fm', isGod: false, roles: ['auditor', 'field manager'] }

  const exempt = [KORAY, SUPER_ADMIN_FM, GOD_FLAG_ONLY, GOD_ROLE_FM]
  const held = [MANAGER_FM, AUDITOR_FM, FIELD_MANAGER]

  const ownPlan = (caller: Caller) =>
    script({ 'from main.five_s_audit_plans p': [{ status: 'planned', field_manager_user_ids: [caller.userId] }] })
  const ownLocation = (caller: Caller) =>
    script({ 'from main.five_s_locations': [{ field_manager_user_ids: [caller.userId] }] })

  it('lets Merkez Ekip, Super Admin and the godmin start the plan of their own location', async () => {
    for (const caller of exempt) {
      const res = await enforceBusinessRules({
        request: jsonReq('POST', '/fiveSAudits', { planId: 'p1' }),
        body: undefined,
        read: ownPlan(caller),
        caller,
      })
      expect(res).toBeUndefined()
    }
  })

  it('still refuses Müdür, an auditor and a field manager for the plan of their own location', async () => {
    for (const caller of held) {
      const res = await enforceBusinessRules({
        request: jsonReq('POST', '/fiveSAudits', { planId: 'p1' }),
        body: undefined,
        read: ownPlan(caller),
        caller,
      })
      expect(res?.status).toBe(400)
      expect((await res?.json()).message).toContain('Saha sorumlusu olduğunuz lokasyonun denetimini')
    }
  })

  it('lets each of them start any other team’s plan', async () => {
    for (const caller of [...exempt, ...held]) {
      const res = await enforceBusinessRules({
        request: jsonReq('POST', '/fiveSAudits', { planId: 'p1' }),
        body: undefined,
        read: script({ 'from main.five_s_audit_plans p': [{ status: 'planned', field_manager_user_ids: ['u-someone-else'] }] }),
        caller,
      })
      expect(res).toBeUndefined()
    }
  })

  it('lets the godmin, by role or by the flag alone, open a plan-less single finding exactly like Merkez Ekip', async () => {
    // The carrier row a single finding is filed under: no plan, the location named, source marked.
    const carrier = { departmentName: 'Test Depo', source: 'single_finding', totalScore: '0.00' }
    for (const caller of [KORAY, GOD_FLAG_ONLY, GOD_ROLE_FM]) {
      const audit = await enforceBusinessRules({
        request: jsonReq('POST', '/fiveSAudits', carrier),
        body: undefined,
        read: ownLocation(caller),
        caller,
      })
      expect(audit).toBeUndefined()
    }
  })

  it('still refuses the plan-less carrier row to Müdür and an auditor who manage the named location', async () => {
    // Negative control for the godmin exemption above: it is `isAdmin` (Merkez Ekip, Super Admin, godmin)
    // and nothing wider. A role that merely sees every audit, or audits elsewhere, does not get it.
    const named = { departmentName: 'Test Depo', source: 'single_finding', totalScore: '0.00' }
    const identified = { locationId: 'l-test-depo', source: 'single_finding', totalScore: '0.00' }
    for (const body of [named, identified]) {
      for (const caller of held) {
        const res = await enforceBusinessRules({
          request: jsonReq('POST', '/fiveSAudits', body),
          body: undefined,
          read: ownLocation(caller),
          caller,
        })
        expect(res?.status).toBe(400)
        expect((await res?.json()).message).toContain('Saha sorumlusu olduğunuz lokasyonun denetimini')
      }
    }
  })

  it('lets the same roles file the carrier row of a place they do not manage', async () => {
    const carrier = { departmentName: 'Test Depo', source: 'single_finding', totalScore: '0.00' }
    for (const caller of held) {
      const res = await enforceBusinessRules({
        request: jsonReq('POST', '/fiveSAudits', carrier),
        body: undefined,
        read: script({ 'from main.five_s_locations': [{ field_manager_user_ids: ['u-someone-else'] }] }),
        caller,
      })
      expect(res).toBeUndefined()
    }
  })

  it('does not ask the godmin to be a team member or the location’s field manager for the finding itself', async () => {
    const finding = {
      auditId: 'a1',
      description: 'TEKİL BULGU',
      locationName: 'Test Depo',
      findingType: 'Uygunsuzluk',
      detectedDate: '2026-10-01',
    }
    for (const caller of [KORAY, GOD_FLAG_ONLY, GOD_ROLE_FM]) {
      const res = await enforceBusinessRules({
        request: jsonReq('POST', '/fiveSFindings', finding),
        body: undefined,
        read: reader([]),
        caller,
      })
      expect(res).toBeUndefined()
    }
  })

  it('holds the same line on the plan write that links the audit', async () => {
    const read = script({
      'from main.five_s_audit_plans p': [{ field_manager_user_ids: ['u-koray', 'u-god-fm', 'u-mgr-fm'] }],
      'from main.five_s_audit_plans where id': [{ planned_date: '2026-10-02', date_change_count: 0, status: 'planned' }],
    })
    for (const caller of [KORAY, GOD_FLAG_ONLY]) {
      expect(
        await enforceBusinessRules({ request: jsonReq('PUT', '/fiveSAuditPlans/p1', { auditId: 'a1' }), body: undefined, read, caller })
      ).toBeUndefined()
    }
    const refused = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditPlans/p1', { auditId: 'a1' }),
      body: undefined,
      read,
      caller: MANAGER_FM,
    })
    expect(refused?.status).toBe(400)
  })
})

describe('a closed finding, completely (#31)', () => {
  it('counts a photo held only by its file id', () => {
    expect(photoCount({ photo_after_file_id: 'f1' }, 'after')).toBe(1)
    expect(photoCount({ photo_after_file_id: null }, 'after')).toBe(0)
    expect(photoCount({ photo_before_files: [{}, {}], photo_before_url: 'u' }, 'before')).toBe(2)
  })

  it('refuses nulling the only photo’s file id for anyone but an admin', async () => {
    const read = reader([{ status: 'closed', photo_after_file_id: 'f1' }])
    const asManager = await enforceBusinessRules({
      request: jsonReq('PATCH', '/fiveSFindings/f1', { photoAfterFileId: null }),
      body: undefined,
      read,
      caller: FIELD_MANAGER,
    })
    expect(asManager?.status).toBe(400)
    const asAdmin = await enforceBusinessRules({
      request: jsonReq('PATCH', '/fiveSFindings/f1', { photoAfterFileId: null }),
      body: undefined,
      read,
      caller: CENTRAL,
    })
    expect(asAdmin).toBeUndefined()
  })

  it('lets only an admin reopen it — reopening was the way round the photo rule', async () => {
    const read = reader([{ status: 'closed', photo_after_url: 'u1' }])
    const asManager = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSFindings/f1', { status: 'open' }),
      body: undefined,
      read,
      caller: FIELD_MANAGER,
    })
    expect(asManager?.status).toBe(400)
    expect((await asManager?.json()).message).toContain('yeniden açılabilir')
    const asAdmin = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSFindings/f1', { status: 'open' }),
      body: undefined,
      read,
      caller: CENTRAL,
    })
    expect(asAdmin).toBeUndefined()
  })

  it('does not count a re-save of the closed status as reopening', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSFindings/f1', { status: 'closed', actionToTake: 'x' }),
      body: undefined,
      read: reader([{ status: 'closed', photo_after_url: 'u1' }]),
      caller: FIELD_MANAGER,
    })
    expect(res).toBeUndefined()
  })

  it('does not let a close stand on the photo the same request removes', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSFindings/f1', { status: 'closed', photoAfterUrl: null }),
      body: undefined,
      read: reader([{ status: 'open', photo_after_url: 'u1' }]),
      caller: CENTRAL,
    })
    expect(res?.status).toBe(400)
  })
})

describe('the date counter the client sends', () => {
  // The caller below leads the plan's team: the one auditor who may move it.
  const planned = script({
    'from main.five_s_audit_teams t': [{ leader_user_id: 'u-aud', is_member: false }],
    'from main.five_s_audit_plans where id': [
      { planned_date: '2026-10-05', date_change_count: 1, status: 'planned', assigned_team_id: 'T1' },
    ],
  })
  const move = (payload: Record<string, unknown>, caller = AUDITOR, read = planned) =>
    enforceBusinessRules({ request: jsonReq('PUT', '/fiveSAuditPlans/p1', payload), body: undefined, read, caller })

  it('takes a move that spends exactly one change', async () => {
    expect(await move({ plannedDate: '2026-12-01', dateChangeCount: 2 })).toBeUndefined()
  })

  it('refuses a move that leaves the counter out, keeps it, or jumps it', async () => {
    for (const payload of [
      { plannedDate: '2026-12-01' },
      { plannedDate: '2026-12-01', dateChangeCount: 1 },
      { plannedDate: '2026-12-01', dateChangeCount: 3 },
      { plannedDate: '2026-12-01', dateChangeCount: 'iki' },
    ]) {
      const res = await move(payload)
      expect(res?.status).toBe(400)
      expect((await res?.json()).message).toContain('2. hak')
    }
  })

  it('keeps the counter still on a godmin move and on a correction of a finished audit', async () => {
    expect(await move({ plannedDate: '2026-12-01' }, GOD)).toBeUndefined()
    expect(await move({ plannedDate: '2026-12-01', dateChangeCount: 1 }, GOD)).toBeUndefined()
    expect((await move({ plannedDate: '2026-12-01', dateChangeCount: 2 }, GOD))?.status).toBe(400)

    const done = reader([{ planned_date: '2026-10-05', date_change_count: 1, status: PENDING_APPROVAL }])
    expect(await move({ plannedDate: '2026-10-04' }, CENTRAL, done)).toBeUndefined()
    expect((await move({ plannedDate: '2026-10-04', dateChangeCount: 2 }, CENTRAL, done))?.status).toBe(400)
  })
})

describe('#13 after the plan is made', () => {
  const planAt = (managers: string[]) => [{ location_name: 'Test Depo', field_manager_user_ids: managers }]

  it('refuses adding the field manager to a team with an open plan at their location', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAuditTeamMembers', { teamId: 'T1', userId: 'u-fm' }),
      body: undefined,
      read: script({
        'from main.five_s_audit_plans p join main.five_s_locations': planAt(['u-fm']),
        'from main.users': [{ name: 'Ayşe Saha' }],
      }),
    })
    expect(res?.status).toBe(400)
    const message = (await res?.json()).message as string
    expect(message).toContain('Ayşe Saha')
    expect(message).toContain('Test Depo')
  })

  it('only counts open plans', async () => {
    let asked = ''
    await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAuditTeamMembers', { teamId: 'T1', userId: 'u-fm' }),
      body: undefined,
      read: async (text) => {
        asked ||= text
        return []
      },
    })
    expect(asked).toContain("not in ('completed', 'cancelled')")
    expect(asked).toContain('coalesce(p.is_active, true)')
  })

  it('lets anyone else join, and an inactive membership through', async () => {
    const read = script({ 'from main.five_s_audit_plans p join main.five_s_locations': planAt(['u-fm']) })
    expect(
      await enforceBusinessRules({
        request: jsonReq('POST', '/fiveSAuditTeamMembers', { teamId: 'T1', userId: 'u-other' }),
        body: undefined,
        read,
      })
    ).toBeUndefined()
    expect(
      await enforceBusinessRules({
        request: jsonReq('POST', '/fiveSAuditTeamMembers', { teamId: 'T1', userId: 'u-fm', isActive: false }),
        body: undefined,
        read,
      })
    ).toBeUndefined()
  })

  it('refuses moving a membership onto the field manager, and leaves an untouched one alone', async () => {
    const read = script({
      'from main.five_s_audit_team_members where id': [{ team_id: 'T1', user_id: 'u-other', is_active: true }],
      'from main.five_s_audit_plans p join main.five_s_locations': planAt(['u-fm', 'u-other']),
    })
    const moved = await enforceBusinessRules({
      request: jsonReq('PATCH', '/fiveSAuditTeamMembers/m1', { userId: 'u-fm' }),
      body: undefined,
      read,
    })
    expect(moved?.status).toBe(400)
    // u-other already clashes (old data); re-saving the row does not re-judge it.
    const same = await enforceBusinessRules({
      request: jsonReq('PATCH', '/fiveSAuditTeamMembers/m1', { userId: 'u-other', teamId: 'T1' }),
      body: undefined,
      read,
    })
    expect(same).toBeUndefined()
  })

  it('refuses making the field manager the team’s leader', async () => {
    const read = script({
      'select leader_user_id from main.five_s_audit_teams': [{ leader_user_id: 'u-lead' }],
      'from main.five_s_audit_plans p join main.five_s_locations': planAt(['u-fm']),
    })
    const res = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditTeams/T1', { name: 'Ekip A', leaderUserId: 'u-fm' }),
      body: undefined,
      read,
    })
    expect(res?.status).toBe(400)
    const unchanged = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditTeams/T1', { name: 'Ekip A', leaderUserId: 'u-lead' }),
      body: undefined,
      read,
    })
    expect(unchanged).toBeUndefined()
  })

  it('refuses making a member of the auditing team the location’s field manager', async () => {
    const read = script({
      'join lateral': [
        { team_name: 'Ekip A', user_id: 'u-mem' },
        { team_name: 'Ekip A', user_id: 'u-old' },
      ],
      'from main.five_s_locations where id': [{ field_manager_user_ids: ['u-old'] }],
      'from main.users': [{ name: 'Mehmet Üye' }],
    })
    const res = await enforceBusinessRules({
      request: jsonReq('PATCH', '/fiveSLocations/L1', { fieldManagerUserIds: ['u-old', 'u-mem'] }),
      body: undefined,
      read,
    })
    expect(res?.status).toBe(400)
    const message = (await res?.json()).message as string
    expect(message).toContain('Mehmet Üye')
    expect(message).toContain('Ekip A')

    // u-old was already responsible; an edit that adds nobody is not re-judged.
    const unchanged = await enforceBusinessRules({
      request: jsonReq('PATCH', '/fiveSLocations/L1', { fieldManagerUserIds: ['u-old'], name: 'Depo' }),
      body: undefined,
      read,
    })
    expect(unchanged).toBeUndefined()
  })
})

/* ───────────── Round 3: the findings of the 13 Oct review ───────────── */

const PLAN = '6f0c2a4e-1b3d-4c5e-8f7a-9b0c1d2e3f40'
const AUDIT = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const TEAM = '3c1e5a7b-2d4f-4a6b-9c8d-0e1f2a3b4c5d'
const USER = 'b7d4e2f1-6a5c-4b3d-8e9f-0a1b2c3d4e5f'
const FILE_A = '11111111-2222-4333-8444-555555555555'
const FILE_B = '66666666-7777-4888-9999-aaaaaaaaaaaa'

/** Answers a query only when its first parameter is the id given — as Postgres would by `id::text`. */
const byId =
  (id: string, rows: Record<string, unknown>[], others: Record<string, Record<string, unknown>[]> = {}) =>
  async (text: string, params: QueryParam[]) => {
    for (const [needle, answer] of Object.entries(others)) if (text.includes(needle)) return answer
    return params[0] === id ? rows : []
  }

describe('ids in any spelling Postgres reads (#0)', () => {
  it('brings every uuid form to lower-case 8-4-4-4-12 and leaves the rest alone', () => {
    for (const form of [
      AUDIT.toUpperCase(),
      `{${AUDIT}}`,
      AUDIT.replace(/-/g, ''),
      'a0ee-bc99-9c0b-4ef8-bb6d-6bb9-bd38-0a11',
      ` ${AUDIT} `,
    ]) {
      expect(canonicalId(form)).toBe(AUDIT)
    }
    for (const other of ['p1', `{${AUDIT}`, `${AUDIT}0`, 'bulk', '']) expect(canonicalId(other)).toBe(other.trim())
  })

  it('refuses an approval sent to the upper-case spelling of the plan id', async () => {
    // It used to read no row, return "the route will answer 404" — and nucleus
    // found the plan and approved it.
    for (const spelling of [PLAN.toUpperCase(), `%7B${PLAN}%7D`, PLAN.replace(/-/g, '')]) {
      const res = await enforceBusinessRules({
        request: jsonReq('PUT', `/fiveSAuditPlans/${spelling}`, { status: 'completed' }),
        body: undefined,
        read: byId(PLAN, [{ planned_date: '2026-10-02', date_change_count: 0, status: PENDING_APPROVAL }]),
        caller: AUDITOR,
      })
      expect(res?.status).toBe(400)
      expect((await res?.json()).message).toContain('Onay Bekliyor')
    }
  })

  it('refuses closing a finding without a photo through a hyphenless id', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PUT', `/fiveSFindings/${FILE_A.replace(/-/g, '').toUpperCase()}`, { status: 'closed' }),
      body: undefined,
      read: byId(FILE_A, [{ status: 'open', photo_after_url: null }]),
      caller: FIELD_MANAGER,
    })
    expect(res?.status).toBe(400)
  })

  it('refuses the field manager joining the team under an upper-case user id', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAuditTeamMembers', { teamId: TEAM.toUpperCase(), userId: USER.toUpperCase() }),
      body: undefined,
      read: async (text, params) => {
        if (text.includes('from main.five_s_audit_plans p join main.five_s_locations')) {
          return params[0] === TEAM ? [{ location_name: 'Test Depo', field_manager_user_ids: [USER] }] : []
        }
        if (text.includes('from main.users')) return [{ name: 'Ayşe Saha' }]
        return []
      },
    })
    expect(res?.status).toBe(400)
    expect((await res?.json()).message).toContain('Test Depo')
  })

  it('compares a jsonb id list written in capitals with the caller', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAudits', { planId: PLAN }),
      body: undefined,
      read: script({ 'from main.five_s_audit_plans p': [{ status: 'planned', field_manager_user_ids: [USER.toUpperCase()] }] }),
      caller: { userId: USER, isGod: false, roles: ['auditor'] },
    })
    expect(res?.status).toBe(400)
  })

  it('asks the delete question with the canonical id', async () => {
    const seen: QueryParam[][] = []
    await enforceBusinessRules({
      request: req('DELETE', `/fiveSAuditTeams/${TEAM.toUpperCase()}`),
      body: undefined,
      read: async (_text, params) => {
        seen.push(params)
        return [{ n: 0 }]
      },
    })
    expect(seen).toEqual([[TEAM]])
  })
})

describe('Müdür plans, Merkez Ekip finishes (rows 12, 17, 29)', () => {
  const pending = reader([{ planned_date: '2026-10-02', date_change_count: 0, status: PENDING_APPROVAL }])
  const completed = reader([{ planned_date: '2026-10-02', date_change_count: 0, status: 'completed' }])
  const put = (payload: unknown, caller: Caller, read = pending) =>
    enforceBusinessRules({ request: jsonReq('PUT', '/fiveSAuditPlans/p1', payload), body: undefined, read, caller })

  it('does not let Müdür approve, and lets Super Admin', async () => {
    const asManager = await put({ status: 'completed' }, MANAGER)
    expect(asManager?.status).toBe(400)
    expect(await put({ status: 'completed' }, SUPER_ADMIN)).toBeUndefined()
  })

  it('does not let Müdür create a plan as completed', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAuditPlans', {
        plannedDate: '2026-10-20',
        locationId: 'loc',
        assignedTeamId: 'team',
        status: 'completed',
      }),
      body: undefined,
      read: reader([]),
      caller: MANAGER,
    })
    expect(res?.status).toBe(400)
  })

  it('does not let Müdür reopen a completed audit', async () => {
    expect((await put({ status: 'planned' }, MANAGER, completed))?.status).toBe(400)
    expect(await put({ status: 'planned' }, CENTRAL, completed)).toBeUndefined()
  })

  it('keeps Müdür sending a pending audit back to planning', async () => {
    expect(await put({ status: 'planned' }, MANAGER)).toBeUndefined()
  })

  it('does not let Müdür move the date of a sent or approved audit', async () => {
    for (const read of [pending, completed]) {
      const res = await put({ plannedDate: '2026-10-03' }, MANAGER, read)
      expect(res?.status).toBe(400)
      expect((await res?.json()).message).toContain('yalnız Merkez Ekip')
      expect(await put({ plannedDate: '2026-10-03' }, CENTRAL, read)).toBeUndefined()
    }
  })

  it('keeps Müdür moving a planned audit within the cap', async () => {
    const res = await put(
      { plannedDate: '2026-10-09', dateChangeCount: 1 },
      MANAGER,
      reader([{ planned_date: '2026-10-02', date_change_count: 0, status: 'planned' }])
    )
    expect(res).toBeUndefined()
  })

  it('holds a Müdür who is the location’s field manager to #27', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAudits', { planId: 'p1' }),
      body: undefined,
      read: script({ 'from main.five_s_audit_plans p': [{ status: 'planned', field_manager_user_ids: ['u-mgr'] }] }),
      caller: MANAGER,
    })
    expect(res?.status).toBe(400)
  })
})

describe('correcting a sent or approved audit (rows 12, 17, 29)', () => {
  const linked = (status: string) =>
    script({
      'from main.five_s_audit_answers where id': [{ audit_id: AUDIT }],
      "in ('completed', 'pending_approval')": status === 'planned' ? [] : [{ status }],
    })

  it('refuses Müdür’s score correction, lets Merkez Ekip make it', async () => {
    for (const status of ['completed', PENDING_APPROVAL]) {
      const asManager = await enforceBusinessRules({
        request: jsonReq('PATCH', `/fiveSAudits/${AUDIT}`, { totalScore: '80.00' }),
        body: undefined,
        read: linked(status),
        caller: MANAGER,
      })
      expect(asManager?.status).toBe(403)
      expect((await asManager?.json()).message).toBe(
        'Tamamlanmış ya da onay bekleyen bir denetimi yalnız Merkez Ekip düzeltebilir.'
      )
      expect(
        await enforceBusinessRules({
          request: jsonReq('PATCH', `/fiveSAudits/${AUDIT}`, { totalScore: '80.00' }),
          body: undefined,
          read: linked(status),
          caller: CENTRAL,
        })
      ).toBeUndefined()
    }
  })

  it('refuses a new or changed answer on it, from anyone below Merkez Ekip', async () => {
    const create = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAuditAnswers', { auditId: AUDIT, questionId: 'q1', rating: 'good' }),
      body: undefined,
      read: linked('completed'),
      caller: AUDITOR,
    })
    expect(create?.status).toBe(403)
    const change = await enforceBusinessRules({
      request: jsonReq('PATCH', '/fiveSAuditAnswers/ans1', { rating: 'bad' }),
      body: undefined,
      read: linked(PENDING_APPROVAL),
      caller: MANAGER,
    })
    expect(change?.status).toBe(403)
  })

  it('asks by both links: the plan’s audit_id and the audit’s plan_id', async () => {
    let asked = ''
    await enforceBusinessRules({
      request: jsonReq('PATCH', `/fiveSAudits/${AUDIT.toUpperCase()}`, { auditorName: 'x' }),
      body: undefined,
      read: async (text, params) => {
        asked = `${text} ${JSON.stringify(params)}`
        return []
      },
      caller: MANAGER,
    })
    expect(asked).toContain('p.audit_id::text = any($1::text[])')
    expect(asked).toContain('select a.plan_id::text from main.five_s_audits a')
    expect(asked).toContain(AUDIT)
  })

  it('leaves the auditor’s own submission alone: the answers go in while the plan is still planned', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAuditAnswers', { auditId: AUDIT, questionId: 'q1', rating: 'good' }),
      body: undefined,
      read: linked('planned'),
      caller: AUDITOR,
    })
    expect(res).toBeUndefined()
  })

  it('answers 401 when it cannot tell who is correcting a locked audit', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PATCH', `/fiveSAudits/${AUDIT}`, { totalScore: '80.00' }),
      body: undefined,
      read: linked('completed'),
      caller: null,
    })
    expect(res?.status).toBe(401)
  })
})

describe('an auditor sends their own team’s plan, and nothing else (#5, #4)', () => {
  const plan = (row: Record<string, unknown>, onTeam: { leader?: string; member?: boolean } = { member: true }) =>
    script({
      'from main.five_s_audit_teams t': [{ leader_user_id: onTeam.leader ?? 'u-lead', is_member: onTeam.member === true }],
      'from main.five_s_audit_plans where id': [{ assigned_team_id: TEAM, date_change_count: 0, ...row }],
    })
  const put = (payload: unknown, read: ReturnType<typeof plan>, caller: Caller | null = AUDITOR) =>
    enforceBusinessRules({ request: jsonReq('PUT', '/fiveSAuditPlans/p1', payload), body: undefined, read, caller })
  const stamp = { status: PENDING_APPROVAL, auditId: AUDIT, auditorAttended: true, fieldManagerAttended: false }

  it('lets a member of the plan’s team send it with the audit', async () => {
    expect(await put(stamp, plan({ status: 'planned' }))).toBeUndefined()
    expect(await put(stamp, plan({ status: 'planned' }, { leader: 'u-aud' }))).toBeUndefined()
  })

  it('refuses an auditor from another team', async () => {
    const res = await put(stamp, plan({ status: 'planned' }, { member: false }))
    expect(res?.status).toBe(403)
    expect((await res?.json()).message).toContain('ekibinize atanmamış')
  })

  it('refuses every other status change', async () => {
    for (const [stored, payload] of [
      [PENDING_APPROVAL, { status: 'planned' }],
      ['planned', { status: 'cancelled' }],
      ['planned', { status: PENDING_APPROVAL }],
      ['cancelled', { status: PENDING_APPROVAL, auditId: AUDIT }],
    ] as const) {
      const res = await put(payload, plan({ status: stored }))
      expect(res?.status).toBe(400)
    }
  })

  it('lets the offline queue send the same stamp again', async () => {
    const sent = plan({ status: PENDING_APPROVAL, audit_id: AUDIT, auditor_attended: true, field_manager_attended: false })
    expect(await put({ ...stamp, auditId: AUDIT.toUpperCase() }, sent)).toBeUndefined()
  })

  it('keeps a sent or approved plan’s audit link and attendance', async () => {
    for (const status of [PENDING_APPROVAL, 'completed']) {
      const sent = plan({ status, audit_id: AUDIT, auditor_attended: true, field_manager_attended: false })
      for (const payload of [
        { ...stamp, auditId: FILE_A },
        { fieldManagerAttended: true },
        { auditorAttended: false },
        { auditId: null },
      ]) {
        const res = await put(status === 'completed' ? { ...payload, status: undefined } : payload, sent)
        expect(res?.status).toBe(400)
      }
      expect(await put({ fieldManagerAttended: true }, sent, CENTRAL)).toBeUndefined()
    }
  })

  it('answers 401 when it cannot tell who is sending', async () => {
    expect((await put(stamp, plan({ status: 'planned' }), null))?.status).toBe(401)
  })
})

describe('only the team leader moves a planned audit (#3)', () => {
  const planned = (status = 'planned', leader = 'u-aud') =>
    script({
      'from main.five_s_audit_teams t': [{ leader_user_id: leader, is_member: true }],
      'from main.five_s_audit_plans where id': [
        { planned_date: '2026-10-05', date_change_count: 0, status, assigned_team_id: TEAM },
      ],
    })
  const move = (read: ReturnType<typeof planned>, caller: Caller, payload: unknown = { plannedDate: '2026-10-09', dateChangeCount: 1 }) =>
    enforceBusinessRules({ request: jsonReq('PUT', '/fiveSAuditPlans/p1', payload), body: undefined, read, caller })

  it('lets the leader move it within the cap', async () => {
    expect(await move(planned(), AUDITOR)).toBeUndefined()
  })

  it('refuses another member of the team, and a field manager', async () => {
    for (const caller of [AUDITOR, FIELD_MANAGER]) {
      const res = await move(planned('planned', 'u-someone-else'), caller)
      expect(res?.status).toBe(400)
      expect((await res?.json()).message).toBe('Planın tarihini yalnız ekip lideri ve Merkez Ekip değiştirebilir.')
    }
  })

  it('refuses the leader on a plan that is not planned, and clearing the date', async () => {
    expect((await move(planned('cancelled'), AUDITOR))?.status).toBe(400)
    expect((await move(planned(), AUDITOR, { plannedDate: null }))?.status).toBe(400)
  })
})

describe('an unchanged date spends nothing (#8)', () => {
  const planned = reader([{ planned_date: '2026-10-05', date_change_count: 1, status: 'planned' }])
  const put = (payload: unknown, caller: Caller = CENTRAL) =>
    enforceBusinessRules({ request: jsonReq('PUT', '/fiveSAuditPlans/p1', payload), body: undefined, read: planned, caller })

  it('refuses a higher counter with the same date, or with no date', async () => {
    for (const payload of [{ plannedDate: '2026-10-05', dateChangeCount: 2 }, { dateChangeCount: 2 }]) {
      const res = await put(payload)
      expect(res?.status).toBe(400)
      expect((await res?.json()).message).toBe('Tarih değişmedi; değişiklik hakkı kullanılmadı.')
    }
  })

  it('takes the same date with the counter where it is, and leaves the godmin free', async () => {
    expect(await put({ plannedDate: '2026-10-05', dateChangeCount: 1 })).toBeUndefined()
    expect(await put({ plannedDate: '2026-10-05', dateChangeCount: 2 }, GOD)).toBeUndefined()
  })
})

describe('a plan date is a plain day (security #5)', () => {
  it('knows a plain day from everything else', () => {
    expect(isPlainDate('2026-11-02')).toBe(true)
    for (const v of ['2026-11-02T23:30:00-12:00', '2026-02-31', '2026-13-01', '02.11.2026', '', ' 2026-11-02', 20261102, null]) {
      expect(isPlainDate(v)).toBe(false)
    }
  })

  it('refuses a timestamp with a zone on a move and on a create', async () => {
    const moved = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditPlans/p1', { plannedDate: '2026-11-02T23:30:00-12:00' }),
      body: undefined,
      read: reader([{ planned_date: '2026-11-02', date_change_count: 0, status: 'planned' }]),
      caller: CENTRAL,
    })
    expect(moved?.status).toBe(400)
    expect((await moved?.json()).message).toBe('Tarih YYYY-AA-GG biçiminde olmalı.')
    const created = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAuditPlans', { plannedDate: '2026-02-31', locationId: 'l', assignedTeamId: 't' }),
      body: undefined,
      read: reader([]),
      caller: CENTRAL,
    })
    expect(created?.status).toBe(400)
  })

  it('leaves a period plan, which has no date, alone', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAuditPlans', {
        quarter: '2026-Q4',
        dateRangeStart: '2026-10-01',
        dateRangeEnd: '2026-12-31',
        plannedDate: null,
      }),
      body: undefined,
      read: reader([]),
      caller: CENTRAL,
    })
    expect(res).toBeUndefined()
  })
})

describe('a closed finding keeps WHICH photos it was closed on (#4, R32)', () => {
  const closed = (row: Record<string, unknown>) => reader([{ status: 'closed', ...row }])
  const put = (payload: unknown, row: Record<string, unknown>, caller: Caller = FIELD_MANAGER) =>
    enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSFindings/f1', payload),
      body: undefined,
      read: closed(row),
      caller,
    })
  const stored = {
    photo_after_files: [{ file_id: FILE_A, url: null }],
    photo_after_file_id: FILE_A,
    photo_after_url: `/cdn/${FILE_A}`,
  }

  it('refuses swapping the photo for another — same count, different evidence', async () => {
    const res = await put({ photoAfterFiles: [{ file_id: FILE_B, url: null }] }, stored)
    expect(res?.status).toBe(400)
    expect(await put({ photoAfterFiles: [{ file_id: FILE_B, url: null }] }, stored, CENTRAL)).toBeUndefined()
  })

  it('refuses the review’s request: an empty item and a made-up url in place of the photo', async () => {
    const res = await put({ photoAfterFiles: [{ file_id: null }], photoAfterUrl: 'x' }, stored)
    expect(res?.status).toBe(400)
  })

  it('refuses swapping the only photo of an old finding held in the url column', async () => {
    const res = await put({ photoAfterUrl: 'https://eski/sistem/baska.jpg' }, { photo_after_url: 'https://eski/sistem/ilk.jpg' })
    expect(res?.status).toBe(400)
  })

  it('takes what the findings screen sends when it adds a photo', async () => {
    // The list keeps A and gains B; the single-photo columns move to the newest.
    const res = await put(
      {
        photoAfterFiles: [
          { fileId: FILE_A, url: null },
          { fileId: FILE_B, url: null },
        ],
        photoAfterFileId: FILE_B,
        photoAfterUrl: `/cdn/${FILE_B}`,
      },
      stored
    )
    expect(res).toBeUndefined()
  })

  it('takes an old finding’s url carried into the list next to the new photo', async () => {
    const old = { photo_after_files: [], photo_after_url: `https://eski/foto/${FILE_A}.jpg` }
    const res = await put(
      {
        photoAfterFiles: [
          { file_id: null, url: old.photo_after_url },
          { file_id: FILE_B, url: null },
        ],
        photoAfterFileId: FILE_B,
        photoAfterUrl: `/cdn/${FILE_B}`,
      },
      old
    )
    expect(res).toBeUndefined()
  })

  it('does not close a finding on an "after" photo that names no file', async () => {
    for (const files of [[{}], [{ file_id: null }], [{ fileId: '  ' }]]) {
      const res = await enforceBusinessRules({
        request: jsonReq('PUT', '/fiveSFindings/f1', { status: 'closed', photoAfterFiles: files }),
        body: undefined,
        read: reader([{ status: 'open', photo_after_url: null }]),
        caller: FIELD_MANAGER,
      })
      expect(res?.status).toBe(400)
    }
  })

  it('counts a file list only by items that say which file they are', () => {
    expect(hasAfterPhoto({ photo_after_files: [{}] })).toBe(false)
    expect(hasAfterPhoto({ photo_after_files: [{ file_id: null }] })).toBe(false)
    expect(hasAfterPhoto({ photo_after_files: '[{"file_id":null}]' })).toBe(false)
    for (const item of [{ fileId: 'x' }, { path: 'p' }, { url: 'u' }, 'x']) {
      expect(hasAfterPhoto({ photo_after_files: [item] })).toBe(true)
    }
    expect(photoNames(`/cdn/${FILE_A.toUpperCase()}`)).toContain(FILE_A)
  })
})

describe('one plan, one audit (#1)', () => {
  const post = (plan: Record<string, unknown>) =>
    enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAudits', { planId: PLAN.toUpperCase(), auditDate: '2026-10-01' }),
      body: undefined,
      read: byId(PLAN, [{ field_manager_user_ids: [], ...plan }]),
      caller: AUDITOR,
    })

  it('refuses a second audit for a plan that has one, or has been sent or approved', async () => {
    for (const plan of [
      { status: 'planned', audit_id: AUDIT },
      { status: PENDING_APPROVAL, audit_id: null },
      { status: 'completed', audit_id: null },
    ]) {
      const res = await post(plan)
      expect(res?.status).toBe(409)
      expect((await res?.json()).message).toBe('Bu plan için denetim zaten gönderilmiş.')
    }
  })

  it('takes the first one', async () => {
    expect(await post({ status: 'planned', audit_id: null })).toBeUndefined()
  })

  it('takes a queued single finding replayed with its plan after the audit was sent', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAudits', { planId: PLAN, source: 'single_finding', auditDate: '2026-10-01' }),
      body: undefined,
      read: byId(PLAN, [{ field_manager_user_ids: [], status: PENDING_APPROVAL, audit_id: AUDIT }]),
      caller: AUDITOR,
    })
    expect(res).toBeUndefined()
  })
})

describe('the godmin’s account (security #2)', () => {
  const GODMIN_ID = 'c0ffee00-1111-4222-8333-444455556666'
  const read = async (text: string, params: QueryParam[]) => {
    if (!text.includes('from main.users u')) return []
    const ids = (params[0] as string[]) ?? []
    return ids.includes(GODMIN_ID) ? [{ id: GODMIN_ID }] : []
  }

  it('refuses Super Admin’s write, deactivation or delete through the generic users routes', async () => {
    for (const request of [
      jsonReq('PATCH', `/users/${GODMIN_ID}`, { isActive: false }),
      jsonReq('PUT', `/users/${GODMIN_ID.toUpperCase()}`, { email: 'x@y.z' }),
      req('DELETE', `/users/${GODMIN_ID}`),
      jsonReq('PUT', '/users/bulk', [{ id: GODMIN_ID, data: { isActive: false } }]),
      jsonReq('DELETE', '/users/bulk', [GODMIN_ID]),
    ]) {
      const res = await enforceBusinessRules({ request, body: undefined, read, caller: SUPER_ADMIN })
      expect(res?.status).toBe(403)
      expect((await res?.json()).message).toBe('Godmin hesabı değiştirilemez.')
    }
  })

  it('lets the godmin change their own account, and anyone change another account', async () => {
    expect(
      await enforceBusinessRules({
        request: jsonReq('PATCH', `/users/${GODMIN_ID}`, { firstName: 'x' }),
        body: undefined,
        read,
        caller: GOD,
      })
    ).toBeUndefined()
    expect(
      await enforceBusinessRules({
        request: jsonReq('PATCH', `/users/${USER}`, { isActive: false }),
        body: undefined,
        read,
        caller: SUPER_ADMIN,
      })
    ).toBeUndefined()
  })
})

describe('nothing is read for a request nucleus will refuse first (security #7)', () => {
  const boom = async () => {
    throw new Error('must not query')
  }

  it('lets nucleus answer 401 to a request with no credential at all', async () => {
    const request = new Request('http://localhost:4001/fiveSFindings/f1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'closed' }),
    })
    expect(await enforceBusinessRules({ request, body: undefined, read: boom })).toBeUndefined()
    expect(request.bodyUsed).toBe(false)
  })

  it('lets nucleus answer 413 to a body over its ceiling, without reading it', async () => {
    const request = new Request('http://localhost:4001/fiveSFindings/f1', {
      method: 'PUT',
      headers: { ...SESSION, 'content-type': 'application/json', 'content-length': String(60 * 1024 * 1024) },
      body: JSON.stringify({ status: 'closed' }),
    })
    expect(await enforceBusinessRules({ request, body: undefined, read: boom })).toBeUndefined()
    expect(request.bodyUsed).toBe(false)
  })

  it('still judges a request that carries only an Authorization header', async () => {
    const request = new Request('http://localhost:4001/fiveSFindings/f1', {
      method: 'PUT',
      headers: { authorization: 'Bearer x.y.z', 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'closed' }),
    })
    const res = await enforceBusinessRules({
      request,
      body: undefined,
      read: reader([{ status: 'open', photo_after_url: null }]),
      caller: FIELD_MANAGER,
    })
    expect(res?.status).toBe(400)
  })
})

describe('an audit saved without the field manager’s attendance has no answers (Notlar 22.10, satır 39)', () => {
  // As the frontend sends it while the questions are passive: every score 0.00, and no answer row after it.
  const passiveAudit = {
    planId: PLAN,
    departmentName: 'Haddehane',
    auditorName: 'Ali Veli',
    auditDate: '2026-10-01',
    totalScore: '0.00',
    targetScore: '75.00',
    scoreS1: '0.00',
    scoreS2: '0.00',
    scoreS3: '0.00',
    scoreS4: '0.00',
    scoreS5: '0.00',
    locationId: FILE_A,
    auditorId: USER,
    clientSubmissionId: FILE_B,
  }
  const stamp = { status: PENDING_APPROVAL, auditId: AUDIT, auditorAttended: true, fieldManagerAttended: false }
  const plannedPlan = script({
    'from main.five_s_audit_teams t': [{ leader_user_id: 'u-lead', is_member: true }],
    'from main.five_s_audit_plans where id': [{ assigned_team_id: TEAM, date_change_count: 0, status: 'planned' }],
  })

  it('takes the audit row: a total of 0 and five steps at 0 are valid scores', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAudits', passiveAudit),
      body: undefined,
      read: byId(PLAN, [{ field_manager_user_ids: [], status: 'planned', audit_id: null }]),
      caller: AUDITOR,
    })
    expect(res).toBeUndefined()
  })

  it('takes the plan stamp that follows it with no answer ever posted: attendance false, audit linked', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditPlans/p1', stamp),
      body: undefined,
      read: plannedPlan,
      caller: AUDITOR,
    })
    expect(res).toBeUndefined()
  })

  it('takes the same stamp again when the offline queue replays it', async () => {
    const sent = script({
      'from main.five_s_audit_teams t': [{ leader_user_id: 'u-lead', is_member: true }],
      'from main.five_s_audit_plans where id': [
        {
          assigned_team_id: TEAM,
          date_change_count: 0,
          status: PENDING_APPROVAL,
          audit_id: AUDIT,
          auditor_attended: true,
          field_manager_attended: false,
        },
      ],
    })
    const res = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditPlans/p1', stamp),
      body: undefined,
      read: sent,
      caller: AUDITOR,
    })
    expect(res).toBeUndefined()
  })

  it('lets Merkez Ekip correct it later: re-save the zero, or tick the box and answer', async () => {
    const locked = script({ "in ('completed', 'pending_approval')": [{ status: PENDING_APPROVAL }] })
    const resave = await enforceBusinessRules({
      request: jsonReq('PATCH', `/fiveSAudits/${AUDIT}`, { totalScore: '0.00', scoreS1: '0.00', scoreS5: '0.00' }),
      body: undefined,
      read: locked,
      caller: CENTRAL,
    })
    expect(resave).toBeUndefined()

    const answer = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSAuditAnswers', { auditId: AUDIT, questionId: 'q1', rating: 'good' }),
      body: undefined,
      read: locked,
      caller: CENTRAL,
    })
    expect(answer).toBeUndefined()

    const tick = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditPlans/p1', { fieldManagerAttended: true }),
      body: undefined,
      read: script({
        'from main.five_s_audit_plans where id': [
          { status: PENDING_APPROVAL, audit_id: AUDIT, auditor_attended: true, field_manager_attended: false },
        ],
      }),
      caller: CENTRAL,
    })
    expect(tick).toBeUndefined()
  })
})

describe('an auditor adds findings, and does not edit them (R9)', () => {
  it('refuses an auditor-only account’s update of any finding', async () => {
    for (const method of ['PUT', 'PATCH']) {
      const res = await enforceBusinessRules({
        request: jsonReq(method, '/fiveSFindings/f1', { description: 'yeni metin' }),
        body: undefined,
        read: reader([]),
        caller: AUDITOR,
      })
      expect(res?.status).toBe(403)
      expect((await res?.json()).message).toBe('Denetçi bulguları değiştiremez; yalnız yeni bulgu ekleyebilir.')
    }
  })

  it('answers 401 when it cannot tell who is updating a finding', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PATCH', '/fiveSFindings/f1', { description: 'yeni metin' }),
      body: undefined,
      read: reader([]),
      caller: null,
    })
    expect(res?.status).toBe(401)
  })

  it('leaves an auditor who is also a field manager, Merkez Ekip and the godmin alone', async () => {
    for (const caller of [
      { userId: 'u-x', isGod: false, roles: ['auditor', 'field manager'] },
      CENTRAL,
      { userId: 'u-g', isGod: true, roles: ['auditor'] },
    ]) {
      const res = await enforceBusinessRules({
        request: jsonReq('PATCH', '/fiveSFindings/f1', { dueDate: '2026-12-01' }),
        body: undefined,
        read: reader([]),
        caller,
      })
      expect(res).toBeUndefined()
    }
  })

  it('still lets the auditor create one', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('POST', '/fiveSFindings', {
        description: 'x',
        locationName: 'y',
        findingType: 'z',
        detectedDate: '2026-08-01',
      }),
      body: undefined,
      read: reader([]),
      caller: AUDITOR,
    })
    expect(res).toBeUndefined()
  })
})

describe('revising a period plan: quarter and date range (R68, R69)', () => {
  const PERIOD = { quarter: '2026-Q4', date_range_start: '2026-10-01', date_range_end: '2026-12-31' }

  /** The stored period, and the dates of the sub-plans filed under it. */
  const periodReader = (children: Row[] = [], stored: Row | null = PERIOD) =>
    script({
      'select quarter, date_range_start': stored ? [stored] : [],
      'where parent_plan_id': children,
    })

  const edit = (payload: Row, caller: Caller | null, children: Row[] = [], method = 'PUT') =>
    enforceBusinessRules({
      request: jsonReq(method, '/fiveSAuditPlans/pp1', payload),
      body: undefined,
      read: periodReader(children),
      caller,
    })

  it('lets Merkez Ekip, Super Admin and the godmin rename the quarter and move both dates', async () => {
    for (const caller of [CENTRAL, SUPER_ADMIN, GOD]) {
      for (const method of ['PUT', 'PATCH']) {
        const res = await edit(
          { quarter: '2026-Q4-B', dateRangeStart: '2026-09-15', dateRangeEnd: '2027-01-15' },
          caller,
          [{ planned_date: '2026-10-20' }],
          method
        )
        expect(res).toBeUndefined()
      }
    }
  })

  it('refuses Müdür, a field manager and an auditor, who all reach the route', async () => {
    // Müdür holds the whole plans table claim, so nucleus would write it.
    for (const caller of [MANAGER, FIELD_MANAGER, AUDITOR]) {
      for (const payload of [{ quarter: '2027-Q1' }, { date_range_end: '2027-02-01' }, { dateRangeStart: '2026-09-01' }]) {
        const res = await edit(payload, caller)
        expect(res?.status).toBe(403)
        expect((await res?.json()).message).toContain('Merkez Ekip')
      }
    }
  })

  it('answers 401 when it cannot tell who is revising the period', async () => {
    const res = await edit({ quarter: '2027-Q1' }, null)
    expect(res?.status).toBe(401)
  })

  it('lets a write that changes nothing through, whoever sends it', async () => {
    const res = await edit({ quarter: '2026-Q4', date_range_start: '2026-10-01', date_range_end: '2026-12-31' }, MANAGER)
    expect(res).toBeUndefined()
  })

  it('reads a date column stored as a local-midnight Date as the same day', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditPlans/pp1', { date_range_start: '2026-10-01', date_range_end: '2026-12-31' }),
      body: undefined,
      read: periodReader([], { ...PERIOD, date_range_start: new Date(2026, 9, 1), date_range_end: new Date(2026, 11, 31) }),
      caller: MANAGER,
    })
    expect(res).toBeUndefined()
  })

  it('leaves a plan write that touches none of the three columns alone, without reading anything', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditPlans/pp1', { title: 'Yeni başlık' }),
      body: undefined,
      read: async () => {
        throw new Error('nothing should be read')
      },
      caller: MANAGER,
    })
    expect(res).toBeUndefined()
  })

  it('lets the request through when the plan does not exist, for the route to answer 404', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditPlans/yok', { quarter: '2027-Q1' }),
      body: undefined,
      read: periodReader([], null),
      caller: CENTRAL,
    })
    expect(res).toBeUndefined()
  })

  it('refuses a start after the end, naming both days', async () => {
    const res = await edit({ date_range_start: '2027-01-10', date_range_end: '2026-12-31' }, CENTRAL)
    expect(res?.status).toBe(400)
    const { message } = await res?.json()
    expect(message).toContain('2027-01-10')
    expect(message).toContain('2026-12-31')
  })

  it('allows a one-day period', async () => {
    const res = await edit({ date_range_start: '2026-11-05', date_range_end: '2026-11-05' }, CENTRAL)
    expect(res).toBeUndefined()
  })

  it('refuses a blank or oversized quarter name', async () => {
    for (const quarter of ['', '   ', null, '2026-Q4-ÇOK-UZUN-AD']) {
      const res = await edit({ quarter }, CENTRAL)
      expect(res?.status).toBe(400)
    }
  })

  it('refuses cleared, malformed and impossible dates', async () => {
    for (const payload of [
      { date_range_start: null },
      { date_range_end: '' },
      { date_range_start: '2026-13-40' },
      { date_range_end: '2026-12-31T23:30:00-12:00' },
      { date_range_end: { d: '2026-12-31' } },
    ]) {
      const res = await edit(payload, CENTRAL)
      expect(res?.status).toBe(400)
    }
  })

  it('refuses shrinking the range past sub-plans, with how many and which days', async () => {
    const res = await edit({ dateRangeEnd: '2026-12-15' }, CENTRAL, [
      { planned_date: '2026-12-28' },
      { planned_date: '2026-11-03' },
      { planned_date: '2026-12-20' },
      { planned_date: '2026-12-20' },
    ])
    expect(res?.status).toBe(400)
    const { message } = await res?.json()
    expect(message).toContain('3 denetim planı')
    expect(message).toContain('2026-12-20, 2026-12-28')
    expect(message).not.toContain('2026-11-03')
  })

  it('refuses a shrink from the start side too, reading the days as days', async () => {
    const res = await edit({ date_range_start: '2026-11-10' }, CENTRAL, [
      { planned_date: new Date(2026, 9, 25) },
      { planned_date: new Date(2026, 10, 10) },
    ])
    expect(res?.status).toBe(400)
    const { message } = await res?.json()
    expect(message).toContain('1 denetim planı')
    expect(message).toContain('2026-10-25')
  })

  it('allows the new boundaries to land exactly on a sub-plan', async () => {
    const res = await edit({ date_range_start: '2026-10-20', date_range_end: '2026-12-20' }, CENTRAL, [
      { planned_date: new Date(2026, 9, 20) },
      { planned_date: new Date(2026, 11, 20) },
    ])
    expect(res).toBeUndefined()
  })

  it('allows widening the range whatever is filed under it', async () => {
    const res = await edit({ date_range_start: '2026-09-01', date_range_end: '2027-03-31' }, CENTRAL, [
      { planned_date: '2026-10-20' },
      { planned_date: '2026-12-31' },
    ])
    expect(res).toBeUndefined()
  })

  it('does not count a cancelled sub-plan: the query leaves it out', async () => {
    const queries: string[] = []
    const res = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditPlans/pp1', { date_range_end: '2026-12-15' }),
      body: undefined,
      read: async (text) => {
        queries.push(text)
        return text.includes('select quarter') ? [PERIOD] : []
      },
      caller: CENTRAL,
    })
    expect(res).toBeUndefined()
    const children = queries.find((q) => q.includes('where parent_plan_id'))
    expect(children).toContain("<> 'cancelled'")
  })

  it('renames the quarter alone without looking at the sub-plans', async () => {
    // A period already holding an out-of-range plan (made before the rule) can still be renamed.
    const res = await edit({ quarter: '2026-Q4-düzeltme' }, CENTRAL, [{ planned_date: '2027-03-15' }])
    expect(res).toBeUndefined()
  })

  it('spells out the first eight days and counts the rest', async () => {
    const children = Array.from({ length: 11 }, (_, i) => ({ planned_date: `2026-12-${String(15 + i).padStart(2, '0')}` }))
    const res = await edit({ date_range_end: '2026-12-10' }, CENTRAL, children)
    const { message } = await res?.json()
    expect(message).toContain('11 denetim planı')
    expect(message).toContain('ve 3 tarih daha')
  })

  it('does not touch the date rules of a sub-plan: moving it inside its period still passes', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PUT', '/fiveSAuditPlans/p1', { planned_date: '2026-11-15', parent_plan_id: 'pp1' }),
      body: undefined,
      read: reader([{ date_range_start: '2026-10-01', date_range_end: '2026-12-31', quarter: '2026-Q4' }]),
      caller: GOD,
    })
    expect(res).toBeUndefined()
  })
})

describe('deleting a finding of a sent or approved audit', () => {
  const FINDING = '/fiveSFindings/6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c6'
  const finishedAudit = script({ 'from main.five_s_findings f': [{ locked: 1 }] })
  const openAudit = script({ 'from main.five_s_findings f': [] })

  it('lets Merkez Ekip, Super Admin and the godmin delete it', async () => {
    for (const caller of [CENTRAL, SUPER_ADMIN, GOD]) {
      const res = await enforceBusinessRules({
        request: req('DELETE', FINDING),
        body: undefined,
        read: finishedAudit,
        caller,
      })
      expect(res).toBeUndefined()
    }
  })

  it('refuses Müdür, saying who may', async () => {
    const res = await enforceBusinessRules({
      request: req('DELETE', FINDING),
      body: undefined,
      read: finishedAudit,
      caller: MANAGER,
    })
    expect(res?.status).toBe(403)
    expect((await res?.json()).message).toBe(
      'Tamamlanmış ya da onay bekleyen bir denetimin bulgusunu yalnız Merkez Ekip silebilir.'
    )
  })

  it('refuses a field manager and an auditor too', async () => {
    for (const caller of [FIELD_MANAGER, AUDITOR]) {
      const res = await enforceBusinessRules({
        request: req('DELETE', FINDING),
        body: undefined,
        read: finishedAudit,
        caller,
      })
      expect(res?.status).toBe(403)
    }
  })

  it('answers 401 when the caller cannot be identified', async () => {
    const res = await enforceBusinessRules({
      request: req('DELETE', FINDING),
      body: undefined,
      read: finishedAudit,
      caller: null,
    })
    expect(res?.status).toBe(401)
  })

  it('leaves a finding of an audit still under way to the claim alone', async () => {
    for (const caller of [MANAGER, CENTRAL, AUDITOR]) {
      expect(
        await enforceBusinessRules({ request: req('DELETE', FINDING), body: undefined, read: openAudit, caller })
      ).toBeUndefined()
    }
  })

  it('reads the finding by its canonical id and the plan statuses it locks on', async () => {
    const seen: Array<{ text: string; params: QueryParam[] }> = []
    const read = async (text: string, params: QueryParam[]) => {
      seen.push({ text, params })
      return []
    }
    await enforceBusinessRules({
      request: req('DELETE', `/fiveSFindings/${'6F0C2A1E-3B4D-4C5E-8F60-718293A4B5C6'}`),
      body: undefined,
      read,
      caller: MANAGER,
    })
    // The second read is the plan sent back for correction (R30), asked by the same id.
    expect(seen).toHaveLength(2)
    expect(seen[0]?.params).toEqual(['6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c6'])
    expect(seen[0]?.text).toContain("in ('completed', 'pending_approval')")
    expect(seen[0]?.text).toContain('p.audit_id::text = f.audit_id::text')
    expect(seen[0]?.text).toContain('a.plan_id::text')
    expect(seen[1]?.params).toEqual(['6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c6'])
    expect(seen[1]?.text).toContain("on p.status = 'rejected'")
  })

  it('does not look at the collection, a sub-path or a read', async () => {
    const boom = async () => {
      throw new Error('must not query')
    }
    for (const r of [req('DELETE', '/fiveSFindings'), req('DELETE', `${FINDING}/photos`), req('GET', FINDING)]) {
      expect(await enforceBusinessRules({ request: r, body: undefined, read: boom, caller: MANAGER })).toBeUndefined()
    }
  })
})

describe('a plan sent back for correction, "Reddet" (R30)', () => {
  const planRow = (row: Row, onTeam: { leader?: string; member?: boolean } = { member: true }) =>
    script({
      'from main.five_s_audit_teams t': [{ leader_user_id: onTeam.leader ?? 'u-lead', is_member: onTeam.member === true }],
      'from main.five_s_audit_plans where id': [
        { assigned_team_id: TEAM, date_change_count: 0, planned_date: '2026-10-05', audit_id: AUDIT, ...row },
      ],
    })
  const put = (payload: Row, read: ReturnType<typeof planRow>, caller: Caller | null = AUDITOR) =>
    enforceBusinessRules({ request: jsonReq('PUT', '/fiveSAuditPlans/p1', payload), body: undefined, read, caller })
  const rejected = planRow({ status: 'rejected' })
  const resend = { status: PENDING_APPROVAL, auditId: AUDIT, auditorAttended: true, fieldManagerAttended: false }

  describe('the status is written by the Reddet route alone', () => {
    it('refuses writing it through the generic route, for everybody, saying which button to use', async () => {
      for (const caller of [GOD, SUPER_ADMIN, CENTRAL, MANAGER, AUDITOR, FIELD_MANAGER]) {
        const res = await put({ status: 'rejected' }, planRow({ status: PENDING_APPROVAL }), caller)
        expect(res?.status).toBe(400)
        expect((await res?.json()).message).toContain('"Reddet"')
      }
    })

    it('refuses creating a plan that way, even for Super Admin', async () => {
      const res = await enforceBusinessRules({
        request: jsonReq('POST', '/fiveSAuditPlans', {
          plannedDate: '2026-10-20',
          locationId: 'loc',
          assignedTeamId: 'team',
          status: 'rejected',
        }),
        body: undefined,
        read: reader([]),
        caller: SUPER_ADMIN,
      })
      expect(res?.status).toBe(400)
      expect((await res?.json()).message).toContain('"Reddet"')
    })

    it('lets a plan that is already rejected be saved with the status it has, and no other spelling', async () => {
      expect(await put({ status: 'rejected' }, rejected, CENTRAL)).toBeUndefined()
      expect((await put({ status: 'Rejected' }, rejected, CENTRAL))?.status).toBe(400)
    })
  })

  describe('resending it', () => {
    it('lets a member or the leader of the plan’s team resend it with its own audit', async () => {
      expect(await put(resend, rejected)).toBeUndefined()
      expect(await put(resend, planRow({ status: 'rejected' }, { leader: 'u-aud' }))).toBeUndefined()
      expect(await put({ ...resend, auditId: AUDIT.toUpperCase() }, rejected)).toBeUndefined()
    })

    it('refuses an auditor from another team, saying who may', async () => {
      const res = await put(resend, planRow({ status: 'rejected' }, { member: false }))
      expect(res?.status).toBe(403)
      expect((await res?.json()).message).toContain('planın ekibi ya da Merkez Ekip')
    })

    it('refuses a resend with another audit or with none', async () => {
      expect((await put({ ...resend, auditId: FILE_A }, rejected))?.status).toBe(400)
      expect((await put({ status: PENDING_APPROVAL }, rejected))?.status).toBe(400)
    })

    it('lets Merkez Ekip, Super Admin and the godmin resend it; Müdür only as a member of the team', async () => {
      const outsider = planRow({ status: 'rejected' }, { member: false })
      for (const caller of [CENTRAL, SUPER_ADMIN, GOD]) {
        expect(await put({ status: PENDING_APPROVAL }, outsider, caller)).toBeUndefined()
      }
      const asManager = await put(resend, outsider, MANAGER)
      expect(asManager?.status).toBe(403)
      expect(await put(resend, rejected, MANAGER)).toBeUndefined()
    })

    it('lets the team make no other status change', async () => {
      for (const status of ['planned', 'cancelled', 'completed']) {
        expect((await put({ status }, rejected))?.status).toBe(400)
      }
    })

    it('keeps the audit link, and lets the team still correct the attendance tick', async () => {
      const relink = await put({ auditId: FILE_A }, rejected)
      expect(relink?.status).toBe(400)
      expect((await relink?.json()).message).toContain('aynı bağlantıyla')
      expect(await put({ auditId: FILE_A }, rejected, CENTRAL)).toBeUndefined()
      const ticked = planRow({ status: 'rejected', field_manager_attended: false })
      expect(await put({ fieldManagerAttended: true }, ticked)).toBeUndefined()
    })

    it('answers 401 when it cannot tell who is resending', async () => {
      expect((await put(resend, rejected, null))?.status).toBe(401)
    })
  })

  describe('the date of a rejected plan', () => {
    const move = { plannedDate: '2026-10-09', dateChangeCount: 1 }

    it('is moved by Merkez Ekip and the godmin only, without spending a change', async () => {
      const read = planRow({ status: 'rejected', date_change_count: 1 })
      for (const caller of [CENTRAL, SUPER_ADMIN, GOD]) {
        expect(await put({ plannedDate: '2026-10-09', dateChangeCount: 1 }, read, caller)).toBeUndefined()
      }
      const spends = await put({ plannedDate: '2026-10-09', dateChangeCount: 2 }, read, CENTRAL)
      expect(spends?.status).toBe(400)
    })

    it('is not moved by the team leader or by Müdür, like the date of a finished audit', async () => {
      const read = planRow({ status: 'rejected' }, { leader: 'u-aud' })
      for (const caller of [AUDITOR, MANAGER]) {
        const res = await put(move, read, caller)
        expect(res?.status).toBe(400)
        expect((await res?.json()).message).toContain('Düzeltme bekleyen denetimin tarihi yalnız Merkez Ekip')
      }
    })
  })

  describe('its audit and answers', () => {
    const world = (status: string, onTeam: { leader?: string; member?: boolean } = { member: true }) =>
      script({
        "where p.status = 'rejected'": status === 'rejected' ? [{ status: 'rejected', assigned_team_id: TEAM }] : [],
        'from main.five_s_audit_answers where id': [{ audit_id: AUDIT }],
        'from main.five_s_audit_teams t': [{ leader_user_id: onTeam.leader ?? 'u-lead', is_member: onTeam.member === true }],
      })
    const patchAudit = (read: ReturnType<typeof world>, caller: Caller | null) =>
      enforceBusinessRules({
        request: jsonReq('PATCH', `/fiveSAudits/${AUDIT}`, { totalScore: '80.00' }),
        body: undefined,
        read,
        caller,
      })
    const patchAnswer = (read: ReturnType<typeof world>, caller: Caller | null) =>
      enforceBusinessRules({
        request: jsonReq('PATCH', '/fiveSAuditAnswers/ans1', { rating: 'bad' }),
        body: undefined,
        read,
        caller,
      })
    const postAnswer = (read: ReturnType<typeof world>, caller: Caller | null) =>
      enforceBusinessRules({
        request: jsonReq('POST', '/fiveSAuditAnswers', { auditId: AUDIT, questionId: 'q1', rating: 'good' }),
        body: undefined,
        read,
        caller,
      })

    it('are written by Merkez Ekip, Super Admin, the godmin and the plan’s team', async () => {
      for (const caller of [CENTRAL, SUPER_ADMIN, GOD, AUDITOR]) {
        expect(await patchAudit(world('rejected'), caller)).toBeUndefined()
        expect(await patchAnswer(world('rejected'), caller)).toBeUndefined()
        expect(await postAnswer(world('rejected'), caller)).toBeUndefined()
      }
      expect(await patchAudit(world('rejected', { leader: 'u-aud', member: false }), AUDITOR)).toBeUndefined()
    })

    it('are refused to everybody else, Müdür and a field manager included, with a clear message', async () => {
      const outsider = world('rejected', { member: false })
      for (const caller of [AUDITOR, FIELD_MANAGER, MANAGER]) {
        for (const write of [patchAudit, patchAnswer, postAnswer]) {
          const res = await write(outsider, caller)
          expect(res?.status).toBe(403)
          expect((await res?.json()).message).toContain('yalnız planın ekibi ve Merkez Ekip yapabilir')
        }
      }
    })

    it('answer 401 when it cannot tell who is writing', async () => {
      expect((await patchAudit(world('rejected'), null))?.status).toBe(401)
    })

    it('asks about both links, by the canonical id', async () => {
      let asked = ''
      await enforceBusinessRules({
        request: jsonReq('PATCH', `/fiveSAudits/${AUDIT.toUpperCase()}`, { auditorName: 'x' }),
        body: undefined,
        read: async (text, params) => {
          if (text.includes("where p.status = 'rejected'")) asked = `${text} ${JSON.stringify(params)}`
          return []
        },
        caller: CENTRAL,
      })
      expect(asked).toContain('p.audit_id::text = any($1::text[])')
      expect(asked).toContain('select a.plan_id::text from main.five_s_audits a')
      expect(asked).toContain(AUDIT)
    })

    it('leave the Auditor role with POST alone on an audit that is not rejected', async () => {
      // boot.ts grants Auditor put/patch on audits and answers for the correction; this is what keeps it to that.
      const planned = world('planned')
      for (const write of [patchAudit, patchAnswer]) {
        const res = await write(planned, AUDITOR)
        expect(res?.status).toBe(403)
        expect((await res?.json()).message).toContain('yalnız Merkez Ekip ve Müdür düzeltebilir')
        expect(await write(planned, MANAGER)).toBeUndefined()
        expect(await write(planned, CENTRAL)).toBeUndefined()
      }
      expect(await postAnswer(planned, AUDITOR)).toBeUndefined()
    })
  })

  describe('its findings', () => {
    const FINDING = '/fiveSFindings/6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c6'
    const world = (status: string, onTeam: { leader?: string; member?: boolean } = { member: true }) =>
      script({
        "on p.status = 'rejected'": status === 'rejected' ? [{ status: 'rejected', assigned_team_id: TEAM }] : [],
        "where p.status = 'rejected'": status === 'rejected' ? [{ status: 'rejected', assigned_team_id: TEAM }] : [],
        'from main.five_s_audit_teams t': [{ leader_user_id: onTeam.leader ?? 'u-lead', is_member: onTeam.member === true }],
      })
    const newFinding = {
      auditId: AUDIT,
      description: 'Kırık raf',
      locationName: 'Depo',
      findingType: 'safety',
      detectedDate: '2026-01-02',
    }
    const post = (read: ReturnType<typeof world>, caller: Caller | null) =>
      enforceBusinessRules({ request: jsonReq('POST', '/fiveSFindings', newFinding), body: undefined, read, caller })
    const put = (read: ReturnType<typeof world>, caller: Caller | null) =>
      enforceBusinessRules({
        request: jsonReq('PUT', FINDING, { description: 'Kırık raf, düzeltildi' }),
        body: undefined,
        read,
        caller,
      })
    const remove = (read: ReturnType<typeof world>, caller: Caller | null) =>
      enforceBusinessRules({ request: req('DELETE', FINDING), body: undefined, read, caller })

    it('are written by Merkez Ekip, Super Admin, the godmin and the plan’s team', async () => {
      for (const caller of [CENTRAL, SUPER_ADMIN, GOD]) {
        for (const write of [post, put, remove]) expect(await write(world('rejected', { member: false }), caller)).toBeUndefined()
      }
      expect(await post(world('rejected'), AUDITOR)).toBeUndefined()
      expect(await remove(world('rejected'), AUDITOR)).toBeUndefined()
    })

    it('are refused to everybody else: a new one, a changed one and a deleted one', async () => {
      const outsider = world('rejected', { member: false })
      for (const caller of [FIELD_MANAGER, MANAGER]) {
        for (const write of [post, put, remove]) {
          const res = await write(outsider, caller)
          expect(res?.status).toBe(403)
          expect((await res?.json()).message).toContain('yalnız planın ekibi ve Merkez Ekip yapabilir')
        }
      }
    })

    it('are untouched while the plan is not rejected', async () => {
      const open = world('planned', { member: false })
      for (const write of [post, put, remove]) expect(await write(open, FIELD_MANAGER)).toBeUndefined()
    })

    it('judge a finding moved into a rejected audit by the audit it is moved to', async () => {
      const res = await enforceBusinessRules({
        request: jsonReq('PUT', FINDING, { auditId: AUDIT }),
        body: undefined,
        read: script({
          "where p.status = 'rejected'": [{ status: 'rejected', assigned_team_id: TEAM }],
          'from main.five_s_audit_teams t': [{ leader_user_id: 'u-lead', is_member: false }],
        }),
        caller: FIELD_MANAGER,
      })
      expect(res?.status).toBe(403)
    })

    it('answer 401 when it cannot tell who is writing', async () => {
      expect((await post(world('rejected'), null))?.status).toBe(401)
    })
  })

  describe('one plan, one audit, and an open plan', () => {
    it('refuses a second audit for a rejected plan, even one that lost its audit link', async () => {
      const res = await enforceBusinessRules({
        request: jsonReq('POST', '/fiveSAudits', { planId: PLAN, auditDate: '2026-10-01' }),
        body: undefined,
        read: byId(PLAN, [{ field_manager_user_ids: [], status: 'rejected', audit_id: null }]),
        caller: AUDITOR,
      })
      expect(res?.status).toBe(409)
      expect((await res?.json()).message).toBe('Bu plan için denetim zaten gönderilmiş.')
    })

    it('still counts it as open: the open-plan tests list only completed and cancelled as finished', async () => {
      const texts: string[] = []
      const read = async (text: string) => {
        texts.push(text)
        return [{ n: 1 }]
      }
      const res = await enforceBusinessRules({
        request: req('DELETE', '/fiveSLocations/ca47d356-7903-4be0-8dc0-cf2fab0eadb7'),
        body: undefined,
        read,
      })
      expect(res?.status).toBe(400)
      await enforceBusinessRules({
        request: jsonReq('POST', '/fiveSAuditTeamMembers', { teamId: 'T1', userId: 'u-fm' }),
        body: undefined,
        read,
      })
      expect(texts.length).toBeGreaterThanOrEqual(2)
      for (const text of texts) {
        expect(text).toContain("not in ('completed', 'cancelled')")
        expect(text).not.toContain('rejected')
      }
    })
  })
})

describe('retiring or moving a finding of a sent or approved audit without a DELETE', () => {
  const FINDING = '/fiveSFindings/6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c6'
  const finishedAudit = script({ 'from main.five_s_findings f': [{ locked: 1 }] })
  const openAudit = script({ 'from main.five_s_findings f': [] })
  const MESSAGE =
    'Tamamlanmış ya da onay bekleyen bir denetimin bulgusu pasife alınamaz ya da başka denetime taşınamaz; bunu yalnız Merkez Ekip yapabilir.'
  const OTHER_AUDIT = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

  const writes: Array<[string, Record<string, string | boolean>]> = [
    ['PATCH', { isActive: false }],
    ['PUT', { is_active: false }],
    ['PUT', { isActive: true }],
    ['PATCH', { audit_id: OTHER_AUDIT }],
    ['PUT', { auditId: OTHER_AUDIT.toUpperCase() }],
    ['PATCH', { isActive: false, auditId: OTHER_AUDIT }],
  ]

  it('refuses Müdür every PUT and PATCH that switches the finding off or moves it, saying who may', async () => {
    for (const [method, payload] of writes) {
      const res = await enforceBusinessRules({
        request: jsonReq(method, FINDING, payload),
        body: undefined,
        read: finishedAudit,
        caller: MANAGER,
      })
      expect(res?.status).toBe(403)
      expect((await res?.json()).message).toBe(MESSAGE)
    }
  })

  it('refuses a field manager the same way', async () => {
    const res = await enforceBusinessRules({
      request: jsonReq('PATCH', FINDING, { isActive: false }),
      body: undefined,
      read: finishedAudit,
      caller: FIELD_MANAGER,
    })
    expect(res?.status).toBe(403)
  })

  it('lets Merkez Ekip, Super Admin and the godmin do it', async () => {
    for (const caller of [CENTRAL, SUPER_ADMIN, GOD]) {
      for (const [method, payload] of writes) {
        const res = await enforceBusinessRules({
          request: jsonReq(method, FINDING, payload),
          body: undefined,
          read: finishedAudit,
          caller,
        })
        expect(res).toBeUndefined()
      }
    }
  })

  it('leaves a finding of an audit still under way alone', async () => {
    for (const [method, payload] of writes) {
      const res = await enforceBusinessRules({
        request: jsonReq(method, FINDING, payload),
        body: undefined,
        read: openAudit,
        caller: MANAGER,
      })
      expect(res).toBeUndefined()
    }
  })

  it('asks nothing about a finished audit for a write that carries neither column: the screens\' own updates', async () => {
    const seen: string[] = []
    const read = async (text: string) => {
      seen.push(text)
      return [{ locked: 1 }]
    }
    for (const payload of [{ dueDate: '2026-12-01' }, { description: 'düzeltildi' }]) {
      const res = await enforceBusinessRules({
        request: jsonReq('PUT', FINDING, payload),
        body: undefined,
        read,
        caller: MANAGER,
      })
      expect(res).toBeUndefined()
    }
    // The rejected-plan rule (R30) reads the finding's plan for every non-admin write; this rule's own
    // question (is its audit sent or approved?) must stay unasked.
    expect(seen.filter((text) => text.includes("'pending_approval'"))).toEqual([])
  })

  it('reads the finding by its canonical id and answers 401 when the caller is unknown', async () => {
    const seen: QueryParam[][] = []
    const read = async (_text: string, params: QueryParam[]) => {
      seen.push(params)
      return [{ locked: 1 }]
    }
    await enforceBusinessRules({
      request: jsonReq('PATCH', '/fiveSFindings/6F0C2A1E-3B4D-4C5E-8F60-718293A4B5C6', { isActive: false }),
      body: undefined,
      read,
      caller: MANAGER,
    })
    expect(seen).toEqual([['6f0c2a1e-3b4d-4c5e-8f60-718293a4b5c6']])

    const anonymous = await enforceBusinessRules({
      request: jsonReq('PATCH', FINDING, { isActive: false }),
      body: undefined,
      read: finishedAudit,
      caller: null,
    })
    expect(anonymous?.status).toBe(401)
  })
})
