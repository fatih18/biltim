import { describe, expect, it } from 'bun:test'
import {
  PLAN_GONE_NOTICE,
  PLAN_NOT_YOUR_TEAM_NOTICE,
  PLAN_OWN_LOCATION_NOTICE,
  PLAN_QUEUED_NOTICE,
  type PlanChoiceInput,
  choosePlan,
  pickIntro,
} from './planChoice'

type Plan = { id: string; location_id: string; assigned_team_id: string }

const plan = (id: string, locationId: string, teamId: string): Plan => ({
  id,
  location_id: locationId,
  assigned_team_id: teamId,
})

/** koray's world: his own team T1 audits L-OWN (his region); T2 audits L-B; T3 audits L-C. */
const P_OWN = plan('p-own', 'L-OWN', 'T1')
const P_B = plan('p-b', 'L-B', 'T2')
const P_C = plan('p-c', 'L-C', 'T3')
const PLANS = [P_OWN, P_B, P_C]

const input = (over: Partial<PlanChoiceInput<Plan>> = {}): PlanChoiceInput<Plan> => ({
  plans: PLANS,
  queuedPlanIds: new Set(),
  isOnTeam: (teamId) => teamId === 'T1',
  isFieldManagerOf: (p) => p.location_id === 'L-OWN',
  seesEveryPlan: false,
  mayStartOwnLocation: false,
  requestedPlanId: null,
  ...over,
})

const MERKEZ = { seesEveryPlan: true, mayStartOwnLocation: true }

describe('the clicked plan wins (R71)', () => {
  it('opens the clicked plan for a Merkez Ekip user who is a field manager and sits on another team', () => {
    // The reported case: koray clicks p-b and used to get p-own, his own region.
    const result = choosePlan(input({ ...MERKEZ, requestedPlanId: 'p-b' }))
    expect(result).toEqual({ kind: 'open', plan: P_B, notice: null })
  })

  it('opens the clicked plan even when it is at the location he is field manager of', () => {
    const result = choosePlan(input({ ...MERKEZ, requestedPlanId: 'p-own' }))
    expect(result.kind).toBe('open')
    if (result.kind === 'open') expect(result.plan.location_id).toBe('L-OWN')
  })

  it('opens whichever plan was clicked, not the first one in the list', () => {
    for (const p of PLANS) {
      const result = choosePlan(input({ ...MERKEZ, requestedPlanId: p.id }))
      expect(result).toEqual({ kind: 'open', plan: p, notice: null })
    }
  })

  it('matches the id without caring about case or spaces', () => {
    const result = choosePlan(input({ ...MERKEZ, requestedPlanId: '  P-B ' }))
    expect(result).toEqual({ kind: 'open', plan: P_B, notice: null })
  })

  it('opens the clicked plan for the godmin, who sits on no team', () => {
    const result = choosePlan(input({ ...MERKEZ, isOnTeam: () => false, requestedPlanId: 'p-c' }))
    expect(result).toEqual({ kind: 'open', plan: P_C, notice: null })
  })

  it('lists every plan, his own team first, when nothing was clicked', () => {
    const result = choosePlan(input({ ...MERKEZ }))
    expect(result.kind).toBe('pick')
    if (result.kind === 'pick') {
      expect(result.plans.map((p) => p.id)).toEqual(['p-own', 'p-b', 'p-c'])
      expect(result.scope).toBe('all')
    }
  })

  it('puts his own team first even when the server sends it last', () => {
    const result = choosePlan(input({ ...MERKEZ, plans: [P_B, P_C, P_OWN] }))
    if (result.kind !== 'pick') throw new Error('expected a list')
    expect(result.plans.map((p) => p.id)).toEqual(['p-own', 'p-b', 'p-c'])
  })

  it('lists every plan with its own wording when he is on no team', () => {
    const result = choosePlan(input({ ...MERKEZ, isOnTeam: () => false }))
    if (result.kind !== 'pick') throw new Error('expected a list')
    expect(result.scope).toBe('all-no-team')
    expect(result.plans).toHaveLength(3)
  })

  it('lists the only plan there is instead of opening it (R16: an audit starts only on purpose)', () => {
    const result = choosePlan(input({ ...MERKEZ, plans: [P_B] }))
    expect(result).toEqual({ kind: 'pick', plans: [P_B], scope: 'all-no-team', notice: null })
  })
})

