import { describe, expect, it } from 'bun:test'
import type { Sql } from '../db'
import { MAIL_WINDOW_HOURS } from '../mail/types'
import { INSERT_NOTICES_SQL, LOCK_NOTICE_SQL, candidatesSql, findNoticeCandidates, writeNotices } from './queries'
import { noticeWorld, plan } from './noticeKit'
import { NOTICE_AUDIT_DAYS, NOTICE_KINDS, NOTICE_SPEC, NOTICE_WINDOW_HOURS } from './types'

/** The highest `$n` a statement names, and whether every number below it is named: what the driver checks against the parameters it is given. */
function placeholders(text: string): { max: number; gaps: number[] } {
  const used = new Set([...text.matchAll(/\$(\d+)/g)].map((m) => Number(m[1])))
  const max = Math.max(0, ...used)
  return { max, gaps: Array.from({ length: max }, (_, i) => i + 1).filter((n) => !used.has(n)) }
}

describe('the windows', () => {
  it('are 48 hours (the mail’s window) and 14 days', () => {
    expect(NOTICE_WINDOW_HOURS).toBe(48)
    expect(NOTICE_WINDOW_HOURS).toBe(MAIL_WINDOW_HOURS)
    expect(NOTICE_AUDIT_DAYS).toBe(14)
  })

  it('a created plan is a candidate only while its creation is inside the 48 hours', () => {
    const sql = candidatesSql('created')
    expect(sql).toContain("p.status = 'planned'")
    expect(sql).toContain("p.created_at >= (now() at time zone 'utc') - make_interval(hours => $1::int)")
    expect(sql).not.toContain('five_s_audits')
  })

  it('a completed plan needs its last change inside the 48 hours AND its audit inside the 14 days', () => {
    const sql = candidatesSql('completed')
    expect(sql).toContain("p.status = 'completed'")
    expect(sql).toContain("coalesce(p.updated_at, p.created_at) >= (now() at time zone 'utc') - make_interval(hours => $1::int)")
    expect(sql).toContain("coalesce(a.audit_date, p.planned_date::timestamp) >= (now() at time zone 'utc') - make_interval(days => $2::int)")
  })

  it('reads the plan’s audit the way the mail does, and never a single finding’s carrier row', () => {
    const sql = candidatesSql('completed')
    expect(sql).toContain('(x.id = p.audit_id or x.plan_id = p.id)')
    expect(sql).toContain("x.source is distinct from 'single_finding'")
    expect(sql).toContain('x.is_active is not false')
  })

  it('only audit plans with a location and a team, switched on, ever notify', () => {
    for (const kind of NOTICE_KINDS) {
      const sql = candidatesSql(kind)
      expect(sql).toContain('coalesce(p.is_active, true)')
      expect(sql).toContain('p.location_id is not null and p.assigned_team_id is not null')
    }
  })
})

describe('the candidate statements', () => {
  it('leave out plans that already have a notice, on the type index, so the batch is never used up by finished plans', () => {
    for (const kind of NOTICE_KINDS) {
      const { type, sourcePrefix } = NOTICE_SPEC[kind]
      expect(candidatesSql(kind)).toContain(`n.type = '${type}' and n.source = '${sourcePrefix}' || p.id::text`)
    }
  })

  it('name exactly the parameters they are given', async () => {
    const w = noticeWorld({ plans: [plan()] })
    await findNoticeCandidates(w.sql, 'created', 7)
    await findNoticeCandidates(w.sql, 'completed', 9)
    expect(w.calls.map((c) => c.params)).toEqual([
      [48, 7],
      [48, 14, 9],
    ])
    for (const call of w.calls) expect(placeholders(call.text)).toEqual({ max: call.params.length, gaps: [] })
  })

  it('answer the plan ids, oldest first', async () => {
    const sql: Sql = async () => [{ id: 'a' }, { id: '' }, { id: 'b' }]
    expect(await findNoticeCandidates(sql, 'created', 20)).toEqual(['a', 'b'])
    expect(candidatesSql('created')).toContain('order by p.created_at')
  })
})

describe('the insert', () => {
  it('adds a row per recipient only where that user has none with this source yet', () => {
    expect(INSERT_NOTICES_SQL).toContain('insert into main.notifications (user_id, title, body, type, source, is_seen, created_by)')
    expect(INSERT_NOTICES_SQL).toContain('where not exists (select 1 from main.notifications n where n.user_id = r::uuid and n.source = $5::text)')
    expect(INSERT_NOTICES_SQL).toContain('from unnest($1::text[]) as r')
  })

  it('writes the system as author, unseen, and names its five parameters', () => {
    expect(INSERT_NOTICES_SQL).toContain('false, null::uuid')
    expect(placeholders(INSERT_NOTICES_SQL)).toEqual({ max: 5, gaps: [] })
    expect(placeholders(LOCK_NOTICE_SQL)).toEqual({ max: 1, gaps: [] })
  })

  it('takes the event’s lock first and writes in the same transaction', async () => {
    const w = noticeWorld({ plans: [] })
    const added = await writeNotices(w.transaction, { recipients: ['u1', 'u2'], title: 'T', body: 'B', type: 'plan_created', source: 'plan-created:p1' })
    expect(added).toBe(2)
    expect(w.events).toEqual(['begin', 'lock:plan-created:p1', 'insert:2', 'commit'])
    expect(w.calls.map((c) => c.text)).toEqual([LOCK_NOTICE_SQL, INSERT_NOTICES_SQL])
    expect(w.calls[1]?.params).toEqual([['u1', 'u2'], 'T', 'B', 'plan_created', 'plan-created:p1'])
  })

  it('adds nothing for a user who has the notice', async () => {
    const w = noticeWorld({ plans: [] })
    const rows = { recipients: ['u1'], title: 'T', body: 'B', type: 'plan_created', source: 'plan-created:p1' }
    expect(await writeNotices(w.transaction, rows)).toBe(1)
    expect(await writeNotices(w.transaction, rows)).toBe(0)
    expect(w.notifications).toHaveLength(1)
  })

  it('rolls back, lock and all, when the insert fails', async () => {
    const w = noticeWorld({ plans: [], brokenInsert: 'tablo yok' })
    const rows = { recipients: ['u1'], title: 'T', body: 'B', type: 'plan_created', source: 'plan-created:p1' }
    await expect(writeNotices(w.transaction, rows)).rejects.toThrow('tablo yok')
    expect(w.events).toEqual(['begin', 'lock:plan-created:p1', 'rollback'])
    expect(w.notifications).toEqual([])
  })
})
