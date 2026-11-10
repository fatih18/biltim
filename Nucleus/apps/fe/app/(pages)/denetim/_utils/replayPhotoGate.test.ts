import { describe, expect, it } from "bun:test";
import type { Question, Step } from "../constants";
import {
  type ReplayFindingPhotos,
  replayFindingPhotoDecision,
  replayPhotoRefusalText,
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

describe("replayRequiresPhoto: the queued flag and the question as read now both count", () => {
  it("is true by the flag the form queued, even when the question list is not loaded yet", () => {
    expect(replayRequiresPhoto({ question: undefined, queuedRequirePhoto: true })).toBe(true);
  });

  it("is true by the question as read now, for a form queued before the flag existed", () => {
    expect(replayRequiresPhoto({ question: demanding, queuedRequirePhoto: undefined })).toBe(true);
    expect(replayRequiresPhoto({ question: demanding, queuedRequirePhoto: false })).toBe(true);
  });

  it("is false when neither says so", () => {
    expect(replayRequiresPhoto({ question: plain, queuedRequirePhoto: false })).toBe(false);
    expect(replayRequiresPhoto({ question: question("S1-Q4"), queuedRequirePhoto: undefined })).toBe(false);
  });
});

describe("replayPhotoRefusalText", () => {
  it("falls back to a generic name when the question is not known", () => {
    expect(replayPhotoRefusalText(undefined, steps)).toContain("Bu bulgunun sorusu");
  });
});
