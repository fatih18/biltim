import { afterAll, describe, expect, it } from 'bun:test'
import type { ListRow } from '@/app/_utils/readAllPages'
import { placeByDay } from './doneDayPlacement'
import { planDates, toPlanRow } from './planRow'

/** Turkey, a zone behind UTC, and two far from it: the day must not move in any of them. */
const ZONES = ['Europe/Istanbul', 'America/Los_Angeles', 'Pacific/Kiritimati', 'UTC']
const original = process.env.TZ

afterAll(() => {
  if (original === undefined) delete process.env.TZ
  else process.env.TZ = original
})

/** The reading the page used to apply: a Date, taken in the browser's zone. */
function localDay(value: string): string {
  const date = new Date(value)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${String(date.getFullYear()).padStart(4, '0')}-${month}-${day}`
}

describe('planDates', () => {
  it('reads the day of an ISO value near midnight UTC the same in every zone', () => {
    for (const zone of ZONES) {
      process.env.TZ = zone
      expect(planDates({ planned_date: '2026-10-08T23:30:00.000Z' }).planned_date).toBe('2026-10-08')
      expect(planDates({ planned_date: '2026-10-09T00:30:00.000Z' }).planned_date).toBe('2026-10-09')
      expect(planDates({ planned_date: '2026-10-08' }).planned_date).toBe('2026-10-08')
    }
  })

  it('is why the string rule is used: a Date in the browser zone moves the same value to the next day', () => {
    process.env.TZ = 'Europe/Istanbul'
    expect(localDay('2026-10-08T23:30:00.000Z')).toBe('2026-10-09')
    expect(planDates({ planned_date: '2026-10-08T23:30:00.000Z' }).planned_date).toBe('2026-10-08')
    process.env.TZ = 'America/Los_Angeles'
    expect(localDay('2026-10-09T00:30:00.000Z')).toBe('2026-10-08')
    expect(planDates({ planned_date: '2026-10-09T00:30:00.000Z' }).planned_date).toBe('2026-10-09')
  })

  it('reads the range days the same way, and leaves an unset end unset', () => {
    process.env.TZ = 'Pacific/Kiritimati'
    expect(planDates({ date_range_start: '2026-10-01T00:00:00.000Z', date_range_end: null })).toEqual({
      planned_date: '',
      date_range_start: '2026-10-01',
      date_range_end: null,
    })
  })

  it('has no planned day for what is not a day, and survives a missing plan', () => {
    expect(planDates({ planned_date: '08.10.2026' }).planned_date).toBe('')
    expect(planDates({}).planned_date).toBe('')
    expect(planDates(null)).toEqual({ planned_date: '', date_range_start: null, date_range_end: null })
    expect(planDates(undefined).date_range_end).toBeNull()
  })
})

describe('the planned day and the done day of the same audit', () => {
  const instant = '2026-10-08T23:30:00.000Z'
  const done = { a: instant }

  it('never disagree: an audit done at the planned instant is listed once, in every zone', () => {
    for (const zone of ZONES) {
      process.env.TZ = zone
      const plan = { id: 'p', audit_id: 'a', planned_date: planDates({ planned_date: instant }).planned_date }
      const entries = placeByDay([plan], done, 'desc')
      expect(entries.map((entry) => entry.kind)).toEqual(['planned'])
      expect(entries[0]).toMatchObject({ day: '2026-10-08', doneDay: null })
    }
  })

  it('would have listed it twice in Turkey, with the planned day read in the browser zone', () => {
    process.env.TZ = 'Europe/Istanbul'
    const plan = { id: 'p', audit_id: 'a', planned_date: localDay(instant) }
    expect(placeByDay([plan], done, 'desc').map((entry) => entry.kind)).toEqual(['planned', 'done'])
  })
})

describe('toPlanRow', () => {
  const row: ListRow = {
    id: 'p1',
    is_active: true,
    created_at: '2026-08-01T08:00:00.000Z',
    updated_at: '2026-08-02T08:00:00.000Z',
    planned_date: '2026-08-14T23:30:00.000Z',
    location_id: 'loc',
    assigned_team_id: 'team',
    status: 'completed',
    audit_id: 'aud',
    date_change_count: 1,
    parent_plan_id: 'parent',
    date_range_start: '2026-07-01',
    date_range_end: '2026-09-30',
    quarter: 'Q3',
    title: 'Temmuz',
  }

  it('types every field and reads the days by the string rule', () => {
    process.env.TZ = 'Europe/Istanbul'
    expect(toPlanRow(row)).toMatchObject({
      id: 'p1',
      is_active: true,
      planned_date: '2026-08-14',
      location_id: 'loc',
      assigned_team_id: 'team',
      status: 'completed',
      audit_id: 'aud',
      date_change_count: 1,
      parent_plan_id: 'parent',
      date_range_start: '2026-07-01',
      date_range_end: '2026-09-30',
      quarter: 'Q3',
      title: 'Temmuz',
    })
  })

  it('falls back to empty values for fields that are missing or of another type', () => {
    const plan = toPlanRow({ id: 'p2', audit_id: 5, date_change_count: '2', quarter: '', is_active: false })
    expect(plan).toMatchObject({
      id: 'p2',
      is_active: false,
      audit_id: null,
      date_change_count: 0,
      quarter: null,
      planned_date: '',
      location_id: '',
    })
  })
})
