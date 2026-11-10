import { describe, expect, it } from 'bun:test'
import {
  canApprovePlan,
  isPlanRejected,
  rowActionsFor,
  type RowActionPerson as Person,
  type RowActionPlan as Plan,
} from './index'

/*
 * What a row of the home page's audit list offers, per person and per status
 * (R30). The page asks rowActionsFor, the function tested here, for every
 * button; the list shows a button only where the answer is true, so nobody is
 * offered one the server would refuse.
 */

const admin: Person = { isAdmin: true, myTeamIds: [] }
const team: Person = { isAdmin: false, myTeamIds: ['team-1'] }
const adminOnTeam: Person = { isAdmin: true, myTeamIds: ['team-1'] }
const other: Person = { isAdmin: false, myTeamIds: ['team-9'] }
const nobody: Person = { isAdmin: false, myTeamIds: [] }

/** The row's buttons, and whether the reason note shows (it does, to every viewer of a rejected plan). */
function offered(plan: Plan, person: Person) {
  return { ...rowActionsFor(plan, person), note: isPlanRejected(plan.status) }
}

const sent: Plan = { status: 'pending_approval', auditId: 'audit-1', teamId: 'team-1' }
const rejected: Plan = { status: 'rejected', auditId: 'audit-1', teamId: 'team-1' }

describe('a sent audit (pending_approval)', () => {
  it('offers an admin Onayla and Reddet, and no way back into the form', () => {
    expect(offered(sent, admin)).toEqual({ approve: true, reject: true, correct: false, note: false })
    expect(offered(sent, adminOnTeam)).toEqual({ approve: true, reject: true, correct: false, note: false })
  })

  it('offers the plan team nothing: it has sent its audit and waits', () => {
    expect(offered(sent, team)).toEqual({ approve: false, reject: false, correct: false, note: false })
  })

  it('offers anyone else nothing', () => {
    expect(offered(sent, other)).toEqual({ approve: false, reject: false, correct: false, note: false })
    expect(offered(sent, nobody)).toEqual({ approve: false, reject: false, correct: false, note: false })
  })
})

describe('a rejected audit', () => {
  it('offers an admin the correction and the reason, but not Onayla or Reddet again', () => {
    expect(offered(rejected, admin)).toEqual({ approve: false, reject: false, correct: true, note: true })
  })

  it('offers the plan team the correction and the reason', () => {
    expect(offered(rejected, team)).toEqual({ approve: false, reject: false, correct: true, note: true })
  })

  it('shows anyone else the reason only: another team may not write into it', () => {
    expect(offered(rejected, other)).toEqual({ approve: false, reject: false, correct: false, note: true })
    expect(offered(rejected, nobody)).toEqual({ approve: false, reject: false, correct: false, note: true })
  })

  it('offers nobody the correction when the plan has no audit to correct', () => {
    const empty: Plan = { ...rejected, auditId: null }
    expect(offered(empty, admin).correct).toBe(false)
    expect(offered(empty, team).correct).toBe(false)
  })

  it('compares the team ids folded, as the server does', () => {
    expect(offered({ ...rejected, teamId: 'TEAM-1' }, team).correct).toBe(true)
  })
})

describe('canApprovePlan', () => {
  it('is an admin on a sent audit and nobody else', () => {
    expect(canApprovePlan({ status: 'pending_approval', isAdmin: true })).toBe(true)
    expect(canApprovePlan({ status: 'pending_approval', isAdmin: false })).toBe(false)
  })

  it('is not offered on any other status', () => {
    for (const status of ['planned', 'rejected', 'completed', 'cancelled', '']) {
      expect(canApprovePlan({ status, isAdmin: true })).toBe(false)
    }
  })
})
