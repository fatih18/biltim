import type { EmailPayload, EmailSendResult } from 'nucleus-core-ts'
import type { Row, Sql } from '../db'
import type { QueryParam } from '../guards/caller'
import { SWEEP_OLD_COMPLETIONS_SQL } from './queries'
import type { MailKind, MailLog, MailRuntime, PlanMailDeps } from './types'

/** A fake database, a fake mail service and a log for the plan mail tests (mail/*.test.ts). */

export const PLAN_A = '6f0c2a4e-1b3d-4c5e-8f7a-9b0c1d2e3f40'
export const PLAN_B = '7a1d3b5f-2c4e-4d6f-9a8b-0c1d2e3f4a51'
export const TEAM = '3c1e5a7b-2d4f-4a6b-9c8d-0e1f2a3b4c5d'
export const LEADER = 'b7d4e2f1-6a5c-4b3d-8e9f-0a1b2c3d4e5f'
export const MEMBER = '11111111-2222-4333-8444-555555555555'
export const FM1 = '66666666-7777-4888-9999-aaaaaaaaaaaa'
export const FM2 = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff'
export const AUDIT = 'dddddddd-1111-4222-8333-444444444444'

export const user = (id: string, email: string | null, first = 'Ayşe', last = 'Kaya', active = true): Row => ({
  id,
  email,
  is_active: active,
  first_name: first,
  last_name: last,
})

/** What `readPlanMail` answers for an audit plan of Haddehane 2. */
export const planRow = (over: Row = {}): Row => ({
  id: PLAN_A,
  title: 'Haddehane 5S denetimi',
  planned_date: new Date(2026, 10, 12),
  team_id: TEAM,
  period_name: '2026 Q4',
  location_name: 'Haddehane 2',
  field_manager_user_ids: [FM1, FM2],
  team_name: 'Ekip A',
  leader_user_id: LEADER,
  audit_row_id: null,
  audit_date: null,
  total_score: null,
  target_score: null,
  ...over,
})

/**
 * `kind` is the mail this plan is due for: a plan that is planned is due an invitation, one that is completed a completion.
 * `old`: the plan's clock (created_at, or updated_at for a completion) is outside the window, so it is never a candidate.
 */
export type FakePlan = { id: string; claimed: boolean; attempts: number; row: Row; kind: MailKind; old: boolean }

export type World = {
  plans: FakePlan[]
  members?: string[]
  users?: Row[]
  findings?: number
  /** The users the status route's caller lookup knows: id -> roles. */
  callers?: Record<string, { god?: boolean; roles: string[] }>
  backlog?: Row
}

export const plan = (id = PLAN_A, row: Row = {}, kind: MailKind = 'invitation', old = false): FakePlan => ({
  id,
  claimed: false,
  attempts: 0,
  row: planRow({ id, ...row }),
  kind,
  old,
})

const kindOf = (text: string): MailKind => (text.includes("p.status = 'completed'") ? 'completion' : 'invitation')

/** Leader, a member and two field managers, all with an address. */
export const TEAM_USERS: Row[] = [
  user(LEADER, 'lider@firma.example', 'Mehmet', 'Demir'),
  user(MEMBER, 'uye@firma.example', 'Ayşe', 'Kaya'),
  user(FM1, 'saha1@firma.example', 'Can', 'Yıldız'),
  user(FM2, 'saha2@firma.example', 'Elif', 'Çelik'),
]

/** One invitation due, its team and its people. */
export const oneDuePlan = (): World => ({ plans: [plan()], members: [MEMBER], users: TEAM_USERS })

export type Call = { text: string; params: QueryParam[] }

