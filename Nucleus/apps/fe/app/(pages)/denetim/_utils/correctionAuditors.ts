import {
  buildTeamMemberOptions,
  namesOf,
  sameName,
  type AuditorMembership,
  type AuditorOption,
  type AuditorTeam,
} from "./planAuditors";

/*
 * "Denetimi Yapan" of an audit that exists already (sent, rejected, completed)
 * and is opened for a correction. History is never rewritten here: reports and
 * the Excel registers print the names from the audit row, so the form shows
 * the same text, whoever is on the team today. Only the menu is widened, so a
 * recorded name that is no longer on the team still has a tick and can be taken
 * off by hand. Nobody is added to the record.
 */

/** The names of an audit as recorded; an audit with none reads as an empty field. */
export function recordedAuditorName(recorded: string | null | undefined): string {
  return String(recorded ?? "");
}

/*
 * The options of a correction plus the people its recorded names point to.
 * A name nobody holds gets no option and stays in the text as it is.
 */
export function withNamedAuditors(
  options: readonly AuditorOption[],
  recordedName: string | null | undefined,
  candidates: readonly AuditorOption[],
): AuditorOption[] {
  const out = [...options];
  if (out.length === 0) return out;
  for (const name of namesOf(recordedName)) {
    if (out.some((o) => sameName(o.name, name))) continue;
    const hit = candidates.find((c) => c.id && sameName(c.name, name));
    if (hit) out.push({ id: hit.id, name: hit.name });
  }
  return out;
}

/** What the correction form shows: the menu (null: leave it as it is) and the field. */
export type CorrectionAuditors = { options: AuditorOption[] | null; auditorName: string };

/*
 * `teamId` is the plan's team; null when the audit has no plan to read, then the
 * menu is left alone. The signed-in person is not offered: whoever corrects an
 * audit does not become one of its auditors by opening it.
 */
export function correctionAuditors(input: {
  teamId: string | null;
  members: readonly AuditorMembership[];
  teams: readonly AuditorTeam[];
  usersById: ReadonlyMap<string, string>;
  recordedName: string | null | undefined;
}): CorrectionAuditors {
  const auditorName = recordedAuditorName(input.recordedName);
  if (input.teamId === null) return { options: null, auditorName };
  const team = buildTeamMemberOptions(input.teamId, input.members, input.teams, input.usersById);
  const everyone = [...input.usersById].map(([id, name]) => ({ id, name }));
  return { options: withNamedAuditors(team, input.recordedName, everyone), auditorName };
}
