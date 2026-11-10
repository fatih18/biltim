import { describe, expect, it } from 'bun:test'
import {
  LIST_PAGE_SIZE,
  type Condition,
  type ListRow,
  type PageRequest,
  type PageStarter,
} from '@/app/_utils/readAllPages'
import { loadDayConflicts, loadDayWorld, type DayRequest, type DayStarters } from './dayWorld'

const holds = (row: ListRow, condition: Condition): boolean => {
  const value = row[condition.field]
  const listed = Array.isArray(condition.value) ? condition.value : []
  if (condition.operator === 'in') return listed.includes(String(value))
  if (condition.operator === 'notIn') return !listed.includes(String(value))
  return value === condition.value || String(value) === String(condition.value)
}

/** A table the way nucleus serves it: filtered, sorted by id, 200 rows a page at most. */
function serve(table: ListRow[], seen: PageRequest['payload'][] = []): PageStarter {
  return ({ payload, onAfterHandle }) => {
    seen.push(payload)
    const matching = table
      .filter((row) => (payload.filters ?? []).every((condition) => holds(row, condition)))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    const size = Math.min(payload.limit, LIST_PAGE_SIZE)
    const items = matching.slice((payload.page - 1) * size, payload.page * size)
    onAfterHandle({ data: { data: items, pagination: { hasNext: payload.page * size < matching.length } } })
  }
}

const broken: PageStarter = ({ onErrorHandle }) => onErrorHandle(new Error('refused'))

const plan = (id: string, over: ListRow = {}): ListRow => ({
  id,
  is_active: true,
  planned_date: '2026-11-10',
  location_id: 'loc-a',
  assigned_team_id: 'team-1',
  status: 'planned',
  ...over,
})

const tables = {
  plans: [
    plan('p-self'),
    plan('p-other', { location_id: 'loc-b', assigned_team_id: 'team-2' }),
    plan('p-cancelled', { assigned_team_id: 'team-3', status: 'cancelled' }),
    plan('p-next-day', { planned_date: '2026-11-11', assigned_team_id: 'team-3' }),
  ],
  teams: [
    { id: 'team-1', name: 'Mavi Ekip', leader_user_id: 'u-lider' },
    { id: 'team-2', name: 'Kırmızı Ekip', leader_user_id: 'u-bora' },
    { id: 'team-3', name: 'Yeşil Ekip', leader_user_id: 'u-can' },
  ],
  members: [
    { id: 'm1', team_id: 'team-1', user_id: 'u-ayse', is_active: true },
    { id: 'm2', team_id: 'team-2', user_id: 'u-ayse', is_active: true },
    { id: 'm3', team_id: 'team-3', user_id: 'u-lider', is_active: true },
  ],
  locations: [
    { id: 'loc-a', name: 'Haddehane', field_manager_user_ids: [] },
    { id: 'loc-b', name: 'Çelikhane', field_manager_user_ids: [] },
  ],
  users: [
    { id: 'u-ayse', profile: { first_name: 'Ayşe', last_name: 'Denetçi' } },
    { id: 'u-lider', name: 'Leyla Lider' },
  ],
}

const starters = (over: Partial<DayStarters> = {}, data: typeof tables = tables): DayStarters => ({
  plans: serve(data.plans),
  teams: serve(data.teams),
  members: serve(data.members),
  locations: serve(data.locations),
  users: serve(data.users),
  ...over,
})

const request: DayRequest = { planId: 'p-self', day: '2026-11-10', teamId: 'team-1', locationId: 'loc-a' }

function warningsOf(s: DayStarters, r: DayRequest = request): { warnings: string[] | null; errors: object[] } {
  const out: { warnings: string[] | null; errors: object[] } = { warnings: null, errors: [] }
  loadDayConflicts(s, r, (warnings) => (out.warnings = warnings), (error) => out.errors.push(error))
  return out
}

