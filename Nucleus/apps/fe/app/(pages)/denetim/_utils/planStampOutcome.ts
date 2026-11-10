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
 *
 * A passing failure (no connection, 5xx) holds the page the same way. It used
 * to show the toast and go home, with the draft already deleted; the audit was
 * then on the server with its plan unsent and nothing on screen to send it
 * again. Now the draft goes only once the stamp went through, and the held
 * page offers "Yeniden gönder" for the same audit, so nobody refills the form
 * and files a second audit for the plan.
 */
import type { Question, Step } from "../constants";
import { isPhotoRefusal, photoRefusalQuestionIds } from "./photoRefusal";
import { photoGapLabel } from "./photoRequired";
import type { SavedGap } from "./resendPlan";

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

/** The label of the button beside the held message: it stamps the same audit again. */
export const STAMP_RETRY_LABEL = "Yeniden gönder";

/**
 * The toast for a stamp that did not go through; `long` for the one that
 * carries the server's reasons. The photo refusal's own sentence asks the
 * reader to add a photo, which this screen cannot do, so the toast only points
 * at the message that stays on the page (heldPlanGap).
 */
export function planStampToast(outcome: PlanStampOutcome): { text: string; long: boolean } {
  if (outcome.kind === "refused" && isPhotoRefusal(outcome.reasons)) {
    return {
      text: "Denetim kaydedildi ancak plan onaya gönderilemedi: fotoğrafı zorunlu bir sorunun bulgusunda fotoğraf yok. Hangi soru olduğu ve yapılacaklar ekrandaki mesajda yazıyor.",
      long: true,
    };
  }
  if (outcome.kind === "refused" && outcome.reasons.length > 0) {
    return { text: `Denetim kaydedildi ancak plan onaya gönderilemedi: ${outcome.reasons.join(" ")}`, long: true };
  }
  if (outcome.kind === "failed") {
    return {
      text: `Denetim kaydedildi ancak plan onaya gönderilemedi (bağlantı sorunu). Ekrandaki "${STAMP_RETRY_LABEL}" düğmesine basın.`,
      long: false,
    };
  }
  return { text: "Denetim kaydedildi ancak plan onaya gönderilemedi. Lütfen yöneticinize bildirin.", long: false };
}

/** What stays true whatever the reason: the audit is saved, the plan did not go, and the form must not be filled again. */
const HELD_TAIL =
  "Plan onaya gitmedi ve açık kaldı. Merkez Ekip'e bildirin; denetim zaten kayıtlı olduğu için bu planı yeniden doldurmayın.";

/** The stamp did not get an answer: the audit is saved, nothing is wrong with it, and the same stamp can be sent again. */
const PASSING_FAILURE_TEXT = `Denetim ve bulguları kaydedildi ancak plan onaya gönderilemedi: bağlantı kesildi ya da sunucu yanıt vermedi. Denetim zaten kayıtlı olduğu için bu planı yeniden doldurmayın; bağlantınızı kontrol edip "${STAMP_RETRY_LABEL}" düğmesine basın.`;

/**
 * The photo refusal in the page's own words: which questions have a finding
 * without its photo (named from the codes the server's message carries), that
 * a photo cannot be added from this screen, and the way out (photoHeldTail:
 * Merkez Ekip switches the photo flag off, then "Yeniden gönder"). The server's own
 * sentence says "add a photo", a task the reader cannot do here, so it is not
 * repeated.
 */
function photoRefusalText(reasons: readonly string[], questions: readonly Question[], steps: readonly Step[]): string {
  const labels = photoRefusalQuestionIds(reasons).map((id) => {
    const question = questions.find((q) => q.id === id);
    return question ? photoGapLabel(question, steps) : id;
  });
  const subject =
    labels.length === 0
      ? "bulgu fotoğrafı zorunlu olan sorularda"
      : labels.length === 1
        ? "bulgu fotoğrafı zorunlu olan şu soruda"
        : "bulgu fotoğrafı zorunlu olan şu sorularda";
  const list = labels.length > 0 ? `: ${labels.join("; ")}` : "";
  return `Denetim ve bulguları kaydedildi ancak onaya gönderilemedi: ${subject} fotoğrafsız bulgu var${list}. Fotoğrafsız bulgu kabul edilmez ve bu ekrandan fotoğraf eklenemez. ${photoHeldTail(labels.length)}`;
}

/**
 * The way out of the photo refusal, which is a switch and not a message to
 * pass on: Merkez Ekip turns "Fotoğraf Zorunlu" off for the named question(s)
 * in Ana Veri Yönetimi > Sorular, and the server checks that flag when the plan
 * is stamped, so "Yeniden gönder" on this screen passes afterwards.
 */
function photoHeldTail(questionCount: number): string {
  const which = questionCount === 0 ? "ilgili sorular" : questionCount === 1 ? "bu soru" : "bu sorular";
  return `Plan onaya gitmedi ve açık kaldı. Çıkış yolu: Merkez Ekip, Ana Veri Yönetimi > Sorular ekranında ${which} için "Fotoğraf Zorunlu" ayarını kapatmalı; ardından bu ekrandaki "${STAMP_RETRY_LABEL}" düğmesine basın, plan geçer. Denetim zaten kayıtlı olduğu için bu planı yeniden doldurmayın.`;
}

/**
 * The message that stays on the page when the stamp did not go through: what
 * is wrong, what it means, what to do. For the photo refusal it names the
 * questions (`questions` is the form's list, to turn the server's codes into
 * numbers and texts); any other refusal gives the server's own reasons; a
 * failure that passes says the same stamp can be sent again. Null when the
 * stamp went through (the draft goes and the page leaves).
 */
export function heldPlanGap(
  outcome: PlanStampOutcome,
  questions: readonly Question[],
  steps: readonly Step[],
): SavedGap | null {
  if (outcome.kind === "sent") return null;
  if (outcome.kind === "failed") return { kind: "unsent", text: PASSING_FAILURE_TEXT };
  if (isPhotoRefusal(outcome.reasons)) {
    return { kind: "unsent", text: photoRefusalText(outcome.reasons, questions, steps) };
  }
  const why = outcome.reasons.length > 0 ? ` ${outcome.reasons.join(" ")}` : " Sunucu planı kabul etmedi.";
  return { kind: "unsent", text: `Denetim kaydedildi ancak plan onaya gönderilemedi:${why} ${HELD_TAIL}` };
}
