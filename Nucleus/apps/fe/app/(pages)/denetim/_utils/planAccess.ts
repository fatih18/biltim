import { ADMIN_ROLES, CENTRAL_ROLES, hasPrivilege } from '../../../_utils/routeAccess'

/**
 * Who may do what on the audit screen, as role-name lists run through
 * `hasPrivilege` so that the godmin — the `is_god` flag or the role — is always
 * counted (R27). Merkez Ekip and the godmin are the same here wherever the
 * server's own rule (`isCentral`, `isAdmin` in be-nucleus/src/guards/caller.ts)
 * names Merkez Ekip.
 */

/** Everyone who plans, plus the auditor: may raise a single finding outside any audit. */
export const SINGLE_FINDING_ROLES: readonly string[] = [...CENTRAL_ROLES, 'auditor']

export function mayRaiseSingleFinding(roleNames: readonly string[], isGod: boolean): boolean {
  return hasPrivilege(roleNames, SINGLE_FINDING_ROLES, isGod)
}

/** Sees, and can pick from, every planned audit and not only their own team's. */
export function seesEveryPlan(roleNames: readonly string[], isGod: boolean): boolean {
  return hasPrivilege(roleNames, CENTRAL_ROLES, isGod)
}

/**
 * May start the audit of a location they are field manager of. The server's #27
 * refusal exempts exactly these (`isAdmin`); Müdür is held to it.
 */
export function mayStartOwnLocation(roleNames: readonly string[], isGod: boolean): boolean {
  return hasPrivilege(roleNames, ADMIN_ROLES, isGod)
}
