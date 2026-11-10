import type { Row, Sql } from '../db'
import { countOf, textOf } from './rows'
import { MAIL_MAX_ATTEMPTS, MAIL_WINDOW_HOURS, type MailKind } from './types'

/**
 * Every statement of the plan mails, taking the database as an argument so a
 * test can answer without one (the orchestrator checks the SQL itself on a
 * real Postgres).
 *
 * The domain tables hold `timestamp` without a zone, written in UTC, so every
 * comparison here is against `now() at time zone 'utc'` and never against a
 * local clock.
 */

const NOW_UTC = `(now() at time zone 'utc')`

type KindSpec = {
  /** The plan status the mail is about. */
  status: string
  /** Set when a worker takes the plan (and stays set once the mail is out). */
  marker: string
  attempts: string
  /** The moment the window is counted from: creation, and for a completion the last change. */
  clock: string
}

/** Column names come from here and from nowhere else; nothing a client sent reaches an identifier. */
const SPEC: Record<MailKind, KindSpec> = {
  invitation: {
    status: 'planned',
    marker: 'invitation_mailed_at',
    attempts: 'invitation_mail_attempts',
    clock: 'p.created_at',
  },
  completion: {
    status: 'completed',
    marker: 'completion_mailed_at',
    attempts: 'completion_mail_attempts',
    // Approving writes `updated_at` (nucleus stamps every write); the plan has no completion column of its own.
    clock: 'coalesce(p.updated_at, p.created_at)',
  },
}

/**
 * A plan a mail is still owed for. `$1` is the window in hours, `$2` the attempt limit.
 * An audit plan has a location and a team; a period plan (a quarter and a date range) has neither and is never mailed.
 * `open` false reads the same plans from the other side: the ones that used their attempts up.
 */
export function eligibleSql(kind: MailKind, open = true): string {
  const s = SPEC[kind]
  return `coalesce(p.is_active, true)
      and p.status = '${s.status}'
      and p.location_id is not null and p.assigned_team_id is not null
      and p.${s.marker} is null
      and p.${s.attempts} ${open ? '<' : '>='} $2
      and ${s.clock} >= ${NOW_UTC} - make_interval(hours => $1::int)`
}

export async function findCandidates(sql: Sql, kind: MailKind, limit: number): Promise<string[]> {
  const rows = await sql(
    `select p.id::text as id from main.five_s_audit_plans p
      where ${eligibleSql(kind)}
      order by p.created_at
      limit $3::int`,
    [MAIL_WINDOW_HOURS, MAIL_MAX_ATTEMPTS, limit]
  )
  return rows.map((row) => textOf(row, 'id')).filter(Boolean)
}

/**
 * Takes the plan before anything is sent: the marker is set by one guarded
 * update, so of two ticks or two processes only one gets a row back. The
 * conditions are the candidate's again, in case the plan changed in between.
 */
export async function claimPlan(sql: Sql, kind: MailKind, planId: string): Promise<boolean> {
  const s = SPEC[kind]
  const rows = await sql(
    `update main.five_s_audit_plans p set ${s.marker} = ${NOW_UTC}
      where p.id::text = $3 and ${eligibleSql(kind)}
  returning p.id::text as id`,
    [MAIL_WINDOW_HOURS, MAIL_MAX_ATTEMPTS, planId]
  )
  return rows.length === 1
}

/** Gives a plan back after a failed send; `countAttempt` false is for "no provider", which is not the plan's fault. Answers the attempts used. */
export async function releasePlan(sql: Sql, kind: MailKind, planId: string, countAttempt: boolean): Promise<number> {
  const s = SPEC[kind]
  const rows = await sql(
    `update main.five_s_audit_plans set ${s.marker} = null, ${s.attempts} = ${s.attempts} + $2::int
      where id::text = $1 and ${s.marker} is not null
  returning ${s.attempts} as attempts`,
    [planId, countAttempt ? 1 : 0]
  )
  return countOf(rows[0], 'attempts')
}

/**
 * The plan with what its mail says: location and its field managers, team,
 * period and, for a finished audit, the audit with its scores. The audit is
 * the plan's own link (`audit_id`) or, failing that, the one that names the
 * plan (`plan_id`); a single finding's carrier row is never an audit.
 */
