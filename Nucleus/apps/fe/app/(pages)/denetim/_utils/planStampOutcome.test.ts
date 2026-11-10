import { describe, expect, it } from "bun:test";
import type { Question, Step } from "../constants";
import { PHOTO_REFUSAL_MARKER } from "./photoRefusal";
import {
  PLAN_STAMPED,
  heldPlanGap,
  planStampFailure,
  planStampToast,
  questionsLeftWithoutPhoto,
} from "./planStampOutcome";

const steps: Step[] = [
  { code: "S1", title: "1 - Sınıflandırma", maxScore: 20, order: 1 },
  { code: "S3", title: "3 - Temizlik", maxScore: 20, order: 3 },
];
const question = (id: string, stepCode: Question["stepCode"], order: number, requirePhoto?: boolean): Question => ({
  id,
  stepCode,
  order,
  text: `Soru ${id}`,
  maxScore: 5,
  requireExplanation: true,
  ...(requirePhoto === undefined ? {} : { requirePhoto }),
});
const q12 = question("S1-Q2", "S1", 2, true);
const q31 = question("S3-Q1", "S3", 1, true);
const q13 = question("S1-Q3", "S1", 3, false);
const questions = [q12, q31, q13];
const photo = new File(["x"], "bulgu.jpg", { type: "image/jpeg" });
const saved = (failedPhotos: number) => ({ saved: true, failedPhotos });
const API_REASON = `Denetim gönderilemedi: ${PHOTO_REFUSAL_MARKER} (S1-Q2) fotoğrafsız bulgu var. Bulguya fotoğraf ekleyin; fotoğraf yüklenemiyorsa Merkez Ekip'e bildirin.`;

describe("planStampFailure and planStampToast", () => {
  it("a 4xx is a refusal that keeps its reasons; anything else is a failure that passes", () => {
    expect(planStampFailure({ refused: true, reasons: [API_REASON] })).toEqual({ kind: "refused", reasons: [API_REASON] });
    expect(planStampFailure({ refused: false, reasons: [] })).toEqual({ kind: "failed" });
    expect(PLAN_STAMPED).toEqual({ kind: "sent" });
  });

  it("the toast carries the server's reasons for a refusal, the generic line otherwise", () => {
    const refused = planStampToast({ kind: "refused", reasons: ["Plan bulunamadı."] });
    expect(refused.text).toBe("Denetim kaydedildi ancak plan onaya gönderilemedi: Plan bulunamadı.");
    expect(refused.long).toBe(true);
    for (const outcome of [{ kind: "failed" as const }, { kind: "refused" as const, reasons: [] }]) {
      const generic = planStampToast(outcome);
      expect(generic.text).toBe("Denetim kaydedildi ancak plan onaya gönderilemedi. Lütfen yöneticinize bildirin.");
      expect(generic.long).toBe(false);
    }
  });
});

describe("questionsLeftWithoutPhoto", () => {
  it("names a demanding question whose every photo failed to upload", () => {
    const left = questionsLeftWithoutPhoto({
      answers: [
        { questionId: "S1-Q2", photos: [photo, photo] },
        { questionId: "S3-Q1", photos: [photo] },
      ],
      writes: [saved(2), saved(0)],
      questions,
    });
    expect(left.map((q) => q.id)).toEqual(["S1-Q2"]);
  });

  it("does not name a question that kept at least one photo, or does not demand one", () => {
    const left = questionsLeftWithoutPhoto({
      answers: [
        { questionId: "S1-Q2", photos: [photo, photo] },
        { questionId: "S1-Q3", photos: [photo] },
      ],
      writes: [saved(1), saved(1)],
      questions,
    });
    expect(left).toEqual([]);
  });

  it("leaves out a finding that did not save at all: the server has no row to refuse", () => {
    const left = questionsLeftWithoutPhoto({
      answers: [{ questionId: "S1-Q2", photos: [photo] }],
      writes: [{ saved: false, failedPhotos: 1 }],
      questions,
    });
    expect(left).toEqual([]);
  });

  it("lists each question once, in answer order, and ignores an unknown question or a missing write", () => {
    const left = questionsLeftWithoutPhoto({
      answers: [
        { questionId: "S3-Q1", photos: [photo] },
        { questionId: "S3-Q1", photos: [photo] },
        { questionId: "S1-Q2", photos: [photo] },
        { questionId: "S9-Q9", photos: [photo] },
        { questionId: "S1-Q2" },
      ],
      writes: [saved(1), saved(1), saved(1), saved(1)],
      questions,
    });
    expect(left.map((q) => q.id)).toEqual(["S3-Q1", "S1-Q2"]);
  });
});

describe("heldPlanGap: the message that stays when the stamp is refused", () => {
  it("is nothing when the stamp went through or only failed in passing", () => {
    expect(heldPlanGap(PLAN_STAMPED, [], steps)).toBeNull();
    expect(heldPlanGap({ kind: "failed" }, [q12], steps)).toBeNull();
  });

  it("for the photo refusal names the questions by number and text, says what it means and what to do", () => {
    const gap = heldPlanGap({ kind: "refused", reasons: [API_REASON] }, [q12, q31], steps);
    expect(gap?.kind).toBe("unsent");
    const text = gap?.text ?? "";
    expect(text).toContain("onaya gönderilemedi");
    expect(text).toContain("şu sorularda");
    expect(text).toContain("1.2 · Soru S1-Q2");
    expect(text).toContain("3.1 · Soru S3-Q1");
    expect(text).toContain("Fotoğrafsız bulgu kabul edilmediği için");
    expect(text).toContain("Plan onaya gitmedi ve açık kaldı");
    expect(text).toContain("Merkez Ekip'e bildirin");
    expect(text).toContain("yeniden doldurmayın");
  });

  it("says 'şu soruda' for one question", () => {
    const gap = heldPlanGap({ kind: "refused", reasons: [API_REASON] }, [q12], steps);
    expect(gap?.text).toContain("şu soruda");
  });

  it("when the page cannot name the questions, gives the server's own words, which carry the codes", () => {
    const gap = heldPlanGap({ kind: "refused", reasons: [API_REASON] }, [], steps);
    expect(gap?.text).toContain(API_REASON);
    expect(gap?.text).toContain("Merkez Ekip'e bildirin");
  });

  it("keeps the page open for any other refusal too, with its reason", () => {
    const gap = heldPlanGap({ kind: "refused", reasons: ["Plan bulunamadı."] }, [], steps);
    expect(gap?.text).toContain("Denetim kaydedildi ancak plan onaya gönderilemedi: Plan bulunamadı.");
    expect(gap?.text).toContain("yeniden doldurmayın");
    expect(heldPlanGap({ kind: "refused", reasons: [] }, [], steps)?.text).toContain("Sunucu planı kabul etmedi.");
  });
});
