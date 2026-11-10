/*
 * R72: a question can demand a photo on the finding it raises.
 *
 * `five_s_questions.require_photo` is off for every question until an
 * administrator switches it on (Ana Veri Yönetimi, Sorular). When it is on,
 * the audit form does not let an answer that raises a NEW finding be saved
 * without at least one photo, and says which questions lack one.
 *
 * "Raises a finding" is the form's own rule (scoring.ts → requiresNewFinding):
 * the answer is Orta or Kötü and the question has no open finding yet. A
 * question that already has an open finding (or got a single finding in this
 * audit) writes no new finding, so it is not asked for a photo; the single
 * finding form asks for it itself (singleFindingPhotoRefusal). An answer a
 * correction leaves as it was saved is never re-checked, so audits already sent
 * are untouched, and a passive audit (attendance box not ticked) validates no
 * question at all.
 *
 * The photos judged are the ones the form holds on the device for the answer
 * (`answer.photos`). They are what the online save uploads and what the
 * offline queue stores as blobs, so the same check serves both paths.
 */
import type { Question, Step } from "../constants";
import { type Rating, notGood } from "./scoring";

/** The answer fields the photo rule reads; the form's own answer type carries more. */
export type PhotoRuleAnswer = { rating: Rating | null; photos?: readonly unknown[] };

/**
 * Whether one answer still needs a photo: its question demands one, the answer
 * raises a new finding (`raisesFinding`, decided by the caller with the form's
 * own rule) and no photo is on the device for it.
 */
export function photoMissing(
  question: Pick<Question, "requirePhoto">,
  answer: PhotoRuleAnswer | undefined,
  raisesFinding: boolean,
): boolean {
  if (question.requirePhoto !== true || !raisesFinding) return false;
  if (!answer || !notGood(answer.rating)) return false;
  return (answer.photos?.length ?? 0) === 0;
}

/**
 * The questions whose answer still needs a photo, in question order. Pass the
 * questions the save validates (none while the audit is passive).
 */
export function questionsMissingPhoto<A extends PhotoRuleAnswer>(input: {
  questions: readonly Question[];
  answers: Readonly<Record<string, A | undefined>>;
  raisesFinding: (question: Question, answer: A) => boolean;
}): Question[] {
  return input.questions.filter((question) => {
    const answer = input.answers[question.id];
    return !!answer && photoMissing(question, answer, input.raisesFinding(question, answer));
  });
}

/** A question as the form's "Madde" column numbers it: step order, a dot, question order ("1.2"). */
export function questionNumber(question: Pick<Question, "id" | "stepCode" | "order">, steps: readonly Step[]): string {
  const step = steps.find((s) => s.code === question.stepCode);
  return step ? `${step.order}.${question.order}` : question.id;
}

/** What each missing question is called in the list and the message: its number, then the start of its text. */
export function photoGapLabel(question: Question, steps: readonly Step[]): string {
  const text = question.text.length > 60 ? `${question.text.slice(0, 60)}…` : question.text;
  return `${questionNumber(question, steps)} · ${text}`;
}

/** The inline message on a question that lacks its photo: what is missing, what to do. */
export const PHOTO_ROW_HINT =
  "Fotoğraf eksik: bu soruda bulgu fotoğrafı zorunlu. \"Detay Gir\" düğmesinden en az bir fotoğraf ekleyin.";

/** What the list near the save button says about its questions. */
export const PHOTO_GAP_EXPLANATION =
  "Bu sorularda bulgu fotoğrafı zorunlu; her soruya en az bir fotoğraf eklenmeden form kaydedilemez.";

/** The refusal the save shows (a toast) when questions still lack their photo. */
export function photoGapToast(questions: readonly Question[], steps: readonly Step[]): string {
  const numbers = questions.map((q) => questionNumber(q, steps)).join(", ");
  const subject = questions.length === 1 ? `${numbers} numaralı soruda` : `${numbers} numaralı sorularda`;
  return `Form kaydedilemedi: ${subject} bulgu fotoğrafı zorunlu ve eklenmemiş. Her soru için "Detay Gir" düğmesinden en az bir fotoğraf ekleyin.`;
}

/**
 * The single finding form's own check. A single finding linked to a question
 * that demands a photo is a finding of that question, and it is what spares the
 * audit a second finding on it, so it carries the photo too. Null when it may
 * be saved; otherwise what to tell the person.
 */
export function singleFindingPhotoRefusal(
  question: Pick<Question, "id" | "requirePhoto"> | undefined,
  photos: readonly unknown[] | undefined,
): string | null {
  if (!question || question.requirePhoto !== true) return null;
  if ((photos?.length ?? 0) > 0) return null;
  return `Fotoğraf eklenmedi: ${question.id} sorusunda bulgu fotoğrafı zorunlu, bu yüzden bu soruya bağlı tekil bulgu fotoğrafsız kaydedilemez. En az bir fotoğraf ekleyin.`;
}
