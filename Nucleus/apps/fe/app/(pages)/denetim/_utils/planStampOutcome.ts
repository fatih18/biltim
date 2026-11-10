/*
 * What stamping the plan as sent came to, and what the page does about it.
 *
 * markPlanCompleted used to swallow the failure (an error toast) and the save
 * went on to say "Denetim başarıyla kaydedildi." and leave the page. When the
 * server REFUSES the stamp (4xx: R72's finding without its required photo, a
 * plan that is no longer the team's, ...) the audit is on the server but its
 * plan is not sent, and that must not look like a clean save. A refusal now
 * keeps the form on screen with a message that stays (the same place and look
 * a correction's "saved but not sent" uses: SavedWithGap) and no success toast.
 * A passing failure (no connection, 5xx) keeps the earlier behaviour: the
 * toast, then the way home.
 */
import type { Question, Step } from "../constants";
import { isPhotoRefusal } from "./photoRefusal";
import { photoGapLabel } from "./photoRequired";
import type { FindingWrite, SavedGap } from "./resendPlan";

export type PlanStampOutcome =
  | { kind: "sent" }
  | { kind: "refused"; reasons: readonly string[] }
  | { kind: "failed" };

/** The stamp went through. */
export const PLAN_STAMPED: PlanStampOutcome = { kind: "sent" };

/** The outcome of a stamp that threw: `refused` when the server read it and said no (4xx), with its reasons. */
export function planStampFailure(input: { refused: boolean; reasons: readonly string[] }): PlanStampOutcome {
  return input.refused ? { kind: "refused", reasons: input.reasons } : { kind: "failed" };
}

/** The toast for a stamp that did not go through; `long` for the one that carries the server's reasons. */
export function planStampToast(outcome: PlanStampOutcome): { text: string; long: boolean } {
  if (outcome.kind === "refused" && outcome.reasons.length > 0) {
    return { text: `Denetim kaydedildi ancak plan onaya gönderilemedi: ${outcome.reasons.join(" ")}`, long: true };
  }
  return { text: "Denetim kaydedildi ancak plan onaya gönderilemedi. Lütfen yöneticinize bildirin.", long: false };
}

/** The answers whose findings were just written, as the page holds them. */
export type WrittenAnswer = { questionId: string; photos?: readonly File[] };

/**
 * The questions whose finding was saved without a single photo although the
 * question demands one: every photo of it failed to upload. A finding that
 * did not save at all is not "a finding without a photo" (the server counts
 * the rows it has), so it is left out. Each question once, in answer order.
 * `writes[i]` is what writing `answers[i]` came to (page.tsx createFindingForAnswer).
 */
export function questionsLeftWithoutPhoto(input: {
  answers: readonly WrittenAnswer[];
  writes: readonly FindingWrite[];
  questions: readonly Question[];
}): Question[] {
  const left: Question[] = [];
  input.answers.forEach((answer, index) => {
    const question = input.questions.find((q) => q.id === answer.questionId);
    const write = input.writes[index];
    if (!question || question.requirePhoto !== true || !write?.saved) return;
    if ((answer.photos?.length ?? 0) - write.failedPhotos > 0) return;
    if (!left.some((q) => q.id === question.id)) left.push(question);
  });
  return left;
}

/** What stays true whatever the reason: the audit is saved, the plan did not go, and the form must not be filled again. */
const HELD_TAIL =
  "Plan onaya gitmedi ve açık kaldı. Merkez Ekip'e bildirin; denetim zaten kayıtlı olduğu için bu planı yeniden doldurmayın.";

/**
 * The message that stays on the page when the server refused the stamp: what
 * is wrong, what it means, what to do. For the photo refusal it names the
 * questions (`withoutPhoto`, from questionsLeftWithoutPhoto); when the page
 * cannot name them it gives the server's own words, which carry the question
 * codes. Null when the stamp was not refused (the page goes on as before).
 */
export function heldPlanGap(
  outcome: PlanStampOutcome,
  withoutPhoto: readonly Question[],
  steps: readonly Step[],
): SavedGap | null {
  if (outcome.kind !== "refused") return null;
  if (isPhotoRefusal(outcome.reasons) && withoutPhoto.length > 0) {
    const labels = withoutPhoto.map((question) => photoGapLabel(question, steps)).join("; ");
    const subject = withoutPhoto.length === 1 ? "şu soruda" : "şu sorularda";
    return {
      kind: "unsent",
      text: `Denetim ve bulguları kaydedildi ancak onaya gönderilemedi: bulgu fotoğrafı zorunlu olan ${subject} bulguya fotoğraf eklenemedi (yükleme başarısız oldu): ${labels}. Fotoğrafsız bulgu kabul edilmediği için ${HELD_TAIL}`,
    };
  }
  const why = outcome.reasons.length > 0 ? ` ${outcome.reasons.join(" ")}` : " Sunucu planı kabul etmedi.";
  return { kind: "unsent", text: `Denetim kaydedildi ancak plan onaya gönderilemedi:${why} ${HELD_TAIL}` };
}
