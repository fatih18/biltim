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

/**
 * Whether the finding sits on a question that demands a photo. The question as
 * read NOW decides: Merkez Ekip may have switched the flag off since the form
 * was queued, and that is the way out of a refused record, so a flag stored at
 * queue time must not keep it true. The queued flag speaks only for a question
 * the list no longer knows (deleted, or a standalone single finding).
 */
export function replayRequiresPhoto(input: Pick<ReplayFindingPhotos, "question" | "queuedRequirePhoto">): boolean {
  if (input.question) return input.question.requirePhoto === true;
  return input.queuedRequirePhoto === true;
}

/**
 * Whether the replay may start: the question list in hand is the server's (or
 * the last one read from it), not the built-in fallback. Before that, "the
 * question has no photo rule" would only mean "the list is not here yet", and a
 * finding on a demanding question would be judged by nothing. The caller waits
 * and retries later; an answer from the server with no question at all counts
 * as loaded (no question exists, so no photo rule does either).
 */
export function replayQuestionsReady(input: { answered: boolean; count: number }): boolean {
  return input.answered || input.count > 0;
}

/** Said when the replay was asked to start before the questions were read. */
export const REPLAY_WAITS_FOR_QUESTIONS_TEXT =
  "Çevrimdışı kayıtlar henüz gönderilmedi: soru listesi okunamadığı için hangi bulguların fotoğraf istediği bilinmiyor. Bağlantıyı kontrol edip sayfayı yenileyin ya da biraz sonra tekrar deneyin; kayıtlar cihazda duruyor.";

/** The phrase every refusal text of the replay's own photo gate carries; the discard confirmation recognises the record by it. */
export const REPLAY_PHOTO_REFUSAL_MARKER = "bulgu fotoğrafı zorunlu ama";

/**
 * What the refused list shows: what is wrong, what it means, what to do. With
 * no photo queued at all there is nothing to retry: "Tekrar dene" would meet
 * the same empty finding, so the only way out is to discard it and enter the
 * finding again with a photo.
 */
export function replayPhotoRefusalText(
  question: Question | undefined,
  steps: readonly Step[],
  queuedPhotoCount: number,
): string {
  const name = question ? photoGapLabel(question, steps) : "Bu bulgunun sorusu";
  if (queuedPhotoCount === 0) {
    return `${name}: ${REPLAY_PHOTO_REFUSAL_MARKER} bu bulguya hiç fotoğraf eklenmemiş, bu yüzden fotoğrafsız bulgu oluşturulmadı. "Tekrar dene" bir şey değiştirmez; tek yol "Kuyruktan çıkar"a basıp bu bulguyu fotoğrafıyla yeniden girmektir. "Kuyruktan çıkar" bu sorunun bulgusunu kalıcı olarak atlar.`;
  }
  return `${name}: ${REPLAY_PHOTO_REFUSAL_MARKER} fotoğraf sunucuya yüklenemedi, bu yüzden fotoğrafsız bulgu oluşturulmadı. Fotoğraflar cihazda duruyor: bağlantıyı kontrol edip "Tekrar dene"ye basın. "Kuyruktan çıkar" bu sorunun bulgusunu kalıcı olarak atlar.`;
}

/** Create the finding, or set the submission aside before it is created. */
export function replayFindingPhotoDecision(input: ReplayFindingPhotos): ReplayPhotoDecision {
  if (!replayRequiresPhoto(input) || input.uploaded > 0) return { action: "create" };
  const skipped = new Set(input.skippedPhotoIds ?? []);
  return {
    action: "set_aside",
    reason: replayPhotoRefusalText(input.question, input.steps, input.queuedPhotoIds.length),
    releasePhotoIds: input.queuedPhotoIds.filter((id) => skipped.has(id)),
  };
}
