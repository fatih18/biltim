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
 * - what a draft remembers is kept only for those people and for people someone
 *   added by hand (`manual`, the "yedek denetçi" of #29); any other name is left
 *   out and said so (removedAuditorsNotice);
 * - an audit that already exists (sent, rejected or completed) keeps the names
 *   recorded on it: history is never rewritten here (correctionAuditors.ts).
 */

/**
 * One person the "Denetimi Yapan" menu offers. `manual` marks a person someone
 * added by hand from outside the team ("Ekip dışından kişi ekle"): a draft
 * keeps such a person, it does not keep a prefilled or stale name.
 */
export type AuditorOption = { id: string; name: string; manual?: boolean };

/** The team columns this reads; the page's own row types fit it. */
export type AuditorTeam = { id: string; leader_user_id?: string | null };

/** The membership columns this reads. */
export type AuditorMembership = { team_id: string; user_id: string; is_active?: boolean | null };

export const namesOf = (text: string | null | undefined): string[] =>
  String(text ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** Names compared the Turkish way: "ÖZGE NECCAR" and "Özge Neccar" are one person. */
export const sameName = (a: string, b: string): boolean => foldTr(a) === foldTr(b);

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
 * The menu after a draft brought back people added by hand: each gets her tick
 * again, so she can be taken off and the next autosave still knows her. A menu
 * that is empty (the plain text field) stays empty.
 */
export function withManualAuditors(options: readonly AuditorOption[], manual: readonly AuditorOption[]): AuditorOption[] {
  const out = [...options];
  if (out.length === 0) return out;
  for (const m of manual) {
    if (out.some((o) => o.id === m.id || sameName(o.name, m.name))) continue;
    out.push({ id: m.id, name: m.name, manual: true });
  }
  return out;
}

/*
 * The ids behind the names in the field, stored next to them in a draft so that
 * a person who was renamed is still found when the draft comes back. `pools`
 * is searched in order: the team first, so a name two accounts share means the
 * team member. A name nobody holds gets no entry and is matched by its text. A
 * person added by hand keeps her `manual` mark, so the next restore keeps her.
 */
export function draftAuditorsOf(auditorName: string, pools: readonly AuditorOption[]): AuditorOption[] {
  const out: AuditorOption[] = [];
  for (const name of namesOf(auditorName)) {
    const hit = pools.find((p) => p.id && sameName(p.name, name));
    if (!hit || out.some((o) => o.id === hit.id)) continue;
    out.push(hit.manual ? { id: hit.id, name: hit.name, manual: true } : { id: hit.id, name: hit.name });
  }
  return out;
}

/** What a restored field says, the names it had to leave out and the hand-added people it kept. */
export type SettledAuditors = { auditorName: string; removed: string[]; manual: AuditorOption[] };

/*
 * A person the draft marked as added by hand, as she is now: found by id in
 * the users list (so a rename follows her), or by the stored name when that
 * list is not at hand. An id the list no longer holds is nobody.
 */
function handAddedPerson(stored: AuditorOption, everyone: readonly AuditorOption[] | null | undefined): AuditorOption | undefined {
  if (!stored.manual || !stored.id) return undefined;
  if (!everyone || everyone.length === 0) return { id: stored.id, name: stored.name, manual: true };
  const now = everyone.find((e) => e.id === stored.id);
  return now ? { id: now.id, name: now.name, manual: true } : undefined;
}

/*
 * The field after a DRAFT comes back (never an audit that exists already:
 * correctionAuditors.ts).
 *
 * - `recordedName`: the text the draft kept; null when it kept none, then the
 *   prefill stands.
 * - `recorded`: the entries the draft stored next to it (id, `manual`); drafts
 *   of earlier versions have none and are matched by name.
 * - `allowed`: the team's current people plus the signed-in person
 *   (withSignedInAuditor). Empty means the team has nobody to offer (a plain
 *   text field): then the signed-in person alone is allowed.
 * - `signedIn`, `everyone`: see above and handAddedPerson. Without a signed-in
 *   person an empty `allowed` leaves nothing to judge by and the text stays.
 *
 * A person found by id comes back under the name the users list holds now. A
 * person marked as added by hand stays. When every name had to go, the prefill
 * (the signed-in person) takes the field.
 */
export function settleAuditors(input: {
  recordedName: string | null | undefined;
  recorded?: readonly AuditorOption[] | null;
  allowed: readonly AuditorOption[];
  prefill: string;
  signedIn?: AuditorOption | null;
  everyone?: readonly AuditorOption[] | null;
}): SettledAuditors {
  if (input.recordedName === null || input.recordedName === undefined) {
    return { auditorName: input.prefill, removed: [], manual: [] };
  }
  const text = String(input.recordedName);
  const names = namesOf(text);
  const me = input.signedIn;
  const allowed = input.allowed.length > 0 ? input.allowed : me?.id && me.name.trim() ? [{ id: me.id, name: me.name }] : [];
  if (allowed.length === 0 || names.length === 0) return { auditorName: text, removed: [], manual: [] };

  const kept: AuditorOption[] = [];
  const manual: AuditorOption[] = [];
  const removed: string[] = [];
  for (const name of names) {
    const stored = input.recorded?.find((r) => sameName(r.name, name));
    const byId = stored ? allowed.find((o) => o.id === stored.id) : undefined;
    const hit = byId ?? allowed.find((o) => sameName(o.name, name)) ?? (stored && handAddedPerson(stored, input.everyone));
    if (!hit) {
      if (!removed.some((r) => sameName(r, name))) removed.push(name);
      continue;
    }
    if (kept.some((k) => k.id === hit.id)) continue;
    kept.push(hit);
    if (hit.manual) manual.push(hit);
  }
  if (kept.length === 0) return { auditorName: input.prefill, removed, manual: [] };
  return { auditorName: kept.map((k) => k.name).join(", "), removed, manual };
}

/*
 * What the person is told when a draft's names were left out: what is wrong,
 * what it means, what to do. Empty when nothing was left out. `hasMenu` is
 * false for the plain text field, which has no "Ekip dışından kişi ekle".
 */
export function removedAuditorsNotice(removed: readonly string[], hasMenu = true): string {
  if (removed.length === 0) return "";
  const next = hasMenu ? `"Ekip dışından kişi ekle" ile yeniden ekleyin.` : "alana yeniden yazın.";
  return `Taslakta yazılı ${removed.join(", ")} bu planın ekibinde olmadığı için Denetimi Yapan alanından çıkarıldı. Denetime gerçekten katıldıysa ${next}`;
}
