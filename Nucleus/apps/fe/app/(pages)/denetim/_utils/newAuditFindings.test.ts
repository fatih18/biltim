import { describe, expect, it } from "bun:test";
import type { Question, Step } from "../constants";
import { createdIdOf, unsavedFindingQuestionIds, unsavedFindingsGap } from "./newAuditFindings";
import { STAMP_RETRY_LABEL } from "./planStampOutcome";
import type { FindingWrite } from "./resendPlan";

const steps: Step[] = [
  { code: "S1", title: "1 - Sınıflandırma", maxScore: 20, order: 1 },
  { code: "S3", title: "3 - Temizlik", maxScore: 20, order: 3 },
];
const question = (id: string, stepCode: Question["stepCode"], order: number): Question => ({
  id,
  stepCode,
  order,
  text: `Soru ${id}`,
  maxScore: 5,
  requireExplanation: true,
});
const q12 = question("S1-Q2", "S1", 2);
const q31 = question("S3-Q1", "S3", 1);
const questions = [q12, q31];
const saved: FindingWrite = { saved: true, failedPhotos: 0 };
const unsaved: FindingWrite = { saved: false, failedPhotos: 0 };

describe("createdIdOf reads the audit row's answer without any", () => {
  it("takes the wrapped row's id, then the answer's own id, then the first of a list", () => {
    expect(createdIdOf({ data: { id: "a1" } })).toBe("a1");
    expect(createdIdOf({ id: "a2" })).toBe("a2");
    expect(createdIdOf({ data: [{ id: "a3" }, { id: "a4" }] })).toBe("a3");
    expect(createdIdOf({ id: "outer", data: { id: "inner" } })).toBe("inner");
  });

  it("is null when the answer names no row", () => {
    expect(createdIdOf(null)).toBeNull();
    expect(createdIdOf(undefined)).toBeNull();
    expect(createdIdOf({})).toBeNull();
    expect(createdIdOf({ data: null })).toBeNull();
    expect(createdIdOf({ data: [] })).toBeNull();
    expect(createdIdOf({ data: { id: null } })).toBeNull();
  });

  it("returns the id as a string, also for a numeric one", () => {
    expect(createdIdOf({ data: { id: 17 } })).toBe("17");
  });
});

describe("unsavedFindingQuestionIds pairs each write with its answer, in order", () => {
  const findings = [{ questionId: "S1-Q2" }, { questionId: "S3-Q1" }];

  it("is empty when every finding saved", () => {
    expect(unsavedFindingQuestionIds(findings, [saved, saved])).toEqual([]);
  });

  it("names the question whose finding did not save", () => {
    expect(unsavedFindingQuestionIds(findings, [saved, unsaved])).toEqual(["S3-Q1"]);
    expect(unsavedFindingQuestionIds(findings, [unsaved, unsaved])).toEqual(["S1-Q2", "S3-Q1"]);
  });

  it("a finding that saved with a failed photo still counts as saved (the photo is not what holds the stamp)", () => {
    expect(unsavedFindingQuestionIds(findings, [{ saved: true, failedPhotos: 2 }, saved])).toEqual([]);
  });
});

describe("unsavedFindingsGap: the message that holds the stamp", () => {
  const findings = [{ questionId: "S1-Q2" }, { questionId: "S3-Q1" }];

  it("holds nothing when every finding saved", () => {
    expect(unsavedFindingsGap({ findings, writes: [saved, saved], questions, steps })).toBeNull();
  });

  it("says what is wrong, what it means and what to do, naming the question", () => {
    const gap = unsavedFindingsGap({ findings, writes: [saved, unsaved], questions, steps });
    expect(gap?.kind).toBe("incomplete");
    const text = gap?.text ?? "";
    expect(text).toContain("1 bulgu kaydedilemedi: 3.1 · Soru S3-Q1");
    expect(text).toContain("Denetim ve yanıtlar kaydedildi");
    expect(text).toContain("gönderilmedi ve açık kaldı");
    expect(text).toContain('"Tekil Bulgu +"');
    expect(text).toContain(`"${STAMP_RETRY_LABEL}"`);
    expect(text).toContain("yeniden doldurmayın");
  });

  it("counts several and falls back to the bare code for a question the form does not know", () => {
    const gap = unsavedFindingsGap({ findings, writes: [unsaved, unsaved], questions: [q31], steps });
    expect(gap?.text).toContain("2 bulgu kaydedilemedi: S1-Q2; 3.1 · Soru S3-Q1");
  });
});
