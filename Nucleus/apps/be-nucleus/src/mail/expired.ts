import type { Sql } from '../db'
import { NOW_UTC, SPEC } from './queries'
import { countOf } from './rows'
import { MAIL_EXPIRED_LOOKBACK_DAYS, MAIL_WINDOW_HOURS, type MailKind } from './types'

/**
 * Plans whose mail window ran out without a mail ("süresi geçen" on the status line).
 *
 * `eligibleSql` counts a plan as pending (inside the window) or, from the other
 * side, as failed (inside the window with every attempt used). A plan that leaves
 * the window between two retries is neither, and with no provider switched on a
 * plan just ages out the same way: nobody was told and nobody will be. This reads
 * those plans, so the status line can say how many mails will never go out.
 *
 * The plan must still be what the mail is about (planned for an invitation,
 * completed for a completion), an audit plan with a location and a team, and its
 * marker must still be empty. A completed plan the sweep marked as handled
 * (`SWEEP_OLD_COMPLETIONS_SQL`) carries a marker and is therefore not counted:
 * once a provider is on, an old completion is "handled", not "expired".
 *
 * `$1` is the window in hours, `$2` the look-back in days. The clock is the one the
 * window uses: `created_at` for an invitation, the last change for a completion.
 */
export function expiredSql(kind: MailKind): string {
  const s = SPEC[kind]
  return `coalesce(p.is_active, true)
      and p.status = '${s.status}'
      and p.location_id is not null and p.assigned_team_id is not null
      and p.${s.marker} is null
      and ${s.clock} < ${NOW_UTC} - make_interval(hours => $1::int)
      and ${s.clock} >= ${NOW_UTC} - make_interval(days => $2::int)
      and live.since is not null and ${s.clock} >= live.since`
}

/**
 * When mail first ran: the earliest marker any plan carries. A plan that aged out BEFORE mail
 * was ever switched on was not "missed" (no mail existed to miss it), so only plans from that
 * moment on can expire; with no marker at all (mail never ran) nothing counts and the status
 * line does not claim missed mails. The first tick after a provider is configured writes the
 * markers (the sweep of old completions, the first invitation), which starts this clock.
 */
const LIVE_SINCE_CTE = `live as (
  select least(min(invitation_mailed_at), min(completion_mailed_at)) as since
    from main.five_s_audit_plans)`

export type MailExpired = {
  expiredInvitations: number
  expiredCompletions: number
}

export async function readExpired(sql: Sql): Promise<MailExpired> {
  const rows = await sql(
    `with ${LIVE_SINCE_CTE}
     select count(*) filter (where ${expiredSql('invitation')}) as expired_invitations,
            count(*) filter (where ${expiredSql('completion')}) as expired_completions
       from main.five_s_audit_plans p cross join live`,
    [MAIL_WINDOW_HOURS, MAIL_EXPIRED_LOOKBACK_DAYS]
  )
  const row = rows[0]
  return {
    expiredInvitations: countOf(row, 'expired_invitations'),
    expiredCompletions: countOf(row, 'expired_completions'),
  }
}
