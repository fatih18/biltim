/*
 * R72: what the offline replay does before it writes one queued finding.
 *
 * A photo the server refused for good (too large, a 4xx, an answer with no file
 * id) is skipped so that the queue does not stall on it. For a question that
 * demands a photo that left the finding with none, and the replay wrote it
 * anyway: the plan stamp was refused afterwards, with a photoless finding
 * already on the server. The decision is now taken BEFORE the finding is
 * written: with no photo on the server the finding is not created and the
 * submission is set aside with the reason, the way every other refusal is.
 *
 * The photos the replay skipped for this finding are released, so "Tekrar
 * dene" in the refused list really tries them again instead of meeting the
 * same skip.
 */
import type { Question, Step } from "../constants";
import { photoGapLabel } from "./photoRequired";

/** The queued finding as far as this decision reads it. */
export type ReplayFindingPhotos = {
  /** The question the finding belongs to; null for a standalone single finding. */
  question: Question | undefined;
  /** The flag as it was when the form was queued (the payload carries it). */
  queuedRequirePhoto: boolean | undefined;
  /** The ids of the photos queued for this finding. */
  queuedPhotoIds: readonly string[];
  /** The ids the replay skipped for good so far (this and earlier attempts). */
  skippedPhotoIds: readonly string[] | undefined;
  /** How many of its photos are on the server now. */
  uploaded: number;
  steps: readonly Step[];
};

export type ReplayPhotoDecision =
  | { action: "create" }
  | { action: "set_aside"; reason: string; releasePhotoIds: string[] };

/** Whether the finding sits on a question that demands a photo, by the queued flag or the question as read now. */
export function replayRequiresPhoto(input: Pick<ReplayFindingPhotos, "question" | "queuedRequirePhoto">): boolean {
  return input.queuedRequirePhoto === true || input.question?.requirePhoto === true;
}

/** What the refused list shows: what is wrong, what it means, what to do. */
export function replayPhotoRefusalText(question: Question | undefined, steps: readonly Step[]): string {
  const name = question ? photoGapLabel(question, steps) : "Bu bulgunun sorusu";
  return `${name}: bulgu fotoğrafı zorunlu ama fotoğraf sunucuya yüklenemedi ya da hiç eklenmemiş, bu yüzden fotoğrafsız bulgu oluşturulmadı. Fotoğraflar cihazda duruyor: bağlantıyı kontrol edip "Tekrar dene"ye basın. "Kuyruktan çıkar" bu sorunun bulgusunu kalıcı olarak atlar.`;
}

/** Create the finding, or set the submission aside before it is created. */
export function replayFindingPhotoDecision(input: ReplayFindingPhotos): ReplayPhotoDecision {
  if (!replayRequiresPhoto(input) || input.uploaded > 0) return { action: "create" };
  const skipped = new Set(input.skippedPhotoIds ?? []);
  return {
    action: "set_aside",
    reason: replayPhotoRefusalText(input.question, input.steps),
    releasePhotoIds: input.queuedPhotoIds.filter((id) => skipped.has(id)),
  };
}
