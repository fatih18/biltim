import { type Row, query } from './db'

type Run = (text: string, params?: unknown[]) => Promise<Row[]>

/**
 * Every account flagged `users.is_god` also holds the `godmin` role (R27).
 *
 * The app's own checks (`callerById`, `isCentral`, `isAdmin`) count the godmin
 * through the flag OR the role, but nucleus's generic CRUD — POST /fiveSAudits
 * and POST /fiveSFindings, the carrier row and the finding of a plan-less
 * single finding included — reads the role only: `userRoles.some(isGodminRole)`
 * bypasses the claim check, and an account with no role at all is refused with
 * "User has no roles assigned". An account that carried the flag without the
 * role could therefore do everything in the screens' eyes and still be answered
 * 403 by the table routes, which Merkez Ekip (a plain role with claims) is not.
 *
 * nucleus keeps the two in step itself when the role is assigned through its
 * own /user_roles route. This closes the gap for a flag set any other way, on
 * every boot, and touches only accounts still missing the grant. An account that
 * already has a row for the role, active or not, is left alone: an inactive row
 * is somebody's deliberate switch-off, and a second row would collide with it.
 */
export const GODMIN_ROLE_GRANT_SQL = `insert into main.user_roles (user_id, role_id)
  select u.id, r.id
    from main.users u
    join main.roles r on r.name = 'godmin'
   where u.is_god = true
     and not exists (select 1 from main.user_roles ur where ur.user_id = u.id and ur.role_id = r.id)
  returning user_id`

/** The ids of the accounts that were given the role. */
export async function grantGodminRole(run: Run = query): Promise<string[]> {
  const rows = await run(GODMIN_ROLE_GRANT_SQL)
  return rows.map((row) => String(row.user_id))
}

/**
 * The boot log line for a grant: the role reaches every flagged account that
 * lacked it, so the log names exactly which accounts were widened.
 */
export function godminGrantLog(userIds: string[]): string {
  return `[boot] ${userIds.length} godmin hesabına godmin rolü verildi: ${userIds.join(', ')}`
}
