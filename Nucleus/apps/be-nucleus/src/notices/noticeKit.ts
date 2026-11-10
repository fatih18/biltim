import type { Row, Sql } from '../db'
import type { QueryParam } from '../guards/caller'
import { AUDIT, FM1, FM2, PLAN_A, TEAM_USERS, fakeLog, planRow } from '../mail/mailKit'
import { INSERT_NOTICES_SQL, LOCK_NOTICE_SQL } from './queries'
import { NOTICE_SPEC, type NoticeDeps, type NoticeKind, type Transaction } from './types'

/** A fake database for the plan notice tests (notices/*.test.ts): it answers the statements of `queries.ts` and of the mail reads. */

export { AUDIT, FM1, FM2, PLAN_A, TEAM_USERS }

export type FakePlan = { id: string; kind: NoticeKind; row: Row }

export type Notification = { user_id: string; title: string; body: string; type: string; source: string }

export type World = {
  plans: FakePlan[]
  members?: string[]
  users?: Row[]
  findings?: number
  /** A plan id whose read throws. */
  brokenPlan?: string
  /** When set, the candidate query throws this. */
  brokenCandidates?: string
  /** When set, the notification insert throws this. */
  brokenInsert?: string
}

/** A planned plan (`created`), or a completed one with its audit, scores and findings. */
export const plan = (id = PLAN_A, kind: NoticeKind = 'created', row: Row = {}): FakePlan => ({
  id,
  kind,
  row:
    kind === 'created'
      ? planRow({ id, ...row })
      : planRow({
          id,
          audit_row_id: AUDIT,
          audit_date: new Date(2026, 10, 12),
          total_score: '82.5',
          target_score: '75',
          ...row,
        }),
})

export const planId = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const text = (value: QueryParam | undefined): string => (typeof value === 'string' ? value : '')
const texts = (value: QueryParam | undefined): string[] => (Array.isArray(value) ? value : [])

export type Call = { text: string; params: QueryParam[] }

export function noticeWorld(world: World) {
  const events: string[] = []
  const calls: Call[] = []
  const notifications: Notification[] = []

  const sql: Sql = async (statement, params = []) => {
    calls.push({ text: statement, params })
    if (statement.startsWith('select p.id::text as id from main.five_s_audit_plans p')) {
      if (world.brokenCandidates) throw new Error(world.brokenCandidates)
      const kind: NoticeKind = statement.includes("p.status = 'completed'") ? 'completed' : 'created'
      const told = new Set(notifications.map((n) => n.source))
      const limit = Number(params[params.length - 1])
      return world.plans
        .filter((p) => p.kind === kind && !told.has(`${NOTICE_SPEC[kind].sourcePrefix}${p.id}`))
        .slice(0, limit)
        .map((p) => ({ id: p.id }))
    }
    if (statement.includes('left join main.five_s_audit_plans pp')) {
      if (params[0] === world.brokenPlan) throw new Error('plan okunamadı')
      const found = world.plans.find((p) => p.id === params[0])
      return found ? [found.row] : []
    }
    if (statement.includes('from main.five_s_audit_team_members')) return (world.members ?? []).map((user_id) => ({ user_id }))
    if (statement.includes('from main.users u left join main.profiles')) {
      const wanted = new Set(texts(params[0]))
      return (world.users ?? []).filter((u) => wanted.has(String(u.id)))
    }
    if (statement.includes('from main.five_s_findings')) return [{ n: world.findings ?? 0 }]
    if (statement === LOCK_NOTICE_SQL) {
      events.push(`lock:${text(params[0])}`)
      return []
    }
    if (statement === INSERT_NOTICES_SQL) {
      if (world.brokenInsert) throw new Error(world.brokenInsert)
      const [recipients, title, body, type, source] = [texts(params[0]), text(params[1]), text(params[2]), text(params[3]), text(params[4])]
      const added = recipients
        .filter((user_id) => !notifications.some((n) => n.user_id === user_id && n.source === source))
        .map((user_id) => ({ user_id, title, body, type, source }))
      notifications.push(...added)
      events.push(`insert:${added.length}`)
      return added.map((n) => ({ user_id: n.user_id }))
    }
    return []
  }

  const transaction: Transaction = async (work) => {
    events.push('begin')
    try {
      const result = await work(sql)
      events.push('commit')
      return result
    } catch (error) {
      events.push('rollback')
      throw error
    }
  }

  const logs = fakeLog()
  const clock = { at: Date.UTC(2026, 10, 12, 9, 0, 0) }
  const deps: NoticeDeps = { sql, transaction, now: () => clock.at, resting: new Map<string, number>(), log: logs.log }
  return { deps, sql, transaction, events, calls, notifications, lines: logs.lines, clock }
}
