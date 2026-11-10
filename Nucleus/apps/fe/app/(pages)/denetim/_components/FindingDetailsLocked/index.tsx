import type { DetailsLock } from "../../_utils/findingDetailsLock";

type FindingDetailsLockedProps = {
  /** Why no new finding is written from this form (findingDetailsLock.ts); null shows nothing. */
  lock: DetailsLock;
};

const REASONS: Record<NonNullable<DetailsLock>, string> = {
  open_finding: "Bu soruda açık bir bulgu var; yeni bulgu yazılmaz.",
  already_stored:
    "Bu soru denetim gönderilirken zaten Orta/Kötü işaretliydi; bulgusu o zaman yazıldı ve düzeltme yeni bir bulgu yazmaz.",
};

/*
 * Said in place of the finding fields (type, photos, action, due date, place)
 * of a question's detail modal when saving writes no new finding: the question
 * has an open finding, or a correction leaves an answer that was already below
 * İyi. Nothing typed there is saved, so the fields are hidden rather than
 * labelled "isteğe bağlı". The explanation stays: it is written to the answer.
 */
export function FindingDetailsLocked({ lock }: FindingDetailsLockedProps) {
  if (!lock) return null;
  return (
    <p
      role="note"
      className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
    >
      {REASONS[lock]} Bulgu tipi, fotoğraf, alınacak faaliyet, termin ve yer kaydedilmeyeceği için gizlendi; gerekçenizi
      Açıklama alanına yazabilirsiniz.
    </p>
  );
}
