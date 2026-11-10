import { describe, expect, it } from 'bun:test'
import type { ListRow, PageStarter } from '@/app/_utils/readAllPages'
import { loadDayConflicts, type DayRequest, type DayStarters } from './dayWorld'

/*
 * After the plans of the day are read, a day with no plan other than the one
 * being changed is answered at once: the teams, members, locations and names
 * are never asked for.
 */

/** One page of rows, whatever is asked, counting how often it is asked. */
function table(rows: ListRow[]): { start: PageStarter; asked: () => number } {
  let count = 0
  return {
    start: ({ onAfterHandle }) => {
      count += 1
      onAfterHandle({ data: { data: rows, pagination: { hasNext: false } } })
    },
    asked: () => count,
  }
}

const plan = (id: string, over: ListRow = {}): ListRow => ({
  id,
  planned_date: '2026-11-10',
  location_id: 'loc-a',
  assigned_team_id: 'team-1',
  status: 'planned',
  ...over,
})

const request: DayRequest = { planId: 'p-self', day: '2026-11-10', teamId: 'team-1', locationId: 'loc-a' }

function run(plans: ListRow[]) {
  const reads = {
    plans: table(plans),
    teams: table([{ id: 'team-1', name: 'Mavi Ekip', leader_user_id: 'u-lider' }]),
    members: table([]),
    locations: table([{ id: 'loc-a', name: 'Haddehane', field_manager_user_ids: [] }]),
    users: table([{ id: 'u-lider', name: 'Leyla Lider' }]),
  }
  const starters: DayStarters = {
    plans: reads.plans.start,
    teams: reads.teams.start,
    members: reads.members.start,
    locations: reads.locations.start,
    users: reads.users.start,
  }
  const out: { warnings: string[] | null; errors: object[] } = { warnings: null, errors: [] }
  loadDayConflicts(starters, request, (warnings) => (out.warnings = warnings), (error) => out.errors.push(error))
  const others = [reads.teams, reads.members, reads.locations, reads.users].map((read) => read.asked())
  return { ...out, plansAsked: reads.plans.asked(), others }
}

describe('loadDayConflicts, a day nobody else is on', () => {
  it('answers with no warnings and reads nothing but the plans when the day has only the plan being changed', () => {
    const result = run([plan('p-self')])
    expect(result.warnings).toEqual([])
    expect(result.errors).toEqual([])
    expect(result.plansAsked).toBe(1)
    expect(result.others).toEqual([0, 0, 0, 0])
  })

  it('does the same when the day has no plan at all', () => {
    const result = run([])
    expect(result.warnings).toEqual([])
    expect(result.others).toEqual([0, 0, 0, 0])
  })

  it('does the same when the only other plan is cancelled', () => {
    const result = run([plan('p-self'), plan('p-cancelled', { status: 'cancelled' })])
    expect(result.warnings).toEqual([])
    expect(result.others).toEqual([0, 0, 0, 0])
  })

  it('goes on to read the teams, members, locations and names when another plan is on that day', () => {
    const result = run([plan('p-self'), plan('p-other', { assigned_team_id: 'team-2', location_id: 'loc-b' })])
    expect(result.errors).toEqual([])
    expect(result.others.slice(0, 3).every((count) => count > 0)).toBe(true)
  })
})
