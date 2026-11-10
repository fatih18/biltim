import { foldTr } from "@/app/_utils/textSearch";

/*
 * The team a single finding names (R19).
 *
 * The "Ekip" field of the single-finding modal showed "Content Manager Core
 * Team" for anyone on no team: the fallback was the internal name of a ROLE,
 * and the customer read it as a team ("foto 1 de hala ekip başlığı var bu ne
 * demek"). The field now shows the person's real audit teams, or nothing.
 */

/** The team columns this reads; the page's own row types fit it. */
export type TeamLite = {
  id: string;
  name?: string | null;
  leader_user_id?: string | null;
  is_active?: boolean | null;
};

/** The membership columns this reads. */
export type TeamMemberLite = {
  team_id: string;
  user_id: string;
  is_active?: boolean | null;
};

const idKey = (value: string | null | undefined): string => String(value ?? "").trim().toLowerCase();

/*
 * The names of the audit teams a person leads or is an active member of,
 * alphabetical the Turkish way, one entry per name. A deactivated team is not
 * an audit team any more and is left out, as is a team without a name.
 */
export function teamNamesOfUser(
  userId: string | null | undefined,
  teams: readonly TeamLite[],
  members: readonly TeamMemberLite[],
): string[] {
  const me = idKey(userId);
  if (!me) return [];
  const memberOf = new Set(
    members.filter((m) => m.is_active !== false && idKey(m.user_id) === me).map((m) => idKey(m.team_id)),
  );
  const names = new Map<string, string>();
  for (const team of teams) {
    if (team.is_active === false) continue;
    const name = (team.name ?? "").trim();
    if (!name) continue;
    if (idKey(team.leader_user_id) !== me && !memberOf.has(idKey(team.id))) continue;
    names.set(foldTr(name), name);
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b, "tr"));
}

/** What a placeholder dash in a header stands for: no team. */
const NO_TEAM_MARKS = new Set(["", "-", "—"]);

/*
 * The team the single finding carries; "" when there is none, and then the
 * modal shows no "Ekip" field and the description has no "Ekip:" line.
 *
 * Inside an audit it is the plan's own team. On its own it is the person's
 * real teams, joined with ", " — never a role name.
 */
export function singleFindingTeam(input: {
  inAudit: boolean;
  planTeamName: string | null | undefined;
  userTeams: readonly string[];
}): string {
  if (input.inAudit) {
    const plan = (input.planTeamName ?? "").trim();
    return NO_TEAM_MARKS.has(plan) ? "" : plan;
  }
  return input.userTeams.join(", ");
}

/** The description's "Ekip:" line as a list to spread into the lines: empty when there is no team. */
export function teamDescriptionLines(team: string): string[] {
  return team ? [`Ekip: ${team}`] : [];
}

/** The database names of the roles; none of them is ever a team. */
const ROLE_NAMES = new Set([
  "godmin",
  "super admin",
  "content manager core team",
  "manager",
  "field manager",
  "auditor",
  "basic",
]);

/*
 * A finding's description for the screen, without an "Ekip: <role name>" line.
 * Single findings saved before R19 carry one ("Ekip: Content Manager Core
 * Team"); the line is left out where they are read so the role name is not
 * shown as a team, and any other line is untouched. Identifiers: compared
 * plainly, no Turkish folding.
 */
export function withoutRoleAsTeam(description: string | null | undefined): string {
  const text = description ?? "";
  if (!text.includes("Ekip:")) return text;
  return text
    .split("\n")
    .filter((line) => {
      const match = line.trim().match(/^Ekip:\s*(.*)$/);
      return !(match && ROLE_NAMES.has((match[1] ?? "").trim().toLowerCase()));
    })
    .join("\n");
}
