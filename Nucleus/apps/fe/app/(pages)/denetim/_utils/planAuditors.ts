import { foldTr } from "@/app/_utils/textSearch";

/*
 * Who "Denetimi Yapan" offers and who it keeps (customer note "özge ekipte
 * görünmemeli").
 *
 * Root cause: the field holds a TEXT of names ("Ad Soyad, Ad Soyad"). Every
 * edit of the form was saved as a draft — on the server (one draft per plan,
 * shared by the whole team) and in the browser — and the draft kept that text.
 * Opening the plan put the text back verbatim, so a name written once came back
 * for ever: the person who was in the team when the form was first opened, the
 * Merkez Ekip member whose own name was the prefill when she looked at the
 * plan, a stand-in someone added by hand. The menu lists only the team's
 * current members, so such a name sat in the field with no tick to remove it.
 *
 * Rule (pure, tested in planAuditors.test.ts):
 * - the choices and the prefill of a draft or an unsent form are the team's
 *   CURRENT members (leader + active members, names read now) plus the person
 *   who is signed in;
 * - what a draft remembers is kept only for those people; a name that is not
 *   among them is left out and said so (removedAuditorsNotice);
 * - an audit that already exists (sent, rejected or completed) keeps the names
 *   recorded on it: history is never rewritten here.
 */

/** One person the "Denetimi Yapan" menu offers. */
export type AuditorOption = { id: string; name: string };

/** The team columns this reads; the page's own row types fit it. */
export type AuditorTeam = { id: string; leader_user_id?: string | null };

/** The membership columns this reads. */
export type AuditorMembership = { team_id: string; user_id: string; is_active?: boolean | null };

const namesOf = (text: string | null | undefined): string[] =>
  String(text ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** Names compared the Turkish way: "ÖZGE NECCAR" and "Özge Neccar" are one person. */
const sameName = (a: string, b: string): boolean => foldTr(a) === foldTr(b);

/*
 * The plan team's people right now: its leader and its active members, by the
 * names the users list holds today. A member who was removed (is_active off), a
 * person of another team and an id with no name are not offered.
 */
export function buildTeamMemberOptions(
  teamId: string,
  members: readonly AuditorMembership[],
  teams: readonly AuditorTeam[],
  usersById: ReadonlyMap<string, string>,
): AuditorOption[] {
  const ids = new Set<string>();
  const team = teams.find((t) => t.id === teamId);
  if (team?.leader_user_id) ids.add(String(team.leader_user_id));
  for (const m of members) {
    if (!m?.is_active) continue;
    if (String(m.team_id) !== String(teamId)) continue;
    ids.add(String(m.user_id));
  }
  return Array.from(ids)
    .map((id) => ({ id, name: usersById.get(id) ?? "" }))
    .filter((x) => x.name);
}

/*
 * The team's people plus the one who is signed in and doing the audit, who is
 * not always on the team (Merkez Ekip may open any plan). A team with nobody to
 * offer stays empty: the form then asks for the names as plain text.
 */
export function withSignedInAuditor(options: readonly AuditorOption[], signedIn: AuditorOption): AuditorOption[] {
  const out = [...options];
  if (out.length === 0) return out;
  if (!signedIn.id || !signedIn.name.trim()) return out;
  if (out.some((o) => o.id === signedIn.id || sameName(o.name, signedIn.name))) return out;
  return [...out, { id: signedIn.id, name: signedIn.name }];
}

/*
 * The options of an audit that exists already (a correction), plus the people
 * its recorded names point to, so each recorded name has a tick of its own and
 * a name written long ago can still be taken off by hand. Nobody is added to
 * the record: this only widens the menu.
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

/*
 * The ids behind the names in the field, stored next to them in a draft so that
 * a person who was renamed is still found when the draft comes back. `pools`
 * is searched in order: the team first, so a name two accounts share means the
 * team member. A name nobody holds gets no entry and is matched by its text.
 */
export function draftAuditorsOf(auditorName: string, pools: readonly AuditorOption[]): AuditorOption[] {
  const out: AuditorOption[] = [];
  for (const name of namesOf(auditorName)) {
    const hit = pools.find((p) => p.id && sameName(p.name, name));
    if (hit && !out.some((o) => o.id === hit.id)) out.push({ id: hit.id, name: hit.name });
  }
  return out;
}

/*
 * The names of an audit that exists already (sent, rejected, completed), as
 * recorded. Reports and the Excel registers print them from the audit row; the
 * correction form must show the same: history is never rewritten, so nobody is
 * filtered out by who is in the team today.
 */
export function recordedAuditorName(recorded: string | null | undefined): string {
  return String(recorded ?? "");
}

/** What a restored field says, and the names it had to leave out. */
export type SettledAuditors = { auditorName: string; removed: string[] };

/*
 * The field after a DRAFT comes back (never an audit that exists already:
 * recordedAuditorName).
 *
 * - `recordedName`: the text the draft kept; null when it kept none, then the
 *   prefill stands.
 * - `recorded`: the ids the draft stored next to it; drafts of earlier versions
 *   have none and are matched by name.
 * - `allowed`: the team's current people plus the signed-in person
 *   (withSignedInAuditor). Empty means the form has no list to judge by (a team
 *   with nobody to offer, a plain text field): the text is kept as it is.
 *
 * A person found by id comes back under the name the users list holds now. When
 * every name had to go, the prefill (the signed-in person) takes the field.
 */
export function settleAuditors(input: {
  recordedName: string | null | undefined;
  recorded?: readonly AuditorOption[] | null;
  allowed: readonly AuditorOption[];
  prefill: string;
}): SettledAuditors {
  if (input.recordedName === null || input.recordedName === undefined) {
    return { auditorName: input.prefill, removed: [] };
  }
  const text = String(input.recordedName);
  const names = namesOf(text);
  if (input.allowed.length === 0 || names.length === 0) return { auditorName: text, removed: [] };

  const kept: AuditorOption[] = [];
  const removed: string[] = [];
  for (const name of names) {
    const stored = input.recorded?.find((r) => sameName(r.name, name));
    const byId = stored ? input.allowed.find((o) => o.id === stored.id) : undefined;
    const hit = byId ?? input.allowed.find((o) => sameName(o.name, name));
    if (!hit) {
      if (!removed.some((r) => sameName(r, name))) removed.push(name);
      continue;
    }
    if (!kept.some((k) => k.id === hit.id)) kept.push(hit);
  }
  if (kept.length === 0) return { auditorName: input.prefill, removed };
  return { auditorName: kept.map((k) => k.name).join(", "), removed };
}

/*
 * What the person is told when a draft's names were left out: what is wrong,
 * what it means, what to do. Empty when nothing was left out.
 */
export function removedAuditorsNotice(removed: readonly string[]): string {
  if (removed.length === 0) return "";
  return `Taslakta yazılı ${removed.join(", ")} bu planın ekibinde olmadığı için Denetimi Yapan alanından çıkarıldı. Denetime gerçekten katıldıysa "Ekip dışından kişi ekle" ile yeniden ekleyin.`;
}
