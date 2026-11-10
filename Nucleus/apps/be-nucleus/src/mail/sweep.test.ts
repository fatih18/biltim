import { describe, expect, it } from 'bun:test'
import { PLAN_A, PLAN_B, TEAM_USERS, mailWorld, plan } from './mailKit'
import { runMailTick } from './process'
import { SWEEP_OLD_COMPLETIONS_SQL, sweepOldCompletions } from './queries'

/**
 * Plans completed before the window are marked handled at the start of every
 * pass (the statement itself is checked on a real Postgres by the orchestrator;
 * here the scripted database stands in for the table).
 */

const flat = (text: string) => text.replace(/\s+/g, ' ').trim()

const oldAndNew = () =>
  mailWorld({ plans: [plan(PLAN_A, {}, 'completion', true), plan(PLAN_B, {}, 'completion')], users: TEAM_USERS })

describe('the statement', () => {
  it('marks completed plans whose clock left the window and that carry no marker, and touches nothing else', () => {
    const sql = flat(SWEEP_OLD_COMPLETIONS_SQL)
    expect(sql).toContain("update main.five_s_audit_plans p set completion_mailed_at = (now() at time zone 'utc')")
    expect(sql).toContain("p.status = 'completed' and p.completion_mailed_at is null")
    expect(sql).toContain("coalesce(p.updated_at, p.created_at) < (now() at time zone 'utc') - make_interval(hours => $1::int)")
    // The plan's own clock and the invitation are left alone, and the count is read from the update, not from a second scan.
    expect(sql).not.toContain('updated_at =')
    expect(sql).not.toContain('invitation')
    expect(sql).toContain('select count(*)::int as n from handled')
  })

  it('takes the window as its only parameter and answers how many plans it marked', async () => {
    const { deps, calls } = oldAndNew()
    expect(await sweepOldCompletions(deps.sql)).toBe(1)
    expect(calls[0]?.params).toEqual([48])
    expect(await sweepOldCompletions(deps.sql)).toBe(0)
  })
})

describe('a pass with a provider', () => {
  it('marks the old completed plan before anything is claimed, and mails only the plan completed inside the window', async () => {
    const w = oldAndNew()
    expect(await runMailTick(w.deps)).toMatchObject({ available: true, swept: 1, sent: 1 })
    expect(w.events).toEqual([`sweep:${PLAN_A}`, `claim:${PLAN_B}`, 'send'])
    expect(w.sent).toHaveLength(1)
    expect(w.lines.some((l) => l.includes('48 saatin dışında tamamlanmış 1 plan işlendi sayıldı'))).toBe(true)
  })

  it('is idempotent: the next pass finds nothing to mark and says nothing', async () => {
    const w = oldAndNew()
    await runMailTick(w.deps)
    const lines = w.lines.length
    expect(await runMailTick(w.deps)).toMatchObject({ swept: 0, sent: 0 })
    expect(w.lines).toHaveLength(lines)
  })

  it('keeps an old plan quiet when it is edited later: the marker stays, so refreshing updated_at mails nobody', async () => {
    const w = oldAndNew()
    await runMailTick(w.deps)
    const edited = w.world.plans[0]
    if (edited) edited.old = false
    expect(await runMailTick(w.deps)).toMatchObject({ swept: 0, sent: 0, lost: 0 })
    expect(w.sent).toHaveLength(1)
    expect(w.world.plans[0]?.claimed).toBe(true)
  })

  it('sends nothing when the marking itself fails, rather than mail about an old audit', async () => {
    const w = oldAndNew()
    const failing = {
      ...w.deps,
      sql: async (text: string, params: Parameters<typeof w.deps.sql>[1]) => {
        if (text === SWEEP_OLD_COMPLETIONS_SQL) throw new Error('sweep down')
        return w.deps.sql(text, params)
      },
    }
    await expect(runMailTick(failing)).rejects.toThrow('sweep down')
    expect(w.sent).toEqual([])
    expect(w.world.plans.every((p) => !p.claimed)).toBe(true)
  })
})

describe('a pass without a provider', () => {
  it('marks nothing and reads nothing: the old plans wait for the pass that has a provider', async () => {
    const w = mailWorld({ plans: [plan(PLAN_A, {}, 'completion', true)], users: TEAM_USERS }, { available: false })
    expect(await runMailTick(w.deps)).toMatchObject({ available: false, swept: 0 })
    expect(w.calls).toEqual([])
    expect(w.world.plans[0]?.claimed).toBe(false)
  })
})
