import { type Row, type Sql, query } from './db'
import type { QueryParam } from './guards/caller'

/**
 * The database stamps the closing date of a finding.
 *
 * Measured once: a finding closed from screen 77 became `closed` and kept an
 * empty `completed_at`, and no finding in the database had the column filled.
 * The reports endpoint averages `completed_at - detected_date` for the "ortalama
 * kapanma süresi" card, so the card could never show a value.
 *
 * Why a trigger and not the screen: nothing closes findings in one place. The
 * findings register, the offline queue replaying its requests and a Saha
 * Sorumlusu calling the API all write the same row, and nucleus offers no hook
 * that may change a body before it is written (onRequest cannot). The stamp
 * sits under all of them. It also needs no column claim: a role without a claim
 * on `completed_at` has the column dropped from its body, the trigger writes it
 * regardless.
 *
 * This used to be finding-closed-at.sql. Deploy runs no SQL (update.sh pulls,
 * builds, restarts), so nobody knew whether an install had it. It is now
 * installed on every start, from this constant, so it cannot be missing from
 * what is deployed. Every statement is safe to repeat.
 *
 * `completed_at` is a DATE. The pools open with timezone=UTC, so a plain
 * `now()::date` would write the PREVIOUS day for a finding closed after 21:00;
 * the date is taken on the plant's calendar (`biltim.local_tz`, default
 * Europe/Istanbul).
 *
 * One statement per entry: the helper below runs them one after the other on
 * one connection, in a transaction, so there is never a moment without the
 * trigger and a failure half way leaves the previous one in place.
 */
export const FINDING_CLOSED_AT_STATEMENTS: readonly string[] = [
  `create or replace function main.five_s_stamp_closed_at()
returns trigger
language plpgsql
as $$
declare
  tz text := coalesce(current_setting('biltim.local_tz', true), 'Europe/Istanbul');
begin
  if new.status = 'closed' then
    -- Closing: stamp today unless the row already carries a date (an imported
    -- historical record keeps its own).
    if new.completed_at is null then
      new.completed_at := (now() at time zone tz)::date;
    end if;
  else
    -- Reopened (or never closed): a closing date would be a lie, clear it.
    new.completed_at := null;
  end if;
  return new;
end;
$$`,
  'drop trigger if exists five_s_findings_closed_at on main.five_s_findings',
  `create trigger five_s_findings_closed_at
  before insert or update of status, completed_at on main.five_s_findings
  for each row
  execute function main.five_s_stamp_closed_at()`,
]

/**
 * Findings closed before the trigger existed: give them the date of the audit
 * log entry that closed them, and ONLY them. A closed finding with no such
 * entry (imported or seeded) gets no invented date; the report already leaves
 * a finding without a date out of its average. Repeatable: it touches only
 * closed rows still without a date.
 *
 * `audit_logs.created_at` is a timestamp without zone holding UTC, so it is
 * read as UTC first and only then moved to the plant's calendar. (The script
 * this came from read it as local time, which put events between 21:00 and
 * 24:00 UTC a day early.)
 *
 * It runs on every start, and the audit log is the largest table there is, so
 * the log is read only for the ids of the findings still waiting (the
 * `entity_id` index serves that), never in full.
 */
export const FINDING_CLOSED_AT_BACKFILL_SQL = `update main.five_s_findings f
   set completed_at = sub.closed_on
  from (
    select a.entity_id,
           min(((a.created_at at time zone 'UTC')
                 at time zone coalesce(current_setting('biltim.local_tz', true), 'Europe/Istanbul'))::date) as closed_on
      from main.audit_logs a
     where a.entity_id in (select w.id from main.five_s_findings w where w.status = 'closed' and w.completed_at is null)
       and a.new_values->>'status' = 'closed'
     group by a.entity_id
  ) sub
 where f.id = sub.entity_id
   and f.status = 'closed'
   and f.completed_at is null
returning f.id`

/** Installs the function and the trigger; hand it the `sql` of `transaction`. */
export async function installFindingClosedAt(sql: Sql): Promise<void> {
  for (const statement of FINDING_CLOSED_AT_STATEMENTS) await sql(statement)
}

/** How many closed findings got a closing date from the audit log. */
export async function backfillFindingClosedAt(
  run: (text: string, params?: QueryParam[]) => Promise<Row[]> = query
): Promise<number> {
  return (await run(FINDING_CLOSED_AT_BACKFILL_SQL)).length
}
