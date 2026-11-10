import { describe, expect, it } from 'bun:test'
import { LIST_PAGE_SIZE, type ListRow, type PageRequest, type PageStarter } from '@/app/_utils/readAllPages'
import {
  auditDaysOf,
  auditRangeFilters,
  dayRangeOf,
  nextDay,
  readRepeatSources,
  repeatReadRange,
  type PlanStarter,
  type RepeatFound,
  type TabCondition,
} from './repeatSources'

type Served = { payload: { page: number; limit: number }; onAfterHandle: (response: object) => void }

/** One page of a table the way nucleus serves it: 200 rows at most, whatever `limit` says. */
function respond(rows: ListRow[], { payload, onAfterHandle }: Served): void {
  const size = Math.min(payload.limit, LIST_PAGE_SIZE)
  const page = rows.slice((payload.page - 1) * size, payload.page * size)
  onAfterHandle({ isSuccess: true, data: { data: page, pagination: { hasNext: payload.page * size < rows.length } } })
}

function serve(rows: ListRow[], log: PageRequest['payload'][]): PageStarter {
  return (request) => {
    log.push(request.payload)
    respond(rows, request)
  }
}

type PlanPayload = Parameters<PlanStarter>[0]['payload']

/** The plans table: only the rows whose `audit_id` the request names. */
function servePlans(table: ListRow[], log: PlanPayload[]): PlanStarter {
  return (request) => {
    log.push(request.payload)
    const named = (request.payload.filters ?? []).find((c) => 'field' in c && c.field === 'audit_id')
    const ids = named && 'value' in named && Array.isArray(named.value) ? named.value : []
    respond(
      table.filter((row) => typeof row.audit_id === 'string' && ids.includes(row.audit_id)),
      request
    )
  }
}

const failing: PageStarter & PlanStarter = (request) => request.onErrorHandle({ message: 'Service Unavailable' })

const audit = (id: string, day: string): ListRow => ({ id, audit_date: `${day}T00:00:00.000Z` })
const planOf = (id: string, auditId: string, plannedDate = '2026-08-14'): ListRow => ({
  id,
  audit_id: auditId,
  planned_date: plannedDate,
  status: 'completed',
})

const tabFilters: TabCondition[] = [
  { field: 'is_active', operator: 'eq', value: true },
  { field: 'status', operator: 'in', value: ['completed'] },
  { operator: 'or', value: [{ field: 'assigned_team_id', operator: 'in', value: ['team-1'] }] },
]
const range = { from: '2026-10-01', to: '2026-10-12' }

function read(startAudits: PageStarter, startPlans: PlanStarter, knownAuditIds: string[] = []) {
  const done: RepeatFound[] = []
  const errors: object[] = []
  readRepeatSources({
    startAudits,
    startPlans,
    tabFilters,
    range,
    knownAuditIds,
    onDone: (found) => done.push(found),
    onError: (error) => errors.push(error),
  })
  return { done, errors }
}

describe('dayRangeOf', () => {
  it('is the first and the last day, whatever order and shape the dates come in', () => {
    expect(dayRangeOf(['2026-10-12', '2026-10-01T05:00:00.000Z', '', null, undefined, '2026-10-05'])).toEqual({
      from: '2026-10-01',
      to: '2026-10-12',
    })
  })

  it('is one day for one date, and nothing when no date is a day', () => {
    expect(dayRangeOf(['2026-10-05'])).toEqual({ from: '2026-10-05', to: '2026-10-05' })
    expect(dayRangeOf([])).toBeNull()
    expect(dayRangeOf(['', 'x', null])).toBeNull()
  })
})

describe('nextDay', () => {
  it('steps over month ends, year ends and leap days', () => {
    expect(nextDay('2026-10-08')).toBe('2026-10-09')
    expect(nextDay('2026-10-31')).toBe('2026-11-01')
    expect(nextDay('2026-12-31')).toBe('2027-01-01')
    expect(nextDay('2028-02-28')).toBe('2028-02-29')
    expect(nextDay('2027-02-28')).toBe('2027-03-01')
  })

  it('is empty for what is not a day', () => {
    expect(nextDay('')).toBe('')
    expect(nextDay('08.10.2026')).toBe('')
  })
})

