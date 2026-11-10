/*
 * R72: the photos of a finding on a photo-demanding question go up BEFORE any
 * row of the audit is written.
 *
 * The page used to create the audit row, the answers and then each finding,
 * uploading a finding's photos only at the moment it wrote that finding. When
 * the upload failed (a 5xx, no connection) the finding was written WITHOUT its
 * photo, the plan stamp was then refused by the server's photo guard, and the
 * audit stayed half sent with a photoless finding on a question that demands a
 * photo. Here the upload comes first: when a demanding question ends with no
 * photo on the server the whole save stops, nothing is written, and the form
 * keeps what the person entered.
 *
 * Only the questions that demand a photo are handled here. Every other
 * question keeps uploading while its finding is written, as it always did.
 */
import type { Question, Step } from "../constants";
import { photoGapLabel } from "./photoRequired";

/** What an upload must return to count: a file id or a url (the shape the finding row stores). */
export type UploadedRef = { fileId?: string | null; fileUrl?: string | null };

/** An answer's photos, as the form holds them on the device. */
export type AnswerPhotos = { questionId: string; photos?: readonly File[] };

/** What one question's photos came to: the uploads that reached the server and how many did not. */
export type UploadedPhotos<U> = { uploaded: U[]; failed: number };

export type PhotosFirstResult<U> =
  | { ok: true; byQuestion: ReadonlyMap<string, UploadedPhotos<U>> }
  | { ok: false; failedQuestions: Question[]; byQuestion: ReadonlyMap<string, UploadedPhotos<U>> };

/** Uploads one file; undefined when the server gave nothing back. A rejection counts as a failed photo. */
export type UploadOne<U> = (file: File) => Promise<U | undefined>;

async function uploadAll<U extends UploadedRef>(files: readonly File[], upload: UploadOne<U>): Promise<UploadedPhotos<U>> {
  const uploaded: U[] = [];
  let failed = 0;
  for (const file of files) {
    try {
      const up = await upload(file);
      if (up && (up.fileId || up.fileUrl)) uploaded.push(up);
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
  return { uploaded, failed };
}

/**
 * Uploads the photos of every answer whose question demands one. A question
 * "fails" when none of its photos reached the server (or it had none): that is
 * the finding that must not be written. Questions that do not demand a photo
 * are left out of the map, so the caller handles them as before. Every
 * demanding question is tried, so one message can name them all.
 */
export async function uploadPhotosFirst<U extends UploadedRef>(input: {
  items: readonly AnswerPhotos[];
  questions: readonly Question[];
  upload: UploadOne<U>;
}): Promise<PhotosFirstResult<U>> {
  const byQuestion = new Map<string, UploadedPhotos<U>>();
  const failedQuestions: Question[] = [];
  for (const item of input.items) {
    const question = input.questions.find((q) => q.id === item.questionId);
    if (!question || question.requirePhoto !== true || byQuestion.has(question.id)) continue;
    const result = await uploadAll(item.photos ?? [], input.upload);
    byQuestion.set(question.id, result);
    if (result.uploaded.length === 0) failedQuestions.push(question);
  }
  if (failedQuestions.length === 0) return { ok: true, byQuestion };
  return { ok: false, failedQuestions, byQuestion };
}

/**
 * The upload with a memory of what already reached the server, per file. A save
 * that stops on one failed photo is tried again by the person, and the photos
 * that did go up must not travel a second time over the same weak connection.
 */
export function rememberingUpload<U extends UploadedRef>(upload: UploadOne<U>, memory: WeakMap<File, U>): UploadOne<U> {
  return async (file) => {
    const known = memory.get(file);
    if (known) return known;
    const up = await upload(file);
    if (up && (up.fileId || up.fileUrl)) memory.set(file, up);
    return up;
  };
}

/**
 * The last door before a finding row is written: a finding on a demanding
 * question needs at least one photo on the server, whatever path got it here.
 * A question that does not demand one is never held back.
 */
export function findingMayBeWritten(question: Pick<Question, "requirePhoto">, uploadedPhotos: number): boolean {
  return question.requirePhoto !== true || uploadedPhotos > 0;
}

/** Which save the message is for: it opens with what was not saved. */
export type PhotoAbortSubject = "audit" | "single";

/**
 * The message that stays when the save stopped for photos that did not upload:
 * what is wrong, what it means (nothing was written, the form is intact) and
 * what to do.
 */
export function photoUploadAbortText(input: {
  failed: readonly Question[];
  steps: readonly Step[];
  subject: PhotoAbortSubject;
}): string {
  const labels = input.failed.map((question) => photoGapLabel(question, input.steps)).join("; ");
  const where = input.failed.length === 1 ? "şu sorunun" : "şu soruların";
  const opening = input.subject === "audit" ? "Denetim kaydedilmedi" : "Tekil bulgu kaydedilmedi";
  const kept = input.subject === "audit" ? "yanıtlarınız ve fotoğraflarınız formda duruyor" : "girdiğiniz bilgiler ve fotoğraflar formda duruyor";
  const again = input.subject === "audit" ? "Kaydet düğmesine tekrar basın" : "tekrar kaydedin";
  return `${opening}: bulgu fotoğrafı zorunlu olan ${where} fotoğrafı sunucuya yüklenemedi: ${labels}. Fotoğrafsız bulgu kabul edilmediği için hiçbir şey kaydedilmedi; ${kept}. İnternet bağlantınızı kontrol edip ${again}. Sorun sürerse fotoğrafı silip yeniden çekin ya da küçültün.`;
}
