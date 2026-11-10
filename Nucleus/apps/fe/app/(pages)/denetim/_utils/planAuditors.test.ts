import { describe, expect, it } from "bun:test";
import { buildTeamMemberOptions, draftAuditorsOf, withManualAuditors, withSignedInAuditor } from "./planAuditors";
import { members, namesOfOptions, OKSIJEN, optionsNow, teams, users } from "./planAuditorsFixture";

/*
 * "özge ekipte görünmemeli": Denetimi Yapan offers the plan team's CURRENT
 * members and the signed-in person. What a draft may bring back is in
 * planAuditorsSettle.test.ts.
 */

describe("buildTeamMemberOptions — the team as it is now", () => {
  it("offers the leader and the active members, by the names the users list holds", () => {
    expect(namesOfOptions(optionsNow())).toEqual(["Mehmet Lider", "Sudenur Yaşa", "Ahmet Kırlı"]);
  });

  it("removed member: a membership that is switched off is not offered, nor is another team's person", () => {
    const names = namesOfOptions(optionsNow());
    expect(names).not.toContain("Özge Neccar");
    expect(names).not.toContain("Merkez Kişi");
  });

  it("renamed member: the option carries the name the users list holds today", () => {
    const renamed = new Map(users).set("u-ahmet", "Ahmet Kirli");
    const options = buildTeamMemberOptions(OKSIJEN, members, teams, renamed);
    expect(options.find((o) => o.id === "u-ahmet")?.name).toBe("Ahmet Kirli");
  });

  it("member added later: the next reading offers the new member", () => {
    const later = [...members, { team_id: OKSIJEN, user_id: "u-central", is_active: true }];
    expect(namesOfOptions(buildTeamMemberOptions(OKSIJEN, later, teams, users))).toContain("Merkez Kişi");
  });

  it("a person who leads and is also a member is offered once; an id with no name is skipped", () => {
    const both = [
      ...members,
      { team_id: OKSIJEN, user_id: "u-lead", is_active: true },
      { team_id: OKSIJEN, user_id: "u-ghost", is_active: true },
    ];
    const options = buildTeamMemberOptions(OKSIJEN, both, teams, users);
    expect(options.filter((o) => o.id === "u-lead")).toHaveLength(1);
    expect(options.some((o) => o.id === "u-ghost")).toBe(false);
  });
});

describe("withSignedInAuditor — the team plus the person doing the audit", () => {
  it("adds a signed-in person who is not on the team (Merkez Ekip opens any plan)", () => {
    const options = withSignedInAuditor(optionsNow(), { id: "u-central", name: "Merkez Kişi" });
    expect(namesOfOptions(options)).toEqual(["Mehmet Lider", "Sudenur Yaşa", "Ahmet Kırlı", "Merkez Kişi"]);
  });

  it("does not repeat a signed-in person who is already a member", () => {
    expect(withSignedInAuditor(optionsNow(), { id: "u-sude", name: "Sudenur Yaşa" })).toHaveLength(3);
  });

  it("does not repeat a name the team already offers under another account", () => {
    expect(withSignedInAuditor(optionsNow(), { id: "u-other-account", name: "SUDENUR YAŞA" })).toHaveLength(3);
  });

  it("a team with nobody to offer stays empty, so the form keeps asking for plain text", () => {
    expect(withSignedInAuditor([], { id: "u-central", name: "Merkez Kişi" })).toEqual([]);
  });

  it("ignores a signed-in person it knows nothing about", () => {
    expect(withSignedInAuditor(optionsNow(), { id: "", name: "" })).toHaveLength(3);
  });
});

describe("withManualAuditors — a person added by hand gets her tick back", () => {
  it("adds the hand-added person to the menu, marked, so she can be taken off again", () => {
    const options = withManualAuditors(optionsNow(), [{ id: "u-ozge", name: "Özge Neccar", manual: true }]);
    expect(namesOfOptions(options)).toEqual(["Mehmet Lider", "Sudenur Yaşa", "Ahmet Kırlı", "Özge Neccar"]);
    expect(options.find((o) => o.id === "u-ozge")?.manual).toBe(true);
  });

  it("does not repeat a person the menu already offers (by id or by name)", () => {
    const manual = [
      { id: "u-sude", name: "Sudenur Yaşa", manual: true },
      { id: "u-other", name: "AHMET KIRLI", manual: true },
    ];
    expect(withManualAuditors(optionsNow(), manual)).toHaveLength(3);
  });

  it("leaves a menu that is empty (the plain text field) empty", () => {
    expect(withManualAuditors([], [{ id: "u-ozge", name: "Özge Neccar", manual: true }])).toEqual([]);
  });
});

describe("draftAuditorsOf — the people behind the names, stored with a draft", () => {
  const pools = [...optionsNow(), { id: "", name: "Hayalet" }, ...[...users].map(([id, name]) => ({ id, name }))];

  it("records the id of every name that someone holds, in the order of the field", () => {
    expect(draftAuditorsOf("Ahmet Kırlı, Sudenur Yaşa", pools)).toEqual([
      { id: "u-ahmet", name: "Ahmet Kırlı" },
      { id: "u-sude", name: "Sudenur Yaşa" },
    ]);
  });

  it("gives a name nobody holds no entry, and never uses a person without an id", () => {
    expect(draftAuditorsOf("Kimse Yok, Hayalet", pools)).toEqual([]);
  });

  it("a name two accounts share means the one searched first (the team member)", () => {
    const twins = [
      { id: "u-team", name: "Ali Veli" },
      { id: "u-other", name: "ALİ VELİ" },
    ];
    expect(draftAuditorsOf("Ali Veli", twins)).toEqual([{ id: "u-team", name: "Ali Veli" }]);
  });

  it("keeps the manual mark of a person added by hand, and marks nobody else", () => {
    const withHandAdded = [...optionsNow(), { id: "u-ozge", name: "Özge Neccar", manual: true }, ...pools];
    expect(draftAuditorsOf("Sudenur Yaşa, Özge Neccar", withHandAdded)).toEqual([
      { id: "u-sude", name: "Sudenur Yaşa" },
      { id: "u-ozge", name: "Özge Neccar", manual: true },
    ]);
  });

  it("a person who is also in a later pool without the mark is still the one found first", () => {
    const twice = [{ id: "u-ozge", name: "Özge Neccar", manual: true }, { id: "u-ozge", name: "Özge Neccar" }];
    expect(draftAuditorsOf("Özge Neccar", twice)).toEqual([{ id: "u-ozge", name: "Özge Neccar", manual: true }]);
  });
});
