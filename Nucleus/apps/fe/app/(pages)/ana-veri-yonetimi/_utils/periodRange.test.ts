import { describe, expect, it } from "bun:test";
import { checkPeriodDraft, QUARTER_MAX_LENGTH, type PeriodDraft } from "./periodRange";

const stored: PeriodDraft = { quarter: "2026-Q4", start: "2026-10-01", end: "2026-12-31" };

describe("checkPeriodDraft", () => {
  it("cannot save what has not changed", () => {
    const check = checkPeriodDraft(stored, stored, ["2026-11-05"]);
    expect(check.changed).toBe(false);
    expect(check.canSave).toBe(false);
    expect(check.reasons).toEqual([]);
  });

  it("saves a rename, and a rename with a moved range, when every plan still fits", () => {
    expect(checkPeriodDraft({ ...stored, quarter: "2026-Q4-B" }, stored, ["2026-11-05"]).canSave).toBe(true);
    expect(
      checkPeriodDraft({ quarter: "2026-Q4", start: "2026-09-15", end: "2027-01-15" }, stored, ["2026-11-05"]).canSave
    ).toBe(true);
  });

  it("is incomplete while the name or a date is blank, and says nothing yet", () => {
    for (const draft of [
      { ...stored, quarter: "   " },
      { ...stored, start: "" },
      { ...stored, end: "" },
    ]) {
      const check = checkPeriodDraft(draft, stored, []);
      expect(check.complete).toBe(false);
      expect(check.canSave).toBe(false);
      expect(check.reasons).toEqual([]);
    }
  });

  it("refuses an end before the start", () => {
    const check = checkPeriodDraft({ ...stored, start: "2027-01-10" }, stored, []);
    expect(check.canSave).toBe(false);
    expect(check.reasons).toEqual(["Bitiş tarihi başlangıç tarihinden önce olamaz."]);
  });

  it("allows a one-day period", () => {
    expect(checkPeriodDraft({ ...stored, start: "2026-11-05", end: "2026-11-05" }, stored, []).canSave).toBe(true);
  });

  it("refuses a name longer than the column", () => {
    const quarter = "x".repeat(QUARTER_MAX_LENGTH + 1);
    const check = checkPeriodDraft({ ...stored, quarter }, stored, []);
    expect(check.canSave).toBe(false);
    expect(check.reasons[0]).toContain(String(QUARTER_MAX_LENGTH));
  });

  it("counts the audit plans a smaller range would leave outside, and names their days", () => {
    const check = checkPeriodDraft({ ...stored, end: "2026-12-15" }, stored, [
      "2026-12-28",
      "2026-11-03",
      "2026-12-20",
      "2026-12-20",
    ]);
    expect(check.canSave).toBe(false);
    expect(check.reasons).toHaveLength(1);
    expect(check.reasons[0]).toContain("3 denetim planı");
    expect(check.reasons[0]).toContain("2026-12-20, 2026-12-28");
    expect(check.reasons[0]).not.toContain("2026-11-03");
  });

  it("lets a boundary land exactly on a plan, and reads timestamps as their day", () => {
    const edge = [new Date(2026, 9, 20).toISOString(), "2026-12-20"];
    expect(checkPeriodDraft({ quarter: "2026-Q4", start: "2026-10-20", end: "2026-12-20" }, stored, edge).canSave).toBe(true);
  });

  it("spells out the first eight days and counts the rest", () => {
    const days = Array.from({ length: 11 }, (_, i) => `2026-12-${String(15 + i).padStart(2, "0")}`);
    const check = checkPeriodDraft({ ...stored, end: "2026-12-10" }, stored, days);
    expect(check.reasons[0]).toContain("11 denetim planı");
    expect(check.reasons[0]).toContain("ve 3 tarih daha");
  });

  it("does not look at the plans when the dates run backwards", () => {
    const check = checkPeriodDraft({ ...stored, start: "2027-02-01" }, stored, ["2026-11-05"]);
    expect(check.reasons).toEqual(["Bitiş tarihi başlangıç tarihinden önce olamaz."]);
  });
});
