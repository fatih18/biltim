import { isContentManagerCoreTeam, isSuperAdmin, normalizeRoleName } from "./index";

/**
 * The header's menu decisions, as pure functions (R27).
 *
 * The header kept its own copies of these checks and read role NAMES only. The
 * godmin's power is the `is_god` flag or a role named "godmin": an account that
 * has the flag and no such role lost the Users and master-data menus and, with
 * an extra Auditor role, was treated as an auditor-only account. Going through
 * here, the flag counts wherever the role does.
 */

const fold = (roleNames: readonly string[]): string[] =>
  roleNames.map(normalizeRoleName).filter(Boolean);

/** The "Kullanıcılar" menu: Merkez Ekip, Super Admin and the godmin. */
export function canSeeUsersMenu(roleNames: readonly string[], isGod: boolean): boolean {
  if (isGod) return true;
  const names = fold(roleNames);
  return isSuperAdmin(names) || isContentManagerCoreTeam(names);
}

/** Master data and improvement actions: the above, plus Müdür. */
export function canSeeMasterMenus(roleNames: readonly string[], isGod: boolean): boolean {
  if (isGod) return true;
  const names = fold(roleNames);
  return isSuperAdmin(names) || isContentManagerCoreTeam(names) || names.includes("manager");
}

/**
 * An account whose only 5S role is auditor does not see the findings register.
 * Someone who also holds another privileged role, and the godmin, keep it.
 */
export function isAuditorOnlyAccount(roleNames: readonly string[], isGod: boolean): boolean {
  if (isGod) return false;
  const names = fold(roleNames);
  if (!names.some((n) => n === "auditor" || n === "denetçi")) return false;
  const otherPrivileged =
    isSuperAdmin(names) ||
    isContentManagerCoreTeam(names) ||
    names.includes("manager") ||
    names.includes("field manager");
  return !otherPrivileged;
}
