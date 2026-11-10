import { describe, expect, it } from "bun:test";
import { dedupeKey, questionIdOfFinding } from "./dedupeFindings";

describe("questionIdOfFinding", () => {
  it("reads the column first, then the lines older findings wrote into the description", () => {
    expect(questionIdOfFinding({ question_id: "S1-1", description: "Soru ID: S2-2" })).toBe("S1-1");
    expect(questionIdOfFinding({ description: "Soru ID: S2-2\nAdım: S2" })).toBe("S2-2");
    expect(questionIdOfFinding({ description: "TEKİL BULGU\nBağlı Soru: S4-1" })).toBe("S4-1");
    expect(questionIdOfFinding({ description: "bağsız" })).toBe("");
  });
});

describe("dedupeKey — twins the register shows once (R2/R17)", () => {
  const open = (extra = {}) => ({ question_id: "S1-1", location_name: "Bölge 3", status: "open", ...extra });

  it("an open finding and its in-progress twin of the same question and place share a row", () => {
    expect(dedupeKey(open())).toBe(dedupeKey(open({ status: "in_progress" })));
  });

  it("the place is compared the Turkish way", () => {
    expect(dedupeKey(open({ location_name: "İdari Bina" }))).toBe(dedupeKey(open({ location_name: "idari bina " })));
  });

  it("other questions or other places stay apart", () => {
    expect(dedupeKey(open())).not.toBe(dedupeKey(open({ question_id: "S1-2" })));
    expect(dedupeKey(open())).not.toBe(dedupeKey(open({ location_name: "Bölge 4" })));
  });

  it("a finding with no question stands alone", () => {
    expect(dedupeKey({ location_name: "Bölge 3", status: "open" })).toBe("");
  });

  it("two closed findings of the same audit share a row; the single finding raised inside it carries the audit's name", () => {
    const audit = "Bölge 3 · 10.11.2026";
    const fromForm = open({ status: "closed", form_title: audit });
    const single = open({ status: "closed", form_title: audit, description: "Ana Denetim: " + audit });
    expect(dedupeKey(fromForm)).not.toBe("");
    expect(dedupeKey(fromForm)).toBe(dedupeKey(single));
  });

  it("closed findings of different audits are history and stay apart", () => {
    const a = open({ status: "closed", form_title: "Bölge 3 · 10.11.2026" });
    const b = open({ status: "closed", form_title: "Bölge 3 · 24.11.2026" });
    expect(dedupeKey(a)).not.toBe(dedupeKey(b));
  });

  it("a closed finding without an audit name, or a plain Tekil Bulgu, is never merged", () => {
    expect(dedupeKey(open({ status: "closed" }))).toBe("");
    expect(dedupeKey(open({ status: "closed", form_title: "Tekil Bulgu" }))).toBe("");
  });

  it("a closed finding never joins an open one", () => {
    expect(dedupeKey(open({ status: "closed", form_title: "Bölge 3 · 10.11.2026" }))).not.toBe(dedupeKey(open()));
  });
});
