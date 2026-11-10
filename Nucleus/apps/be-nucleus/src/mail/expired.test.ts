import { describe, expect, it } from 'bun:test'
import { expiredSql, readExpired } from './expired'
import { eligibleSql } from './queries'
import { mailWorld } from './mailKit'
import { MAIL_EXPIRED_LOOKBACK_DAYS, MAIL_KINDS, MAIL_WINDOW_HOURS } from './types'

/**
 * The statement itself is checked on a real Postgres by the orchestrator; here
 * what can be known without one: which plans it asks for, and that it is the
 * complement of what the pending and failed counts read.
 */

const flat = (text: string) => text.replace(/\s+/g, ' ').trim()

describe('which plans are expired', () => {
  it('looks back 30 days from the same clocks the window uses', () => {
    expect(MAIL_EXPIRED_LOOKBACK_DAYS).toBe(30)
    const invitation = flat(expiredSql('invitation'))
    expect(invitation).toContain("p.created_at < (now() at time zone 'utc') - make_interval(hours => $1::int)")
    expect(invitation).toContain("p.created_at >= (now() at time zone 'utc') - make_interval(days => $2::int)")
    const completion = flat(expiredSql('completion'))
    expect(completion).toContain("coalesce(p.updated_at, p.created_at) < (now() at time zone 'utc') - make_interval(hours => $1::int)")
    expect(completion).toContain("coalesce(p.updated_at, p.created_at) >= (now() at time zone 'utc') - make_interval(days => $2::int)")
  })

  it('asks for a plan that is still what the mail is about and that no worker or sweep has marked', () => {
    const invitation = flat(expiredSql('invitation'))
    expect(invitation).toContain("p.status = 'planned'")
    expect(invitation).toContain('p.invitation_mailed_at is null')
    const completion = flat(expiredSql('completion'))
    expect(completion).toContain("p.status = 'completed'")
    // The sweep sets this marker on an old completion, which is how a "handled" plan stays out of the count.
    expect(completion).toContain('p.completion_mailed_at is null')
  })

  it('never counts a period plan or an inactive plan, like the pending count', () => {
    for (const kind of MAIL_KINDS) {
      const sql = flat(expiredSql(kind))
      expect(sql).toContain('coalesce(p.is_active, true)')
      expect(sql).toContain('p.location_id is not null and p.assigned_team_id is not null')
    }
  })

  it('is the other side of the window: pending reads inside it, expired reads outside it, with the same marker condition', () => {
    for (const kind of MAIL_KINDS) {
      const pending = flat(eligibleSql(kind))
      const expired = flat(expiredSql(kind))
      expect(pending).toContain('>= (now() at time zone')
      expect(expired).toContain('< (now() at time zone')
      for (const shared of [`p.status = '${kind === 'invitation' ? 'planned' : 'completed'}'`, `p.${kind}_mailed_at is null`]) {
        expect(pending).toContain(shared)
        expect(expired).toContain(shared)
      }
    }
  })

  it('does not restrict the attempts: a plan that used them up and then left the window is expired, not lost', () => {
    for (const kind of MAIL_KINDS) {
      expect(expiredSql(kind)).not.toContain('_mail_attempts')
    }
  })
})

describe('readExpired', () => {
  it('counts both kinds in one statement with the window and the look-back as its parameters', async () => {
    const { deps, calls } = mailWorld({
      plans: [],
      backlog: { expired_invitations: '3', expired_completions: 2 },
    })
    expect(await readExpired(deps.sql)).toEqual({ expiredInvitations: 3, expiredCompletions: 2 })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.params).toEqual([MAIL_WINDOW_HOURS, MAIL_EXPIRED_LOOKBACK_DAYS])
    expect(calls[0]?.text).toContain(expiredSql('invitation'))
    expect(calls[0]?.text).toContain(expiredSql('completion'))
    expect(calls[0]?.text).toContain('from main.five_s_audit_plans p')
  })

  it('counts only plans from the moment mail first ran: nothing expires while no plan carries a marker', async () => {
    const { deps, calls } = mailWorld({ plans: [], backlog: { expired_invitations: 0, expired_completions: 0 } })
    await readExpired(deps.sql)
    const text = calls[0]?.text ?? ''
    expect(text).toContain('least(min(invitation_mailed_at), min(completion_mailed_at)) as since')
    expect(text).toContain('cross join live')
    for (const kind of MAIL_KINDS) {
      const sql = expiredSql(kind)
      expect(sql).toContain('live.since is not null')
      expect(sql).toContain(' >= live.since')
    }
  })

  it('reads a missing or broken count as 0', async () => {
    const { deps } = mailWorld({ plans: [], backlog: { expired_invitations: null, expired_completions: 'abc' } })
    expect(await readExpired(deps.sql)).toEqual({ expiredInvitations: 0, expiredCompletions: 0 })
  })
})