/** Answers each statement of queries.ts from `world`, keeping the plans' marker and attempts the way the real updates do. */
export function fakeSql(world: World, events: string[]) {
  const calls: Call[] = []
  const sql: Sql = async (text, params = []) => {
    calls.push({ text, params })
    const planId = String(params.find((p) => typeof p === 'string' && p.length === 36) ?? '')
    const found = world.plans.find((p) => p.id === planId)
    if (text.includes('select is_god from main.users')) {
      const caller = world.callers?.[String(params[0])]
      return caller ? [{ is_god: caller.god === true }] : []
    }
    if (text.includes('from main.user_roles ur')) {
      return (world.callers?.[String(params[0])]?.roles ?? []).map((name) => ({ name }))
    }
    if (text === SWEEP_OLD_COMPLETIONS_SQL) {
      const handled = world.plans.filter((p) => p.kind === 'completion' && p.old && !p.claimed)
      for (const p of handled) {
        p.claimed = true
        events.push(`sweep:${p.id}`)
      }
      return [{ n: handled.length }]
    }
    if (text.includes('count(*) filter')) return [world.backlog ?? {}]
    if (text.includes('select p.id::text as id from main.five_s_audit_plans p')) {
      const limit = Number(params[2])
      const max = Number(params[1])
      const kind = kindOf(text)
      return world.plans
        .filter((p) => p.kind === kind && !p.claimed && !p.old && p.attempts < max)
        .slice(0, limit)
        .map((p) => ({ id: p.id }))
    }
    if (/update main\.five_s_audit_plans p set \w+_mailed_at/.test(text)) {
      if (!found || found.kind !== kindOf(text) || found.claimed || found.old || found.attempts >= Number(params[1])) return []
      found.claimed = true
      events.push(`claim:${found.id}`)
      return [{ id: found.id }]
    }
    if (text.includes('_mailed_at = null')) {
      if (!found?.claimed) return []
      found.claimed = false
      found.attempts += Number(params[1])
      events.push(`release:${found.id}`)
      return [{ attempts: found.attempts }]
    }
    if (text.includes('left join main.five_s_audit_plans pp')) return found ? [found.row] : []
    if (text.includes('from main.five_s_audit_team_members')) return (world.members ?? []).map((user_id) => ({ user_id }))
    if (text.includes('from main.users u left join main.profiles')) {
      const wanted = new Set(Array.isArray(params[0]) ? params[0] : [])
      return (world.users ?? []).filter((u) => wanted.has(String(u.id)))
    }
    if (text.includes('from main.five_s_findings')) return [{ n: world.findings ?? 0 }]
    return []
  }
  return { sql, calls }
}

export type RuntimeOptions = {
  available?: boolean
  provider?: 'azure' | 'gmail' | 'smtp' | null
  sender?: string
  send?: (payload: EmailPayload) => Promise<EmailSendResult>
}

export function fakeRuntime(options: RuntimeOptions, events: string[]) {
  const sent: EmailPayload[] = []
  let available = options.available ?? true
  const runtime: MailRuntime = {
    isEmailAvailable: () => available,
    emailProvider: () => options.provider ?? 'smtp',
    emailSenderAddress: () => options.sender ?? 'denetim@firma.example',
    sendEmail: async (payload) => {
      events.push('send')
      sent.push(payload)
      return options.send ? options.send(payload) : { success: true }
    },
  }
  return { runtime, sent, setAvailable: (value: boolean) => void (available = value) }
}

export function fakeLog() {
  const lines: string[] = []
  const log: MailLog = { info: (line) => void lines.push(line), error: (line) => void lines.push(`HATA ${line}`) }
  return { log, lines }
}

/** Everything one test needs, wired together. `clock.at` is the worker's `now`. */
export function mailWorld(world: World, runtimeOptions: RuntimeOptions = {}) {
  const events: string[] = []
  const db = fakeSql(world, events)
  const mail = fakeRuntime(runtimeOptions, events)
  const logs = fakeLog()
  const clock = { at: Date.UTC(2026, 10, 12, 9, 0, 0) }
  const deps: PlanMailDeps = {
    sql: db.sql,
    runtime: mail.runtime,
    appUrl: 'http://172.26.16.27:3000',
    now: () => clock.at,
    retryAt: new Map<string, number>(),
    log: logs.log,
  }
  return { deps, events, calls: db.calls, sent: mail.sent, setAvailable: mail.setAvailable, lines: logs.lines, clock, world }
}

export const KINDS: MailKind[] = ['invitation', 'completion']
