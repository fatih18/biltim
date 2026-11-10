/*
 * What "Kuyruktan çıkar" does to a record the server refused, said BEFORE it is
 * done (the confirmation dialog).
 *
 * Discarding deletes the record and its photos from the device. When the audit
 * of the record already reached the server, the plan is also stamped as sent
 * first, or it would be offered again and audited twice. For a record set aside
 * because a finding on a photo-demanding question has no photo, that stamp is
 * the part nobody expects: the plan goes to approval WITHOUT that question's
 * finding, and the photos that could still have been sent are gone. The dialog
 * says so, in those words, instead of the generic "kayıt silinir".
 */
import { isPhotoRefusal } from "./photoRefusal";
import { REPLAY_PHOTO_REFUSAL_MARKER } from "./replayPhotoGate";

/** The parts of a queued record the decision reads. */
export type DiscardedSubmission = {
  planId: string | null | undefined;
  syncedAuditId: string | null | undefined;
  /** 'single_finding' for the carrier row of a standalone single finding. */
  source: string | undefined;
  /** Why the server refused it: the text the refused list shows. */
  lastError: string | null | undefined;
};

/**
 * Whether discarding stamps the plan as sent first: the audit is on the server,
 * the record belongs to a plan and is not a single finding. The one rule both
 * the confirmation and the discard itself follow, so they cannot drift apart.
 */
export function discardStampsPlan(submission: Pick<DiscardedSubmission, "planId" | "syncedAuditId" | "source">): boolean {
  return !!submission.syncedAuditId && !!submission.planId && submission.source !== "single_finding";
}

/** How a record came to be set aside for a photo: the replay's own gate never created the finding; the server refused the stamp over a finding it already holds. */
export type PhotoSetAside = "gate" | "stamp" | null;

/** Which photo refusal, if any, the record's reason is. */
export function photoSetAsideOf(lastError: string | null | undefined): PhotoSetAside {
  const text = lastError ?? "";
  if (text.includes(REPLAY_PHOTO_REFUSAL_MARKER)) return "gate";
  return isPhotoRefusal([text]) ? "stamp" : null;
}

/** The generic confirmation: the record and its photos leave the device for good. */
function plainMessage(label: string): string {
  return `${label} sunucu tarafından reddedildi ve cihazda bekliyor. Çıkarılırsa bu kayıt ve fotoğrafları cihazdan silinir; geri alınamaz.`;
}

/** What keeps the finding alive: the photos, or the flag that demands them. */
const KEEP_THE_FINDING =
  'Bulguyu korumak istiyorsanız "Vazgeç"e basın: fotoğraflar cihazdaysa bağlantıyı düzeltip "Tekrar dene"yi kullanın ya da Merkez Ekip bu sorunun "Fotoğraf Zorunlu" ayarını kapatsın, sonra "Tekrar dene"ye basın.';

/**
 * The confirmation text. A record set aside for a photo whose audit already
 * synced says what happens and what it means:
 * - the replay never created the finding: the plan is stamped as sent WITHOUT
 *   that question's finding and the photos are deleted, so the finding is lost
 *   unless it is entered again;
 * - the server holds a photoless finding and refuses the stamp: the stamp is
 *   tried once more, may be refused again, and the photos are deleted either way.
 * Every other record keeps the generic text.
 */
export function discardConfirmMessage(label: string, submission: DiscardedSubmission): string {
  const how = photoSetAsideOf(submission.lastError);
  if (how === null || !discardStampsPlan(submission)) return plainMessage(label);
  if (how === "gate") {
    return `${label} denetimi sunucuda kayıtlı; yalnızca fotoğraf zorunlu bir sorunun bulgusu fotoğrafsız olduğu için kuyrukta bekliyor. Çıkarırsanız plan, o sorunun bulgusu OLMADAN onaya gönderilmiş sayılır ve cihazdaki fotoğraflar silinir; bu bulgu kayıt altına alınmamış olur, geri alınamaz. ${KEEP_THE_FINDING}`;
  }
  return `${label} denetimi ve bir bulgusu sunucuda kayıtlı, ancak sunucu bulgunun fotoğrafsız olması yüzünden planı onaya almıyor. Çıkarırsanız plan bir kez daha onaya gönderilmeye çalışılır, yine reddedilebilir; cihazdaki fotoğraflar her durumda silinir ve geri alınamaz. ${KEEP_THE_FINDING}`;
}
