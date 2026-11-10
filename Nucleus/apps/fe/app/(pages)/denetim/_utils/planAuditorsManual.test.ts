import { describe, expect, it } from "bun:test";
import { buildTeamMemberOptions, settleAuditors, withSignedInAuditor } from "./planAuditors";
import { members, OKSIJEN, optionsNow, teams, users } from "./planAuditorsFixture";

/*
 * What a draft keeps besides the team: a person someone added by hand (the
 * "yedek denetçi" of #29, marked `manual`), and what happens in a plain text
 * field, where the team has nobody to offer. The rest of the rule is in
 * planAuditorsSettle.test.ts.
 */

const allowedNow = () => withSignedInAuditor(optionsNow(), { id: "u-sude", name: "Sudenur Yaşa" });

describe("settleAuditors — a person added by hand (yedek denetçi, #29)", () => {
  const everyone = [...users].map(([id, name]) => ({ id, name }));
  const stored = [
    { id: "u-sude", name: "Sudenur Yaşa" },
    { id: "u-ozge", name: "Özge Neccar", manual: true },
  ];
  const base = { recordedName: "Sudenur Yaşa, Özge Neccar", recorded: stored, prefill: "Sudenur Yaşa", everyone };

  it("survives the restore, and is handed back so the menu can give her a tick again", () => {
    const settled = settleAuditors({ ...base, allowed: allowedNow() });
    expect(settled.auditorName).toBe("Sudenur Yaşa, Özge Neccar");
    expect(settled.removed).toEqual([]);
    expect(settled.manual).toEqual([{ id: "u-ozge", name: "Özge Neccar", manual: true }]);
  });

  it("the same name without the mark (a prefill, a stale copy) is still left out", () => {
    const unmarked = stored.map(({ id, name }) => ({ id, name }));
    const settled = settleAuditors({ ...base, recorded: unmarked, allowed: allowedNow() });
    expect(settled.auditorName).toBe("Sudenur Yaşa");
    expect(settled.removed).toEqual(["Özge Neccar"]);
    expect(settled.manual).toEqual([]);
  });

  it("a draft of an earlier version (no entries at all) behaves as before", () => {
    const settled = settleAuditors({ ...base, recorded: undefined, allowed: allowedNow() });
    expect(settled.auditorName).toBe("Sudenur Yaşa");
    expect(settled.removed).toEqual(["Özge Neccar"]);
  });

  it("marked people and unmarked strangers in one field: the first stays, the second goes", () => {
    const settled = settleAuditors({ ...base, recordedName: "Özge Neccar, Biri Birisi, Sudenur Yaşa", allowed: allowedNow() });
    expect(settled.auditorName).toBe("Özge Neccar, Sudenur Yaşa");
    expect(settled.removed).toEqual(["Biri Birisi"]);
  });

  it("when she is the only one left, she keeps the field instead of the prefill", () => {
    const settled = settleAuditors({ ...base, recordedName: "Özge Neccar", allowed: allowedNow() });
    expect(settled.auditorName).toBe("Özge Neccar");
    expect(settled.manual).toHaveLength(1);
  });

  it("a rename follows her by id", () => {
    const renamed = everyone.map((u) => (u.id === "u-ozge" ? { id: u.id, name: "Özge Yılmaz" } : u));
    const settled = settleAuditors({ ...base, everyone: renamed, allowed: allowedNow() });
    expect(settled.auditorName).toBe("Sudenur Yaşa, Özge Yılmaz");
    expect(settled.manual).toEqual([{ id: "u-ozge", name: "Özge Yılmaz", manual: true }]);
  });

  it("someone the users list no longer holds is nobody, and is said to be left out", () => {
    const without = everyone.filter((u) => u.id !== "u-ozge");
    const settled = settleAuditors({ ...base, everyone: without, allowed: allowedNow() });
    expect(settled.auditorName).toBe("Sudenur Yaşa");
    expect(settled.removed).toEqual(["Özge Neccar"]);
  });

  it("with no users list at hand the stored name is trusted", () => {
    const settled = settleAuditors({ ...base, everyone: [], allowed: allowedNow() });
    expect(settled.auditorName).toBe("Sudenur Yaşa, Özge Neccar");
  });

  it("one who has joined the team since comes back as a team member, not as a hand-added one", () => {
    const joined = [...members, { team_id: OKSIJEN, user_id: "u-ozge", is_active: true }];
    const allowed = withSignedInAuditor(buildTeamMemberOptions(OKSIJEN, joined, teams, users), { id: "u-sude", name: "Sudenur Yaşa" });
    const settled = settleAuditors({ ...base, allowed });
    expect(settled.auditorName).toBe("Sudenur Yaşa, Özge Neccar");
    expect(settled.manual).toEqual([]);
  });
});

describe("settleAuditors — a team with nobody to offer (the plain text field)", () => {
  const signedIn = { id: "u-central", name: "Merkez Kişi" };

  it("the signed-in person is the only allowed name: a stale name is filtered out, and said", () => {
    const settled = settleAuditors({ recordedName: "Özge Neccar, Merkez Kişi", allowed: [], prefill: "Merkez Kişi", signedIn });
    expect(settled).toEqual({ auditorName: "Merkez Kişi", removed: ["Özge Neccar"], manual: [] });
  });

  it("a draft that holds only stale names leaves the prefill (the signed-in person)", () => {
    const settled = settleAuditors({ recordedName: "Özge Neccar", allowed: [], prefill: "Merkez Kişi", signedIn });
    expect(settled.auditorName).toBe("Merkez Kişi");
    expect(settled.removed).toEqual(["Özge Neccar"]);
  });

  it("the signed-in person's own name is matched the Turkish way", () => {
    const settled = settleAuditors({ recordedName: "MERKEZ KİŞİ", allowed: [], prefill: "x", signedIn });
    expect(settled.auditorName).toBe("Merkez Kişi");
  });

  it("a person added by hand stays here too", () => {
    const recorded = [{ id: "u-ozge", name: "Özge Neccar", manual: true }];
    const settled = settleAuditors({ recordedName: "Özge Neccar, Biri Birisi", recorded, allowed: [], prefill: "Merkez Kişi", signedIn });
    expect(settled.auditorName).toBe("Özge Neccar");
    expect(settled.removed).toEqual(["Biri Birisi"]);
  });

  it("a signed-in person with no id or no name gives nothing to judge by: the text stays", () => {
    for (const nobody of [{ id: "", name: "Merkez Kişi" }, { id: "u-central", name: "  " }, null, undefined]) {
      const settled = settleAuditors({ recordedName: "Biri Birisi", allowed: [], prefill: "Merkez Kişi", signedIn: nobody });
      expect(settled).toEqual({ auditorName: "Biri Birisi", removed: [], manual: [] });
    }
  });
});
