type FindingDetailsLockedProps = {
  /** True when the question already has an open finding: no new finding is written from this form. */
  locked: boolean;
};

/*
 * Said in place of the finding fields (type, photos, action, due date, place)
 * of a question's detail modal when the question already has an open finding.
 * Nothing typed there is saved — the open finding is the record — so the
 * fields are hidden rather than labelled "isteğe bağlı". The explanation
 * stays: it is written to the answer.
 */
export function FindingDetailsLocked({ locked }: FindingDetailsLockedProps) {
  if (!locked) return null;
  return (
    <p
      role="note"
      className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
    >
      Bu soruda açık bir bulgu var; yeni bulgu yazılmaz. Bulgu tipi, fotoğraf, alınacak faaliyet, termin ve yer
      kaydedilmeyeceği için gizlendi; gerekçenizi Açıklama alanına yazabilirsiniz.
    </p>
  );
}