describe('Müdür, auditors and field managers', () => {
  it('an auditor sees only their own team; a lone plan is listed, never opened by itself (R16)', () => {
    const result = choosePlan(input({ isFieldManagerOf: () => false }))
    expect(result).toEqual({ kind: 'pick', plans: [P_OWN], scope: 'own-team', notice: null })
  })

  it('an auditor who clicks another team’s plan is told so and is NOT given a plan of their own', () => {
    const result = choosePlan(input({ isFieldManagerOf: () => false, requestedPlanId: 'p-b' }))
    expect(result).toEqual({ kind: 'pick', plans: [P_OWN], scope: 'own-team', notice: PLAN_NOT_YOUR_TEAM_NOTICE })
  })

  it('an auditor with no plan of their own gets nothing, and the reason when they clicked one', () => {
    const result = choosePlan(input({ isOnTeam: () => false, requestedPlanId: 'p-b' }))
    expect(result).toEqual({ kind: 'none', notice: PLAN_NOT_YOUR_TEAM_NOTICE })
    expect(choosePlan(input({ isOnTeam: () => false }))).toEqual({ kind: 'none', notice: null })
  })

  it('an auditor with several plans of their own picks among them only', () => {
    const second = plan('p-own-2', 'L-D', 'T1')
    const result = choosePlan(input({ plans: [P_B, second, P_C], isFieldManagerOf: () => false }))
    expect(result).toEqual({ kind: 'pick', plans: [second], scope: 'own-team', notice: null })
    const both = choosePlan(input({ plans: [P_B, second, plan('p-own-3', 'L-E', 'T1')], isFieldManagerOf: () => false }))
    if (both.kind !== 'pick') throw new Error('expected a list')
    expect(both.plans.map((p) => p.id)).toEqual(['p-own-2', 'p-own-3'])
    expect(both.scope).toBe('own-team')
  })

  it('a field manager who is also an auditor cannot start their own location (#27)', () => {
    const result = choosePlan(input({ requestedPlanId: 'p-own' }))
    expect(result).toEqual({ kind: 'none', notice: PLAN_OWN_LOCATION_NOTICE })
  })

  it('a Müdür who is field manager sees every plan but their own location’s', () => {
    const result = choosePlan(input({ seesEveryPlan: true, mayStartOwnLocation: false }))
    if (result.kind !== 'pick') throw new Error('expected a list')
    expect(result.plans.map((p) => p.id)).toEqual(['p-b', 'p-c'])
    expect(result.scope).toBe('all-no-team')
    const clicked = choosePlan(input({ seesEveryPlan: true, mayStartOwnLocation: false, requestedPlanId: 'p-own' }))
    expect(clicked.kind).toBe('pick')
    expect(clicked.notice).toBe(PLAN_OWN_LOCATION_NOTICE)
  })

  it('a Müdür clicking an ordinary plan opens it', () => {
    const result = choosePlan(input({ seesEveryPlan: true, requestedPlanId: 'p-c' }))
    expect(result).toEqual({ kind: 'open', plan: P_C, notice: null })
  })
})

describe('a plan that cannot be opened is explained, never swapped', () => {
  it('says so when the plan is no longer open', () => {
    const result = choosePlan(input({ ...MERKEZ, requestedPlanId: 'p-gone' }))
    if (result.kind !== 'pick') throw new Error('expected a list')
    expect(result.notice).toBe(PLAN_GONE_NOTICE)
    expect(result.plans).toHaveLength(3)
  })

  it('says so when the audit waits in this device’s queue', () => {
    const result = choosePlan(input({ ...MERKEZ, queuedPlanIds: new Set(['p-b']), requestedPlanId: 'p-b' }))
    if (result.kind !== 'pick') throw new Error('expected a list')
    expect(result.notice).toBe(PLAN_QUEUED_NOTICE)
    expect(result.plans.map((p) => p.id)).toEqual(['p-own', 'p-c'])
  })

  it('never opens a different plan on its own after a failed click, even with one left', () => {
    const result = choosePlan(input({ ...MERKEZ, plans: [P_OWN], requestedPlanId: 'p-gone' }))
    expect(result).toEqual({ kind: 'pick', plans: [P_OWN], scope: 'all', notice: PLAN_GONE_NOTICE })
  })

  it('has nothing to offer when no plan is open at all', () => {
    expect(choosePlan(input({ ...MERKEZ, plans: [] }))).toEqual({ kind: 'none', notice: null })
    expect(choosePlan(input({ ...MERKEZ, plans: [], requestedPlanId: 'p-b' }))).toEqual({
      kind: 'none',
      notice: PLAN_GONE_NOTICE,
    })
  })

  it('leaves queued plans out of every list', () => {
    const result = choosePlan(input({ ...MERKEZ, queuedPlanIds: new Set(['p-own']) }))
    if (result.kind !== 'pick') throw new Error('expected a list')
    expect(result.plans.map((p) => p.id)).toEqual(['p-b', 'p-c'])
  })
})

describe('pickIntro', () => {
  it('has a distinct sentence for each list', () => {
    const sentences = new Set([pickIntro('own-team'), pickIntro('all'), pickIntro('all-no-team')])
    expect(sentences.size).toBe(3)
  })
})
