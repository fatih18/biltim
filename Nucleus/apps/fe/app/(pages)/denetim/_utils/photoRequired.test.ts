import { describe, expect, it } from "bun:test";
import type { Question, Step } from "../constants";
import { buildAuditRecord } from "./auditRecord";
import {
  PHOTO_ROW_HINT,
  photoGapLabel,
  photoGapToast,
  photoMissing,
  questionNumber,
  questionsMissingPhoto,
  singleFindingPhotoRefusal,
} from "./photoRequired";
import { type Rating, requiresNewFinding } from "./scoring";

const steps: Step[] = [
  { code: "S1", title: "1 - Sınıflandırma", maxScore: 20, order: 1 },
  { code: "S2", title: "2 - Sıralama", maxScore: 20, order: 2 },
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

const photo = new File(["x"], "bulgu.jpg", { type: "image/jpeg" });

type Answer = { questionId: string; rating: Rating | null; photos: File[] };
const answer = (questionId: string, rating: Rating | null, photos: File[] = []): Answer => ({
  questionId,
  rating,
  photos,
});

describe("photoMissing — one answer (R72)", () => {
  const demands = { requirePhoto: true };

  it("is missing when the question demands a photo, a new finding is raised and none is on the device", () => {
    expect(photoMissing(demands, answer("q", "bad"), true)).toBe(true);
    expect(photoMissing(demands, answer("q", "medium"), true)).toBe(true);
  });

  it("is satisfied by one photo held on the device", () => {
    expect(photoMissing(demands, answer("q", "bad", [photo]), true)).toBe(false);
  });

  it("asks nothing of a question that does not demand a photo: every existing question", () => {
    expect(photoMissing({ requirePhoto: false }, answer("q", "bad"), true)).toBe(false);
    expect(photoMissing({}, answer("q", "bad"), true)).toBe(false);
    expect(photoMissing({ requirePhoto: undefined }, answer("q", "medium"), true)).toBe(false);
  });

  it("asks nothing when no new finding is raised", () => {
    expect(photoMissing(demands, answer("q", "bad"), false)).toBe(false);
  });

  it("asks nothing of an İyi or an unanswered question, whatever the caller says", () => {
    expect(photoMissing(demands, answer("q", "good"), true)).toBe(false);
    expect(photoMissing(demands, answer("q", null), true)).toBe(false);
    expect(photoMissing(demands, undefined, true)).toBe(false);
  });
});

describe("questionsMissingPhoto — the form (R72)", () => {
  const questions = [
    question("S1-Q1", "S1", 1, true),
    question("S1-Q2", "S1", 2),
    question("S2-Q1", "S2", 1, true),
    question("S2-Q2", "S2", 2, true),
  ];
  const raisesNow = (_q: Question, ans: Answer) => requiresNewFinding(ans.rating, { hasOpenFinding: false });

  it("lists the demanding questions answered Orta or Kötü without a photo, in question order", () => {
    const answers = {
      "S1-Q1": answer("S1-Q1", "bad"),
      "S1-Q2": answer("S1-Q2", "bad"),
      "S2-Q1": answer("S2-Q1", "medium", [photo]),
      "S2-Q2": answer("S2-Q2", "medium"),
    };
    const gap = questionsMissingPhoto({ questions, answers, raisesFinding: raisesNow });
    expect(gap.map((q) => q.id)).toEqual(["S1-Q1", "S2-Q2"]);
  });

  it("does not ask for a photo on a question that already has an open finding", () => {
    const answers = { "S1-Q1": answer("S1-Q1", "bad"), "S2-Q1": answer("S2-Q1", "bad") };
    const open = (q: Question, ans: Answer) =>
      requiresNewFinding(ans.rating, { hasOpenFinding: q.id === "S1-Q1" });
    const gap = questionsMissingPhoto({ questions, answers, raisesFinding: open });
    expect(gap.map((q) => q.id)).toEqual(["S2-Q1"]);
  });

  it("leaves an answer a correction did not change alone, and an old audit's answers with it", () => {
    const answers = { "S1-Q1": answer("S1-Q1", "bad") };
    const stored = (_q: Question, ans: Answer) => requiresNewFinding(ans.rating, { hasOpenFinding: false, storedRating: "bad" });
    expect(questionsMissingPhoto({ questions, answers, raisesFinding: stored })).toEqual([]);
    const wasGood = (_q: Question, ans: Answer) => requiresNewFinding(ans.rating, { hasOpenFinding: false, storedRating: "good" });
    expect(questionsMissingPhoto({ questions, answers, raisesFinding: wasGood }).map((q) => q.id)).toEqual(["S1-Q1"]);
  });

  it("finds nothing when no question demands a photo", () => {
    const plain = [question("S1-Q1", "S1", 1), question("S1-Q2", "S1", 2, false)];
    const answers = { "S1-Q1": answer("S1-Q1", "bad"), "S1-Q2": answer("S1-Q2", "bad") };
    expect(questionsMissingPhoto({ questions: plain, answers, raisesFinding: raisesNow })).toEqual([]);
  });

  it("finds nothing for a passive audit, whose record validates no question", () => {
    const answers = { "S1-Q1": answer("S1-Q1", "bad") };
    const record = buildAuditRecord({
      attendance: { locationHasFieldManager: true, fieldManagerAttended: false },
      steps,
      questions,
      answers,
      hasOpenFinding: () => false,
      needsFinding: () => true,
    });
    expect(record.passive).toBe(true);
    const gap = questionsMissingPhoto({ questions: record.toValidate, answers: record.answers, raisesFinding: raisesNow });
    expect(gap).toEqual([]);
  });

  it("asks again once the audit counts: attendance ticked, the record validates every question", () => {
    const answers = { "S1-Q1": answer("S1-Q1", "bad") };
    const record = buildAuditRecord({
      attendance: { locationHasFieldManager: true, fieldManagerAttended: true },
      steps,
      questions,
      answers,
      hasOpenFinding: () => false,
      needsFinding: () => true,
    });
    const gap = questionsMissingPhoto({ questions: record.toValidate, answers: record.answers, raisesFinding: raisesNow });
    expect(gap.map((q) => q.id)).toEqual(["S1-Q1"]);
  });
});

describe("the words (R72)", () => {
  const first = question("S1-Q2", "S1", 2, true);
  const second = question("S2-Q1", "S2", 1, true);

  it("numbers a question the way the Madde column does", () => {
    expect(questionNumber(first, steps)).toBe("1.2");
    expect(questionNumber(second, steps)).toBe("2.1");
    // A step the form does not know falls back to the question's own id.
    expect(questionNumber(question("S3-Q1", "S3", 1), steps)).toBe("S3-Q1");
  });

  it("labels a question by number and the start of its text", () => {
    expect(photoGapLabel(first, steps)).toBe("1.2 · Soru S1-Q2");
    const long = { ...first, text: "a".repeat(80) };
    expect(photoGapLabel(long, steps)).toBe(`1.2 · ${"a".repeat(60)}…`);
  });

  it("tells what is missing and what to do, in the singular and the plural", () => {
    expect(photoGapToast([first], steps)).toBe(
      'Form kaydedilemedi: 1.2 numaralı soruda bulgu fotoğrafı zorunlu ve eklenmemiş. Her soru için "Detay Gir" düğmesinden en az bir fotoğraf ekleyin.',
    );
    expect(photoGapToast([first, second], steps)).toContain("1.2, 2.1 numaralı sorularda");
  });

  it("gives the inline hint the same two parts", () => {
    expect(PHOTO_ROW_HINT).toContain("Fotoğraf eksik");
    expect(PHOTO_ROW_HINT).toContain("en az bir fotoğraf ekleyin");
  });
});

describe("singleFindingPhotoRefusal — the single finding form (R72)", () => {
  it("refuses a finding linked to a demanding question when it has no photo", () => {
    const text = singleFindingPhotoRefusal({ id: "S3-Q4", requirePhoto: true }, []);
    expect(text).toContain("S3-Q4");
    expect(text).toContain("fotoğrafsız kaydedilemez");
    expect(singleFindingPhotoRefusal({ id: "S3-Q4", requirePhoto: true }, undefined)).not.toBeNull();
  });

  it("lets it through with a photo, without a linked question, or on a question that asks for none", () => {
    expect(singleFindingPhotoRefusal({ id: "S3-Q4", requirePhoto: true }, [photo])).toBeNull();
    expect(singleFindingPhotoRefusal(undefined, [])).toBeNull();
    expect(singleFindingPhotoRefusal({ id: "S3-Q4", requirePhoto: false }, [])).toBeNull();
    expect(singleFindingPhotoRefusal({ id: "S3-Q4" }, [])).toBeNull();
  });
});