export async function readPlanMail(sql: Sql, planId: string): Promise<Row | undefined> {
  const rows = await sql(
    `select p.id::text as id, p.title, p.planned_date, p.assigned_team_id::text as team_id, pp.quarter as period_name,
            l.name as location_name, l.field_manager_user_ids,
            t.name as team_name, t.leader_user_id::text as leader_user_id,
            a.id::text as audit_row_id, a.audit_date, a.total_score, a.target_score
       from main.five_s_audit_plans p
       left join main.five_s_audit_plans pp on pp.id = p.parent_plan_id
       left join main.five_s_locations l on l.id = p.location_id
       left join main.five_s_audit_teams t on t.id = p.assigned_team_id
       left join lateral (
         select x.id, x.audit_date, x.total_score, x.target_score
           from main.five_s_audits x
          where (x.id = p.audit_id or x.plan_id = p.id)
            and x.is_active is not false
            and x.source is distinct from 'single_finding'
          order by (x.id = p.audit_id) desc, x.audit_date desc
          limit 1) a on true
      where p.id::text = $1`,
    [planId]
  )
  return rows[0]
}

/** The team's active members (the leader is the team row's own column). */
export async function readTeamMemberIds(sql: Sql, teamId: string): Promise<string[]> {
  const rows = await sql(
    `select m.user_id::text as user_id from main.five_s_audit_team_members m
      where m.team_id::text = $1 and coalesce(m.is_active, true)`,
    [teamId]
  )
  return rows.map((row) => textOf(row, 'user_id')).filter(Boolean)
}

/** Accounts with their name; the address and the on/off switch are the account's own. */
export function readUsers(sql: Sql, ids: string[]): Promise<Row[]> {
  if (ids.length === 0) return Promise.resolve([])
  return sql(
    `select u.id::text as id, u.email, u.is_active, pr.first_name, pr.last_name
       from main.users u left join main.profiles pr on pr.user_id = u.id
      where u.id::text = any($1::text[])`,
    [ids]
  )
}

/**
 * The completion mail's clock is `updated_at`, which any later edit of a plan
 * (its date, say) refreshes, and a plan completed before mail was switched on
 * has no marker at all. So every tick first marks the completed plans that
 * already left the window as HANDLED: `completion_mailed_at` then means
 * "handled, not necessarily mailed". Only plans completed inside the window stay
 * candidates, and editing an old one can no longer mail anybody. `$1` is the
 * window in hours; answers how many plans it marked. Idempotent: a second run
 * finds nothing.
 */
export const SWEEP_OLD_COMPLETIONS_SQL = `with handled as (
  update main.five_s_audit_plans p set completion_mailed_at = ${NOW_UTC}
   where p.status = 'completed' and p.completion_mailed_at is null
     and ${SPEC.completion.clock} < ${NOW_UTC} - make_interval(hours => $1::int)
  returning 1)
select count(*)::int as n from handled`

export async function sweepOldCompletions(sql: Sql): Promise<number> {
  const rows = await sql(SWEEP_OLD_COMPLETIONS_SQL, [MAIL_WINDOW_HOURS])
  return countOf(rows[0], 'n')
}

export type MailBacklog = {
  pendingInvitations: number
  pendingCompletions: number
  failedInvitations: number
  failedCompletions: number
}

/** What the status route reports: plans still owed a mail inside the window, and those that used their attempts up. */
export async function readBacklog(sql: Sql): Promise<MailBacklog> {
  const rows = await sql(
    `select count(*) filter (where ${eligibleSql('invitation')}) as pending_invitations,
            count(*) filter (where ${eligibleSql('completion')}) as pending_completions,
            count(*) filter (where ${eligibleSql('invitation', false)}) as failed_invitations,
            count(*) filter (where ${eligibleSql('completion', false)}) as failed_completions
       from main.five_s_audit_plans p`,
    [MAIL_WINDOW_HOURS, MAIL_MAX_ATTEMPTS]
  )
  const row = rows[0]
  return {
    pendingInvitations: countOf(row, 'pending_invitations'),
    pendingCompletions: countOf(row, 'pending_completions'),
    failedInvitations: countOf(row, 'failed_invitations'),
    failedCompletions: countOf(row, 'failed_completions'),
  }
}
