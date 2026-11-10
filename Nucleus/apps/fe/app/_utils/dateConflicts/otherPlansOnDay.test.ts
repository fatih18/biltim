import { describe, expect, it } from 'bun:test'
import { otherPlansOnDay, type ConflictPlan } from './index'

const plan = (id: string, over: Partial<ConflictPlan> = {}): ConflictPlan => ({
  id,
  plannedDate: '2026-11-10',
  locationId: 'loc-a',
  teamId: 'team-1',
  status: 'planned',
  ...over,
})

describe('otherPlansOnDay', () => {
  it('leaves out the plan being changed, cancelled plans and other days', () => {
    const plans = [
      plan('p-self'),
      plan('p-cancelled', { status: 'cancelled' }),
      plan('p-next-day', { plannedDate: '2026-11-11' }),
      plan('p-other'),
    ]
    expect(otherPlansOnDay(plans, 'p-self', '2026-11-10').map((p) => p.id)).toEqual(['p-other'])
  })

  it('is empty when the plan being changed is the only one of the day', () => {
    expect(otherPlansOnDay([plan('p-self')], 'p-self', '2026-11-10')).toEqual([])
    expect(otherPlansOnDay([], 'p-self', '2026-11-10')).toEqual([])
  })

  it('keeps every plan of the day when no plan is being changed', () => {
    expect(otherPlansOnDay([plan('p-1'), plan('p-2')], undefined, '2026-11-10')).toHaveLength(2)
  })

  it('counts a timestamp plan date on its day', () => {
    const stamped = plan('p-stamp', { plannedDate: new Date(2026, 10, 10, 0, 0, 0).toISOString() })
    expect(otherPlansOnDay([stamped], 'p-self', '2026-11-10').map((p) => p.id)).toEqual(['p-stamp'])
  })
})
