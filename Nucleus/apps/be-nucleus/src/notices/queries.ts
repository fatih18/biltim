import type { Sql } from '../db'
import type { QueryParam } from '../guards/caller'
import { NOW_UTC, SPEC } from '../mail/queries'
import { textOf } from '../mail/rows'
import { NOTICE_AUDIT_DAYS, NOTICE_SPEC, NOTICE_WINDOW_HOURS, type NoticeKind, type Transaction } from './types'

/**
 * Every statement of the plan notices, taking the database as an argument so a
 * test can answer without one (the orchestrator checks the SQL itself on a real
 * Postgres). The domain tables hold `timestamp` without a zone, written in UTC,
 * so every comparison is against `now() at time zone 'utc'`, never a local clock.
 */

/** The plan's audit exactly as the mail reads it (`readPlanMail`): its own link, else the one that names the plan; never a single finding's carrier row. */
const PLAN_AUDIT_JOIN = `left join lateral (
         select x.audit_date
           from main.five_s_audits x
          where (x.id = p.audit_id or x.plan_id = p.id)
            and x.is_active is not false
            and x.source is distinct from 'single_finding'
          order by (x.id = p.audit_id) desc, x.audit_date desc
          limit 1) a on true`

/** The plan has no notice of this kind yet. The type is in the test so the lookup runs on `notifications_type_idx`. */
const NOT_YET_TOLD = (kind: NoticeKind): string =>
  `not exists (select 1 from main.notifications n
                where n.type = '${NOTICE_SPEC[kind].type}' and n.source = '${NOTICE_SPEC[kind].sourcePrefix}' || p.id::text)`

/**
 * Plans a notice is still owed for, oldest first.
 *
 *  - created: a planned audit plan (a location and a team; a period plan has neither) created inside the window;
 *  - completed: an audit plan completed inside the window (its last change; approving writes `updated_at`) whose
 *    audit is also recent: the audit's day, or the plan's own day when it has no audit row, is inside `NOTICE_AUDIT_DAYS`.
 *
 * Plans that already have a notice are left out here, so the batch is never used up by plans that are done.
 * `created` takes `$1` window hours and `$2` limit; `completed` takes `$1` window hours, `$2` audit days and `$3` limit.
 */
export function candidatesSql(kind: NoticeKind): string {
  const s = SPEC[NOTICE_SPEC[kind].mailKind]
  const common = `coalesce(p.is_active, true)
      and p.status = '${s.status}'
      and p.location_id is not null and p.assigned_team_id is not null
      and ${s.clock} >= ${NOW_UTC} - make_interval(hours => $1::int)
      and ${NOT_YET_TOLD(kind)}`
  if (kind === 'created') {
    return `select p.id::text as id from main.five_s_audit_plans p
      where ${common}
      order by p.created_at
      limit $2::int`
  }
  return `select p.id::text as id from main.five_s_audit_plans p
      ${PLAN_AUDIT_JOIN}
      where ${common}
        and coalesce(a.audit_date, p.planned_date::timestamp) >= ${NOW_UTC} - make_interval(days => $2::int)
      order by ${s.clock}
      limit $3::int`
}

export async function findNoticeCandidates(sql: Sql, kind: NoticeKind, limit: number): Promise<string[]> {
  const params: QueryParam[] = kind === 'created' ? [NOTICE_WINDOW_HOURS, limit] : [NOTICE_WINDOW_HOURS, NOTICE_AUDIT_DAYS, limit]
  const rows = await sql(candidatesSql(kind), params)
  return rows.map((row) => textOf(row, 'id')).filter(Boolean)
}

/** Serialises writers of one plan event across processes: the lock is held until the transaction ends. */
export const LOCK_NOTICE_SQL = `select pg_advisory_xact_lock(hashtext($1::text))`

/**
 * One notification per recipient, and only for a recipient that has none with this `source` yet: a restart, a second
 * tick and a second backend find the rows and add nothing. No entity_name / entity_id: the bell opens
 * `/<entity_name>s/<entity_id>` for a notification that carries both, and no such page exists for a plan.
 * `created_by` is null: the system wrote it. `$1` the user ids, `$2` title, `$3` body, `$4` type, `$5` source.
 */
export const INSERT_NOTICES_SQL = `insert into main.notifications (user_id, title, body, type, source, is_seen, created_by)
select r::uuid, $2::text, $3::text, $4::text, $5::text, false, null::uuid
  from unnest($1::text[]) as r
 where not exists (select 1 from main.notifications n where n.user_id = r::uuid and n.source = $5::text)
returning user_id::text as user_id`

export type NoticeRows = { recipients: string[]; title: string; body: string; type: string; source: string }

/** Writes the plan event's notifications in one transaction, under the event's lock; answers how many rows were added. */
export function writeNotices(transaction: Transaction, rows: NoticeRows): Promise<number> {
  return transaction(async (sql) => {
    await sql(LOCK_NOTICE_SQL, [rows.source])
    const added = await sql(INSERT_NOTICES_SQL, [rows.recipients, rows.title, rows.body, rows.type, rows.source])
    return added.length
  })
}