describe('repeatReadRange', () => {
  const loaded = [{ planned_date: '2026-10-12' }, { planned_date: '2026-10-05' }, { planned_date: '2026-10-01' }]

  it('reads nothing when the page holds every plan of the tab', () => {
    expect(repeatReadRange(loaded, 3)).toBeNull()
    expect(repeatReadRange(loaded, 2)).toBeNull()
    expect(repeatReadRange([], 0)).toBeNull()
  })

  it('reads the days of the page when the tab has more plans than the page, or says nothing of its size', () => {
    expect(repeatReadRange(loaded, 120)).toEqual(range)
    expect(repeatReadRange(loaded, null)).toEqual(range)
  })

  it('reads nothing when no plan of the page has a day', () => expect(repeatReadRange([{ planned_date: '' }], 50)).toBeNull())
})

describe('auditRangeFilters', () => {
  it('takes the audits done from the first day up to the end of the last: a timestamp on the last day is inside', () => {
    expect(auditRangeFilters(range)).toEqual([
      { field: 'audit_date', operator: 'gte', value: '2026-10-01' },
      { field: 'audit_date', operator: 'lt', value: '2026-10-13' },
    ])
  })
})

describe('auditDaysOf', () => {
  it('maps audit id to the day it was done, skipping rows without an id or a readable day', () => {
    expect(
      auditDaysOf([
        audit('a', '2026-10-05'),
        { id: 'b', audit_date: null },
        { audit_date: '2026-10-06' },
        { id: 'c', audit_date: 'x' },
      ])
    ).toEqual({ a: '2026-10-05' })
  })
})

describe('readRepeatSources', () => {
  it('reads the audits of the days, then the tab\'s plans of the audits the page lacks', () => {
    const auditLog: PageRequest['payload'][] = []
    const planLog: PlanPayload[] = []
    const audits = [audit('a1', '2026-10-03'), audit('a2', '2026-10-05'), audit('a3', '2026-10-06')]
    const plans = [planOf('p1', 'a1', '2026-10-03'), planOf('p2', 'a2')]
    const { done, errors } = read(serve(audits, auditLog), servePlans(plans, planLog), ['a1'])

    expect(errors).toEqual([])
    expect(done).toHaveLength(1)
    // a1 is on the page already, a3 has no plan this person may see: only p2 is a source.
    expect(done[0]?.plans.map((plan) => plan.id)).toEqual(['p2'])
    expect(done[0]?.auditDays).toEqual({ a2: '2026-10-05' })
    expect(auditLog[0]?.filters).toEqual(auditRangeFilters(range))
    expect(planLog[0]?.filters?.at(-1)).toEqual({ field: 'audit_id', operator: 'in', value: ['a2', 'a3'] })
  })

  it('keeps the tab\'s own conditions on the plans: its status and the person\'s scope', () => {
    const planLog: PlanPayload[] = []
    read(serve([audit('a2', '2026-10-05')], []), servePlans([planOf('p2', 'a2')], planLog))
    expect(planLog[0]?.filters?.slice(0, tabFilters.length)).toEqual(tabFilters)
  })

  it('reads no plans when every audit of the days belongs to the page', () => {
    const planLog: PlanPayload[] = []
    const { done } = read(serve([audit('a1', '2026-10-03')], []), servePlans([], planLog), ['a1'])
    expect(planLog).toEqual([])
    expect(done).toEqual([{ plans: [], auditDays: {} }])
  })

  it('reads every page of the audits, not the first 200', () => {
    const auditLog: PageRequest['payload'][] = []
    const many = Array.from({ length: 450 }, (_, i) => audit(`a${String(i).padStart(3, '0')}`, '2026-10-05'))
    const planLog: PlanPayload[] = []
    const { done } = read(serve(many, auditLog), servePlans([planOf('p449', 'a449')], planLog))
    expect(auditLog.map((request) => request.page)).toEqual([1, 2, 3])
    expect(done[0]?.plans.map((plan) => plan.id)).toEqual(['p449'])
  })

  it('reports a failed audit read once and reads no plans', () => {
    const planLog: PlanPayload[] = []
    const { done, errors } = read(failing, servePlans([], planLog))
    expect(errors).toHaveLength(1)
    expect(done).toEqual([])
    expect(planLog).toEqual([])
  })

  it('reports a failed plan read once and hands nothing on', () => {
    const { done, errors } = read(serve([audit('a2', '2026-10-05')], []), failing)
    expect(errors).toHaveLength(1)
    expect(done).toEqual([])
  })
})
