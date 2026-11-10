import type { Rating } from "../../_utils/scoring";

type OpenFindingNoticeProps = {
  /** The question's open findings by number ("#7"), see singleFinding.ts → openFindingsFor. */
  labels: readonly string[];
  rating: Rating | null | undefined;
};

/*
 * What the audit form says on a question that already has an open finding:
 * which finding it is, what that means for the answer, and what to do.
 * Orta/Kötü needs no new finding details (the open one is the finding); İyi
 * is allowed, but closing the audit asks for confirmation.
 */
function hintFor(rating: Rating | null | undefined): string {
  if (rating === "good") {
    return "Kapanmamış bulgu varken İyi seçtiniz; denetimi kapatırken onayınız istenecek. Doğru puan Orta ya da Kötü ise değiştirmeniz yeterli.";
  }
  if (rating === "medium" || rating === "bad") {
    return "Bu soru zaten açık bir bulguya bağlı: bulgu detayı istenmez ve ikinci bir bulgu açılmaz, denetimi kapatabilirsiniz.";
  }
  return "Bu soruya bağlı açık bir bulgu var. Orta ya da Kötü seçerseniz yeni bulgu detayı girmeniz gerekmez.";
}

export function OpenFindingNotice({ labels, rating }: OpenFindingNoticeProps) {
  if (labels.length === 0) return null;
  return (
    <span className="mt-1 block">
      <span
        className="inline-flex items-center rounded-sm bg-amber-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-500/40 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/40"
        title="Bu soruya bağlı henüz kapanmamış bulgu var"
      >
        ⚠ Açık bulgu {labels.join(", ")}
      </span>
      <span className="mt-1 block text-[11px] text-slate-700 dark:text-slate-300">{hintFor(rating)}</span>
    </span>
  );
}
