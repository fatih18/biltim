import { describe, expect, it } from "bun:test";
import type { Question, Step } from "../constants";
import {
  REPLAY_WAITS_FOR_QUESTIONS_TEXT,
  type ReplayFindingPhotos,
  replayFindingPhotoDecision,
  replayPhotoRefusalText,
  replayQuestionsReady,
  replayRequiresPhoto,
} from "./replayPhotoGate";

const steps: Step[] = [{ code: "S1", title: "1 - Sınıflandırma", maxScore: 20, order: 1 }];
const question = (id: string, requirePhoto?: boolean): Question => ({
  id,
  stepCode: "S1",
  order: 2,
  text: `Soru ${id}`,
  maxScore: 5,
  requireExplanation: true,
  ...(requirePhoto === undefined ? {} : { requirePhoto }),
});
const demanding = question("S1-Q2", true);
const plain = question("S1-Q3", false);

/** A queued finding whose photos were all refused for good: the case the decision exists for. */
const refusedForGood = (over: Partial<ReplayFindingPhotos> = {}): ReplayFindingPhotos => ({
  question: demanding,
  queuedRequirePhoto: true,
  queuedPhotoIds: ["p1", "p2"],
  skippedPhotoIds: ["p1", "p2"],
  uploaded: 0,
  steps,
  ...over,
});

describe("replayFindingPhotoDecision: the finding is not created without its photo (R72)", () => {
  it("sets the submission aside, before the finding exists, when every photo was refused for good", () => {
    const decision = replayFindingPhotoDecision(refusedForGood());
    expect(decision.action).toBe("set_aside");
  });

  it("gives the reason the refused list shows: the question, why, and what to do", () => {
    const decision = replayFindingPhotoDecision(refusedForGood());
    if (decision.action !== "set_aside") throw new Error("expected set_aside");
    expect(decision.reason).toContain("1.2 · Soru S1-Q2");
    expect(decision.reason).toContain("fotoğrafsız bulgu oluşturulmadı");
    expect(decision.reason).toContain('"Tekrar dene"');
    expect(decision.reason).toContain("Kuyruktan çıkar");
  });

  it("releases the photos skipped for this finding, so a retry tries them again", () => {
    const decision = replayFindingPhotoDecision(
      refusedForGood({ queuedPhotoIds: ["p1", "p2"], skippedPhotoIds: ["p1", "p2", "other-finding-photo"] }),
    );
    if (decision.action !== "set_aside") throw new Error("expected set_aside");
    expect(decision.releasePhotoIds).toEqual(["p1", "p2"]);
  });

  it("creates the finding as soon as one photo is on the server", () => {
    expect(replayFindingPhotoDecision(refusedForGood({ uploaded: 1 }))).toEqual({ action: "create" });
  });

  it("sets aside a demanding finding that was queued with no photo at all", () => {
    const decision = replayFindingPhotoDecision(refusedForGood({ queuedPhotoIds: [], skippedPhotoIds: undefined }));
    if (decision.action !== "set_aside") throw new Error("expected set_aside");
    expect(decision.releasePhotoIds).toEqual([]);
  });

  it("changes nothing for a question that does not demand a photo: no new behaviour", () => {
    expect(
      replayFindingPhotoDecision(refusedForGood({ question: plain, queuedRequirePhoto: false })),
    ).toEqual({ action: "create" });
    expect(
      replayFindingPhotoDecision(refusedForGood({ question: undefined, queuedRequirePhoto: undefined })),
    ).toEqual({ action: "create" });
  });
});

