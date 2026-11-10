import { describe, expect, it } from 'bun:test'
import { PLAN_A, mailWorld, plan } from './mailKit'
import { claimPlan, eligibleSql, findCandidates, readBacklog, releasePlan } from './queries'
import { MAIL_KINDS, MAIL_MAX_ATTEMPTS, MAIL_WINDOW_HOURS } from './types'

/**
 * The statements themselves are checked on a real Postgres by the orchestrator;
 * here what can be known without one: which plans they ask for, with which
 * limits, and that the claim carries the same conditions as the candidate list.
 */

describe('the window and the limits', () => {
  it('are 48 hours and 5 attempts, as decided', () => {
    expect(MAIL_WINDOW_HOURS).toBe(48)
    expect(MAIL_MAX_ATTEMPTS).toBe(5)
  })

  it('make the invitation due for a plan that is still planned, created inside the window and never mailed', () => {
    const sql = eligibleSql('invitation')
    expect(sql).toContain("p.status = 'planned'")
    expect(sql).toContain('p.invitation_mailed_at is null')
    expect(sql).toContain('p.invitation_mail_attempts < $2')
    expect(sql).toContain("p.created_at >= (now() at time zone 'utc') - make_interval(hours => $1::int)")
    expect(sql).toContain('coalesce(p.is_active, true)')
  })

  it('make the completion due for a completed plan whose last change is inside the window', () => {
    const sql = eligibleSql('completion')
    expect(sql).toContain("p.status = 'completed'")
    expect(sql).toContain('p.completion_mailed_at is null')
    expect(sql).toContain("coalesce(p.updated_at, p.created_at) >= (now() at time zone 'utc') - make_interval(hours => $1::int)")
  })

  it('never mail a period plan: both kinds need a location and a team', () => {
    for (const kind of MAIL_KINDS) {
      expect(eligibleSql(kind)).toContain('p.location_id is not null and p.assigned_team_id is not null')
    }
  })

  it('read the plans that used their attempts up from the other side', () => {
    expect(eligibleSql('invitation', false)).toContain('p.invitation_mail_attempts >= $2')
    expect(eligibleSql('completion', false)).toContain('p.completion_mail_attempts >= $2')
  })
})

describe('the statements', () => {
  it('ask for the oldest plans first, inside the window, within the batch', async () => {
    const { deps, calls } = mailWorld({ plans: [plan()] })
    await findCandidates(deps.sql, 'invitation', 7)
    expect(calls[0]?.params).toEqual([48, 5, 7])
    expect(calls[0]?.text).toContain('order by p.created_at')
    expect(calls[0]?.text).toContain(eligibleSql('invitation'))
  })

  it('claim with one update that repeats every condition, so a plan that changed since is not taken', async () => {
    const { deps, calls } = mailWorld({ plans: [plan()] })
    expect(await claimPlan(deps.sql, 'invitation', PLAN_A)).toBe(true)
    const text = calls[0]?.text ?? ''
    expect(text).toContain('update main.five_s_audit_plans p set invitation_mailed_at = (now() at time zone')
    expect(text).toContain(eligibleSql('invitation'))
    expect(text).toContain('returning p.id::text as id')
    expect(calls[0]?.params).toEqual([48, 5, PLAN_A])
    // The marker is the only thing it writes: updated_at, the completion's clock, is left alone.
    expect(text).not.toContain('updated_at =')
  })

  it('claim a plan once: the second claim finds the marker set', async () => {
    const { deps } = mailWorld({ plans: [plan()] })
    expect(await claimPlan(deps.sql, 'invitation', PLAN_A)).toBe(true)
    expect(await claimPlan(deps.sql, 'invitation', PLAN_A)).toBe(false)
  })

  it('release by clearing the marker and counting an attempt only when told to', async () => {
    const { deps, calls } = mailWorld({ plans: [plan(PLAN_A, {}, 'completion')] })
    await claimPlan(deps.sql, 'completion', PLAN_A)
    expect(await releasePlan(deps.sql, 'completion', PLAN_A, true)).toBe(1)
    const text = calls.at(-1)?.text ?? ''
    expect(text).toContain('set completion_mailed_at = null, completion_mail_attempts = completion_mail_attempts + $2::int')
    expect(text).toContain('completion_mailed_at is not null')
    await claimPlan(deps.sql, 'completion', PLAN_A)
    expect(await releasePlan(deps.sql, 'completion', PLAN_A, false)).toBe(1)
  })

  it('count the backlog with the same conditions, from both sides', async () => {
    const { deps, calls } = mailWorld({
      plans: [],
      backlog: { pending_invitations: '2', pending_completions: 1, failed_invitations: '0', failed_completions: '3' },
    })
    expect(await readBacklog(deps.sql)).toEqual({
      pendingInvitations: 2,
      pendingCompletions: 1,
      failedInvitations: 0,
      failedCompletions: 3,
    })
    for (const text of [eligibleSql('invitation'), eligibleSql('completion'), eligibleSql('invitation', false), eligibleSql('completion', false)]) {
      expect(calls[0]?.text).toContain(text)
    }
    expect(calls[0]?.params).toEqual([48, 5])
  })
})