describe('loadDayConflicts', () => {
  it('names the auditor who is already on another team that day, from the profile name', () => {
    const { warnings } = warningsOf(starters())
    expect(warnings?.some((w) => w.includes('Ayşe Denetçi') && w.includes('"Çelikhane"'))).toBe(true)
  })

  it('asks the server for that day only, without cancelled plans', () => {
    const seen: PageRequest['payload'][] = []
    warningsOf(starters({ plans: serve(tables.plans, seen) }))
    const filters = seen[0]?.filters ?? []
    expect(filters).toContainEqual({ field: 'planned_date', operator: 'eq', value: '2026-11-10' })
    expect(filters).toContainEqual({ field: 'status', operator: 'notIn', value: ['cancelled'] })
  })

  it('sees a clash with a plan past the 200th row of that day: every page of the day is read', () => {
    const crowd = Array.from({ length: 450 }, (_, i) =>
      plan(`a-${String(i).padStart(4, '0')}`, { assigned_team_id: 'team-3' })
    )
    const { warnings } = warningsOf(starters({}, { ...tables, plans: [...crowd, ...tables.plans] }))
    expect(warnings?.some((w) => w.includes('Ayşe Denetçi'))).toBe(true)
  })

  it('reads every page of the members, so an auditor past the 200th row is not lost', () => {
    const crowd = Array.from({ length: 230 }, (_, i) => ({
      id: `a-${String(i).padStart(4, '0')}`,
      team_id: 'team-2',
      user_id: `u-x${i}`,
      is_active: true,
    }))
    const members = [
      ...crowd,
      { id: 'z-last', team_id: 'team-2', user_id: 'u-ayse', is_active: true },
      { id: 'm1', team_id: 'team-1', user_id: 'u-ayse', is_active: true },
    ]
    const { warnings } = warningsOf(starters({}, { ...tables, members }))
    expect(warnings?.some((w) => w.includes('Ayşe Denetçi'))).toBe(true)
  })

  it('does not clash with a cancelled plan, a plan of another day, or itself', () => {
    const alone = {
      ...tables,
      plans: tables.plans.filter((p) => p.id !== 'p-other'),
    }
    expect(warningsOf(starters({}, alone)).warnings).toEqual([])
  })

  it('still warns, with an unknown person, when the names cannot be read', () => {
    const { warnings, errors } = warningsOf(starters({ users: broken }))
    expect(errors).toEqual([])
    expect(warnings?.some((w) => w.includes('bilinmeyen kullanıcı'))).toBe(true)
  })

  it('reports a failed read once, and never answers "no clash" on it', () => {
    const needed: Array<keyof DayStarters> = ['plans', 'teams', 'members', 'locations']
    for (const key of needed) {
      const { warnings, errors } = warningsOf(starters({ [key]: broken }))
      expect(warnings).toBeNull()
      expect(errors).toHaveLength(1)
    }
  })

  it('reports a missing action instead of staying silent', () => {
    const { warnings, errors } = warningsOf(starters({ members: null }))
    expect(warnings).toBeNull()
    expect(errors).toHaveLength(1)
  })

  it('asks nothing when there is no team or no day to check', () => {
    const seen: PageRequest['payload'][] = []
    const s = starters({ plans: serve(tables.plans, seen) })
    expect(warningsOf(s, { ...request, teamId: '' }).warnings).toEqual([])
    expect(warningsOf(s, { ...request, day: '' }).warnings).toEqual([])
    expect(seen).toHaveLength(0)
  })
})

describe('loadDayWorld', () => {
  it('hands over the plans of the day, each carrying that day, with the teams and people around them', () => {
    let days: string[] = []
    let teamIds: string[] = []
    let names: string[] = []
    loadDayWorld(
      starters(),
      request,
      (world) => {
        days = world.plans.map((p) => String(p.plannedDate))
        teamIds = world.teams.map((t) => t.id).sort()
        names = [...world.userNames.values()].sort()
      },
      () => {}
    )
    expect(days).toEqual(['2026-11-10', '2026-11-10'])
    expect(teamIds).toEqual(['team-1', 'team-2'])
    expect(names).toEqual(['Ayşe Denetçi', 'Leyla Lider'])
  })

  it('refuses a day that is not a date', () => {
    const errors: object[] = []
    loadDayWorld(starters(), { ...request, day: 'yarın' }, () => {}, (e) => errors.push(e))
    expect(errors).toHaveLength(1)
  })
})
