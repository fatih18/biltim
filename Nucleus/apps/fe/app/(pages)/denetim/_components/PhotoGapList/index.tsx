import { PHOTO_GAP_EXPLANATION } from "../../_utils/photoRequired";

type PhotoGapListProps = {
  /** One label per question that still lacks its photo (photoRequired.ts → photoGapLabel); empty hides the list. */
  labels: readonly string[];
};

/*
 * The list next to the save button of the questions that block it for a
 * missing photo, with the reason. Shown after the first save attempt, the same
 * moment the rows turn red.
 */
export function PhotoGapList({ labels }: PhotoGapListProps) {
  if (labels.length === 0) return null;
  return (
    <section
      aria-label="Fotoğrafı eksik sorular"
      className="w-full rounded-md border border-rose-400/60 bg-rose-50 px-3 py-2 text-[11px] text-rose-800 dark:border-rose-400/40 dark:bg-rose-950/30 dark:text-rose-200 sm:max-w-md"
    >
      <p className="font-semibold">
        Fotoğrafı eksik {labels.length} soru var
      </p>
      <ul className="mt-1 list-inside list-disc space-y-0.5">
        {labels.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
      <p className="mt-1 text-rose-700 dark:text-rose-300">{PHOTO_GAP_EXPLANATION}</p>
    </section>
  );
}