describe("replayRequiresPhoto: the question as read now decides; the queued flag only speaks for an unknown question", () => {
  it("uses the queued flag when the question is not in the list (deleted, or a standalone single finding)", () => {
    expect(replayRequiresPhoto({ question: undefined, queuedRequirePhoto: true })).toBe(true);
    expect(replayRequiresPhoto({ question: undefined, queuedRequirePhoto: false })).toBe(false);
    expect(replayRequiresPhoto({ question: undefined, queuedRequirePhoto: undefined })).toBe(false);
  });

  it("is true by the question as read now, for a form queued before the flag existed", () => {
    expect(replayRequiresPhoto({ question: demanding, queuedRequirePhoto: undefined })).toBe(true);
    expect(replayRequiresPhoto({ question: demanding, queuedRequirePhoto: false })).toBe(true);
  });

  it("a flag queued as true no longer holds once Merkez Ekip switched the question's flag off", () => {
    expect(replayRequiresPhoto({ question: plain, queuedRequirePhoto: true })).toBe(false);
    expect(replayRequiresPhoto({ question: question("S1-Q4"), queuedRequirePhoto: true })).toBe(false);
  });

  it("is false when the question says so and nothing was queued", () => {
    expect(replayRequiresPhoto({ question: plain, queuedRequirePhoto: false })).toBe(false);
    expect(replayRequiresPhoto({ question: question("S1-Q4"), queuedRequirePhoto: undefined })).toBe(false);
  });
});

describe("replayFindingPhotoDecision after the flag was switched off", () => {
  it("creates the finding of a refused record whose question no longer demands a photo: the way out works", () => {
    expect(
      replayFindingPhotoDecision(refusedForGood({ question: plain, queuedRequirePhoto: true, uploaded: 0 })),
    ).toEqual({ action: "create" });
  });

  it("still sets aside an old record without the flag when the question as read now demands a photo", () => {
    const decision = replayFindingPhotoDecision(refusedForGood({ queuedRequirePhoto: undefined }));
    expect(decision.action).toBe("set_aside");
  });
});

describe("replayQuestionsReady: the replay waits for the real question list", () => {
  it("is not ready with no answer from the server and no list in hand (only the built-in fallback)", () => {
    expect(replayQuestionsReady({ answered: false, count: 0 })).toBe(false);
  });

  it("is ready with the server's list, the last one read from it, or an answer that holds no question", () => {
    expect(replayQuestionsReady({ answered: true, count: 12 })).toBe(true);
    expect(replayQuestionsReady({ answered: false, count: 12 })).toBe(true);
    expect(replayQuestionsReady({ answered: true, count: 0 })).toBe(true);
  });

  it("says what is wrong, what it means and what to do when the replay waits", () => {
    expect(REPLAY_WAITS_FOR_QUESTIONS_TEXT).toContain("soru listesi okunamadığı için");
    expect(REPLAY_WAITS_FOR_QUESTIONS_TEXT).toContain("kayıtlar cihazda duruyor");
    expect(REPLAY_WAITS_FOR_QUESTIONS_TEXT).toContain("sayfayı yenileyin");
  });
});

describe("replayPhotoRefusalText", () => {
  it("falls back to a generic name when the question is not known", () => {
    expect(replayPhotoRefusalText(undefined, steps, 1)).toContain("Bu bulgunun sorusu");
  });

  it("with photos queued, points at 'Tekrar dene' and says the photos stay on the device", () => {
    const text = replayPhotoRefusalText(demanding, steps, 2);
    expect(text).toContain('"Tekrar dene"');
    expect(text).toContain("Fotoğraflar cihazda duruyor");
    expect(text).toContain("fotoğraf sunucuya yüklenemedi");
  });

  it("with no photo queued at all, says none was added and that the only way out is to discard and re-enter it, never 'Tekrar dene'", () => {
    const text = replayPhotoRefusalText(demanding, steps, 0);
    expect(text).toContain("hiç fotoğraf eklenmemiş");
    expect(text).toContain("fotoğrafsız bulgu oluşturulmadı");
    expect(text).toContain("tek yol");
    expect(text).toContain("Kuyruktan çıkar");
    expect(text).toContain("fotoğrafıyla yeniden girmektir");
    expect(text).toContain('"Tekrar dene" bir şey değiştirmez');
    expect(text).not.toContain("basın");
    expect(text).not.toContain("Fotoğraflar cihazda duruyor");
  });

  it("the decision picks the variant from the queued photo ids", () => {
    const none = replayFindingPhotoDecision(refusedForGood({ queuedPhotoIds: [], skippedPhotoIds: undefined }));
    const some = replayFindingPhotoDecision(refusedForGood());
    if (none.action !== "set_aside" || some.action !== "set_aside") throw new Error("expected set_aside");
    expect(none.reason).toContain("hiç fotoğraf eklenmemiş");
    expect(some.reason).toContain('"Tekrar dene"ye basın');
  });
});
