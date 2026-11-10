import { describe, expect, it } from "bun:test";
import { correctionAuditors, recordedAuditorName, withNamedAuditors } from "./correctionAuditors";
import { settleAuditors } from "./planAuditors";
import { members, namesOfOptions, OKSIJEN, optionsNow, teams, users } from "./planAuditorsFixture";

/*
 * The correction of an audit that exists already (sent, rejected, completed):
 * the names recorded on it stay, whoever is on the team today. Özge Neccar is
 * the Oksijen member who was removed after she took part in the audit.
 */

const RECORDED = "Özge Neccar, Sudenur Yaşa, Ahmet Kırlı";
const open = (recordedName: string | null | undefined, over: { teamId?: string | null } = {}) =>
  correctionAuditors({ teamId: OKSIJEN, members, teams, usersById: users, recordedName, ...over });

describe("correctionAuditors — a submitted audit keeps its recorded names", () => {
  it("shows the recorded text exactly, although Özge is not on the team any more", () => {
    expect(namesOfOptions(optionsNow())).not.toContain("Özge Neccar");
    expect(open(RECORDED).auditorName).toBe(RECORDED);
  });

  it("a draft with the same text would lose her; the audit row is not a draft", () => {
    const asDraft = settleAuditors({ recordedName: RECORDED, allowed: optionsNow(), prefill: "" });
    expect(asDraft.auditorName).not.toBe(RECORDED);
    expect(open(RECORDED).auditorName).toBe(RECORDED);
  });

  it("a name that is no longer on the team stays visible and removable: she has a tick of her own", () => {
    const options = open(RECORDED).options ?? [];
    expect(options.find((o) => o.id === "u-ozge")?.name).toBe("Özge Neccar");
    // The menu draws one checkbox per option, ticked when its name is in the field.
    const names = namesOfOptions(options);
    for (const recorded of RECORDED.split(", ")) expect(names).toContain(recorded);
  });

  it("the team stays offered, so a missing auditor can still be ticked", () => {
    const names = namesOfOptions(open("Özge Neccar").options ?? []);
    expect(names).toEqual(["Mehmet Lider", "Sudenur Yaşa", "Ahmet Kırlı", "Özge Neccar"]);
  });
});

describe("correctionAuditors — nobody new is added to the record", () => {
  it("offers only the team and the people the record names: no signed-in person, nobody else", () => {
    const options = open("Özge Neccar").options ?? [];
    expect(namesOfOptions(options)).not.toContain("Merkez Kişi");
    expect(options.map((o) => o.id).sort()).toEqual(["u-ahmet", "u-lead", "u-ozge", "u-sude"]);
  });

  it("a record that names nobody reads as an empty field and offers the team only", () => {
    for (const none of [null, undefined, ""]) {
      const view = open(none);
      expect(view.auditorName).toBe("");
      expect(namesOfOptions(view.options ?? [])).toEqual(["Mehmet Lider", "Sudenur Yaşa", "Ahmet Kırlı"]);
    }
  });

  it("a name nobody holds stays in the text as it is and gets no option", () => {
    const view = open("Kimse Yok, Sudenur Yaşa");
    expect(view.auditorName).toBe("Kimse Yok, Sudenur Yaşa");
    expect(namesOfOptions(view.options ?? [])).toEqual(["Mehmet Lider", "Sudenur Yaşa", "Ahmet Kırlı"]);
  });

  it("a name written in other letters is the person already offered, not a second tick", () => {
    expect(open("AHMET KIRLI").options).toHaveLength(3);
  });

  it("a team with nobody to offer stays a plain text field", () => {
    expect(open("Özge Neccar", { teamId: "t-empty" }).options).toEqual([]);
  });
});

describe("correctionAuditors — an audit with no plan to read", () => {
  it("leaves the menu alone (null) and still shows the recorded names", () => {
    const view = open(RECORDED, { teamId: null });
    expect(view.options).toBeNull();
    expect(view.auditorName).toBe(RECORDED);
  });
});

describe("recordedAuditorName / withNamedAuditors", () => {
  const everyone = [...users].map(([id, name]) => ({ id, name }));

  it("an audit with no recorded names reads as an empty field", () => {
    expect(recordedAuditorName(null)).toBe("");
    expect(recordedAuditorName(undefined)).toBe("");
  });

  it("adds the recorded person who is not offered, so the name can be taken off by hand", () => {
    const options = withNamedAuditors(optionsNow(), "Özge Neccar, Sudenur Yaşa", everyone);
    expect(namesOfOptions(options)).toEqual(["Mehmet Lider", "Sudenur Yaşa", "Ahmet Kırlı", "Özge Neccar"]);
  });

  it("adds nobody for a name nobody holds, and nothing to a list that is empty", () => {
    expect(withNamedAuditors(optionsNow(), "Kimse Yok", everyone)).toHaveLength(3);
    expect(withNamedAuditors([], "Özge Neccar", everyone)).toEqual([]);
  });
});
