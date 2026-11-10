import type { Row, Sql } from '../db'
import type { QueryParam } from '../guards/caller'
import { type RejectDeps, rejectPlan } from './planReview'

/** A fake database and a one-call `reject` for the Reddet route's tests (planReview*.test.ts). */

export const PLAN = '6f0c2a4e-1b3d-4c5e-8f7a-9b0c1d2e3f40'
export const TEAM = '3c1e5a7b-2d4f-4a6b-9c8d-0e1f2a3b4c5d'
export const LEADER = 'b7d4e2f1-6a5c-4b3d-8e9f-0a1b2c3d4e5f'
export const MEMBER_A = '11111111-2222-4333-8444-555555555555'
export const MEMBER_B = '66666666-7777-4888-9999-aaaaaaaaaaaa'
export const REASON = 'Kırık raf puanlamasında hata var, düzeltin.'

const USERS: Record<string, { god?: boolean; roles: string[] }> = {
  'u-ce': { roles: ['Content Manager Core Team'] },
  'u-sa': { roles: ['Super Admin'] },
  'u-god': { god: true, roles: [] },
  'u-mgr': { roles: ['Manager'] },
  'u-aud': { roles: ['Auditor'] },
  'u-fm': { roles: ['Field Manager'] },
}

export type World = {
  /** The locked plan row; none = no such plan. */
  plan?: Row
  members?: string[]
  /** What the guarded update answers; empty = the plan was no longer pending. */
  updated?: Row[]
  failInsert?: boolean
}

export const pending = (over: Row = {}): Row => ({
  status: 'pending_approval',
  planned_date: '2026-11-12',
  assigned_team_id: TEAM,
  location_name: 'Haddehane 2',
  leader_user_id: LEADER,
  ...over,
})

/** A database that answers the route's questions, and remembers what it was asked and how the transaction ended. */
export function fakeDb(world: World) {
  const calls: Array<{ text: string; params: QueryParam[] }> = []
  const events: string[] = []
  const sql: Sql = async (text, params = []) => {
    calls.push({ text, params })
    if (text.includes('select is_god from main.users')) {
      const user = USERS[String(params[0])]
      return user ? [{ is_god: user.god === true }] : []
    }
    if (text.includes('from main.user_roles ur')) {
      return (USERS[String(params[0])]?.roles ?? []).map((name) => ({ name }))
    }
    if (text.includes('for update of p')) return world.plan ? [world.plan] : []
    if (text.includes('from main.five_s_audit_team_members')) return (world.members ?? []).map((user_id) => ({ user_id }))
    if (text.includes('update main.five_s_audit_plans')) return world.updated ?? [{ id: PLAN }]
    if (text.includes('insert into main.notifications')) {
      if (world.failInsert) throw new Error('notifications is gone')
      return []
    }
    return []
  }
  const deps: RejectDeps = {
    read: sql,
    transaction: async (work) => {
      events.push('begin')
      try {
        const result = await work(sql)
        events.push('commit')
        return result
      } catch (error) {
        events.push('rollback')
        throw error
      }
    },
  }
  const wrote = () => calls.some((c) => c.text.includes('update main.') || c.text.includes('insert into'))
  return { deps, calls, events, wrote }
}

/** `rest` is `[reason, planId]`; naming a reason as `undefined` is a missing one, not the default. */
export const reject = (userId: string | null, world: World, ...rest: [reason?: string, planId?: string]) => {
  const db = fakeDb(world)
  const reason = rest.length > 0 ? rest[0] : REASON
  return rejectPlan({ planId: rest[1] ?? PLAN, userId, reason }, db.deps).then((outcome) => ({ outcome, ...db }))
}

