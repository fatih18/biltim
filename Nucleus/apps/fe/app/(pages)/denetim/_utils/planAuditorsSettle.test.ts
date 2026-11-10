import { describe, expect, it } from "bun:test";
import {
  buildTeamMemberOptions,
  removedAuditorsNotice,
  settleAuditors,
  withSignedInAuditor,
} from "./planAuditors";
import { members, namesOfOptions, OKSIJEN, optionsNow, teams, users } from "./planAuditorsFixture";

/*
 * What a draft may bring back into "Denetimi Yapan": only the team's current
 * people and the signed-in person. A sent audit keeps what was recorded.
 */

const allowedNow = () => withSignedInAuditor(optionsNow(), { id: "u-sude", name: "Sudenur Yaşa" });

describe("settleAuditors — what a draft may bring back", () => {
  it("the screenshot: a person who is not in the team is left out of the copy, and said so", () => {
    const settled = settleAuditors({
      recordedName: "Özge Neccar, Sudenur Yaşa, Ahmet Kırlı",
      allowed: allowedNow(),
      prefill: "Sudenur Yaşa",
    });
    expect(settled.auditorName).toBe("Sudenur Yaşa, Ahmet Kırlı");
    expect(settled.removed).toEqual(["Özge Neccar"]);
  });

  it("removed member: a draft written while she was on the team no longer brings her back", () => {
    const whenStillMember = [...members.slice(0, 2), { team_id: OKSIJEN, user_id: "u-ozge", is_active: true }];
    expect(namesOfOptions(buildTeamMemberOptions(OKSIJEN, whenStillMember, teams, users))).toContain("Özge Neccar");
    const settled = settleAuditors({ recordedName: "Özge Neccar, Ahmet Kırlı", allowed: allowedNow(), prefill: "Sudenur Yaşa" });
    expect(settled.auditorName).toBe("Ahmet Kırlı");
    expect(settled.removed).toEqual(["Özge Neccar"]);
  });

  it("a draft the Merkez Ekip member wrote with only her own name does not come back for the team", () => {
    const settled = settleAuditors({ recordedName: "Merkez Kişi", allowed: allowedNow(), prefill: "Sudenur Yaşa" });
    expect(settled.auditorName).toBe("Sudenur Yaşa");
    expect(settled.removed).toEqual(["Merkez Kişi"]);
  });

  it("signed-in user outside the team: her own name stays for her, the team's names stay too", () => {
    const allowed = withSignedInAuditor(optionsNow(), { id: "u-central", name: "Merkez Kişi" });
    const settled = settleAuditors({ recordedName: "Merkez Kişi, Sudenur Yaşa", allowed, prefill: "Merkez Kişi" });
    expect(settled.auditorName).toBe("Merkez Kişi, Sudenur Yaşa");
    expect(settled.removed).toEqual([]);
  });

  it("renamed member: found again by id, under the name the users list holds now", () => {
    const renamed = new Map(users).set("u-ahmet", "Ahmet Kirli");
    const allowed = buildTeamMemberOptions(OKSIJEN, members, teams, renamed);
    const settled = settleAuditors({
      recordedName: "Sudenur Yaşa, Ahmet Kırlı",
      recorded: [
        { id: "u-sude", name: "Sudenur Yaşa" },
        { id: "u-ahmet", name: "Ahmet Kırlı" },
      ],
      allowed,
      prefill: "Sudenur Yaşa",
    });
    expect(settled.auditorName).toBe("Sudenur Yaşa, Ahmet Kirli");
    expect(settled.removed).toEqual([]);
  });

  it("a draft of an earlier version has no ids: it is matched by name, and a renamed person is said to be left out", () => {
    const renamed = new Map(users).set("u-ahmet", "Ahmet Kirli");
    const allowed = buildTeamMemberOptions(OKSIJEN, members, teams, renamed);
    const settled = settleAuditors({ recordedName: "Sudenur Yaşa, Ahmet Kırlı", allowed, prefill: "Sudenur Yaşa" });
    expect(settled.auditorName).toBe("Sudenur Yaşa");
    expect(settled.removed).toEqual(["Ahmet Kırlı"]);
  });

  it("member added later: offered as a choice, but nobody is ticked for them", () => {
    const later = [...members, { team_id: OKSIJEN, user_id: "u-central", is_active: true }];
    const allowed = withSignedInAuditor(buildTeamMemberOptions(OKSIJEN, later, teams, users), { id: "u-sude", name: "Sudenur Yaşa" });
    expect(namesOfOptions(allowed)).toContain("Merkez Kişi");
    const settled = settleAuditors({ recordedName: "Sudenur Yaşa", allowed, prefill: "Sudenur Yaşa" });
    expect(settled.auditorName).toBe("Sudenur Yaşa");
  });

  it("compares names the Turkish way and writes the canonical name back", () => {
    const settled = settleAuditors({ recordedName: "AHMET KIRLI,  sudenur yaşa ", allowed: allowedNow(), prefill: "x" });
    expect(settled.auditorName).toBe("Ahmet Kırlı, Sudenur Yaşa");
  });

  it("names a person once however often the draft wrote them", () => {
    const settled = settleAuditors({
      recordedName: "Ahmet Kırlı, Ahmet Kırlı, Özge Neccar, özge neccar",
      allowed: allowedNow(),
      prefill: "x",
    });
    expect(settled.auditorName).toBe("Ahmet Kırlı");
    expect(settled.removed).toEqual(["Özge Neccar"]);
  });

  it("when nobody of the draft is left, the prefill (the signed-in person) takes the field", () => {
    const settled = settleAuditors({ recordedName: "Özge Neccar", allowed: allowedNow(), prefill: "Sudenur Yaşa" });
    expect(settled.auditorName).toBe("Sudenur Yaşa");
    expect(settled.removed).toEqual(["Özge Neccar"]);
  });

  it("with nothing to judge by (no list and no signed-in person) the typed text is kept as it is", () => {
    const settled = settleAuditors({ recordedName: "Biri Birisi", allowed: [], prefill: "Sudenur Yaşa" });
    expect(settled).toEqual({ auditorName: "Biri Birisi", removed: [], manual: [] });
  });

  it("a draft that kept no names leaves the prefill; one that kept an empty field keeps it empty", () => {
    expect(settleAuditors({ recordedName: null, allowed: allowedNow(), prefill: "Sudenur Yaşa" }).auditorName).toBe("Sudenur Yaşa");
    expect(settleAuditors({ recordedName: undefined, allowed: allowedNow(), prefill: "Sudenur Yaşa" }).auditorName).toBe("Sudenur Yaşa");
    expect(settleAuditors({ recordedName: "", allowed: allowedNow(), prefill: "Sudenur Yaşa" }).auditorName).toBe("");
  });
});

describe("removedAuditorsNotice — what is wrong, what it means, what to do", () => {
  it("names the people, says they were taken off and how to bring one back", () => {
    const text = removedAuditorsNotice(["Özge Neccar", "Biri Birisi"]);
    expect(text).toContain("Özge Neccar, Biri Birisi");
    expect(text).toContain("ekibinde olmadığı için");
    expect(text).toContain("çıkarıldı");
    expect(text).toContain("Ekip dışından kişi ekle");
  });

  it("the plain text field has no such menu: it says to write the name again", () => {
    const text = removedAuditorsNotice(["Özge Neccar"], false);
    expect(text).not.toContain("Ekip dışından kişi ekle");
    expect(text).toContain("alana yeniden yazın");
  });

  it("is empty when nobody was left out", () => {
    expect(removedAuditorsNotice([])).toBe("");
  });
});
