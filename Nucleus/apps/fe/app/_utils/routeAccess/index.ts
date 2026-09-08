/**
 * Who is allowed on which screen (§6.10).
 *
 * The header already hid some menu entries by role, but hiding a link is not
 * access control: typing the address still opened the page. Nothing stopped a
 * `basic` account from reaching /generic-api, which calls arbitrary endpoints,
 * or /drizzle-tables, which draws the database schema. The backend still
 * refuses the data — every request is checked there — so what a visitor got was
 * an administrator's console full of failed requests. It should not render at
 * all.
 *
 * The rules live here, once, because the menu and the gate agreeing is the
 * whole point: two gates that disagree is a bug, not redundancy.
 */

/** Role names arrive with inconsistent case and spacing; compare them folded. */
export function normalizeRoleName(value: string): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * godmin is the install's own root account and the backend lets it past every
 * claim check. A gate in front of the screens that did NOT would lock the one
 * account that exists to fix things out of the tools for fixing them — which is
 * what happened the first time this shipped: a godmin asking for /generic-api
 * was sent back to the home page.
 */
const isSuperAdmin = (roles: string[]) =>
  roles.includes("super admin") || roles.includes("godmin");

const isContentManagerCoreTeam = (roles: string[]) =>
  roles.some((n) => n.includes("content manager") && n.includes("core team"));

const startsWithAny = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(`${p}/`));

export interface RouteRequirement {
  /** For diagnostics and tests. */
  id: string;
  match: (path: string) => boolean;
  allows: (roles: string[]) => boolean;
}

export const ROUTE_REQUIREMENTS: RouteRequirement[] = [
  {
    /*
     * Developer tooling. /generic-api will call any endpoint the signed-in
     * caller can reach, and /drizzle-tables renders the schema. Neither is a
     * screen a plant auditor has any use for.
     */
    id: "developer-tools",
    match: (p) => startsWithAny(p, ["/generic-api", "/drizzle-tables", "/logs"]),
    allows: isSuperAdmin,
  },
  {
    /** Roles, claims and verification flows change what everyone else may do. */
    id: "authorization-admin",
    match: (p) => startsWithAny(p, ["/claims", "/verifications"]),
    allows: isSuperAdmin,
  },
  {
    /** Mirrors the header's own `canSeeUsersPage`. */
    id: "users",
    match: (p) => startsWithAny(p, ["/users", "/kullanicilar"]),
    allows: (roles) => isSuperAdmin(roles) || isContentManagerCoreTeam(roles),
  },
  {
    /*
     * An account whose ONLY role is auditor does not open the findings
     * register — it is the list of what their own audits produced, and the
     * product decided they see it through the audit instead. Anyone with
     * another privileged role keeps it.
     */
    id: "findings",
    match: (p) => startsWithAny(p, ["/bulgular"]),
    allows: (roles) => {
      const isAuditor = roles.some((n) => n === "auditor" || n === "denetçi");
      if (!isAuditor) return true;
      return roles.some(
        (n) =>
          n === "super admin" ||
          n === "godmin" ||
          n === "manager" ||
          n === "field manager" ||
          (n.includes("content manager") && n.includes("core team")),
      );
    },
  },
  {
    /** Mirrors the header's own `canSeeMasterMenus`. */
    id: "master-data",
    match: (p) => startsWithAny(p, ["/ana-veri-yonetimi", "/iyilestirici-faaliyetler"]),
    allows: (roles) =>
      isSuperAdmin(roles) || isContentManagerCoreTeam(roles) || roles.includes("manager"),
  },
];

/** The rule covering a path, if any. */
export function requirementFor(path: string): RouteRequirement | undefined {
  return ROUTE_REQUIREMENTS.find((r) => r.match(path));
}

/**
 * Whether these roles may open this path. A path no rule covers is open to any
 * signed-in user — the gate restricts, it does not become a second allow-list
 * that silently hides ordinary screens.
 */
export function canAccessRoute(
  path: string,
  roleNames: readonly string[],
  isGod = false,
): boolean {
  // Mirrors the backend, where the god flag bypasses the claim check outright.
  if (isGod) return true;

  const requirement = requirementFor(path);
  if (!requirement) return true;
  return requirement.allows(roleNames.map(normalizeRoleName).filter(Boolean));
}
