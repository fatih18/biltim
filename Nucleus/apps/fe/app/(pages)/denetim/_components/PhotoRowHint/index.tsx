import { PHOTO_ROW_HINT } from "../../_utils/photoRequired";

type PhotoRowHintProps = {
  /** The question demands a photo, raises a finding and has none on the device (photoRequired.ts). */
  missing: boolean;
};

/*
 * The inline message under a question row after a save was refused for a
 * missing photo: what is missing and where to add it. Nothing when the photo
 * is there (or the question never asked for one).
 */
export function PhotoRowHint({ missing }: PhotoRowHintProps) {
  if (!missing) return null;
  return (
    <span
      role="alert"
      className="mt-1 block rounded-sm bg-rose-100 px-1.5 py-1 text-[11px] font-medium text-rose-800 ring-1 ring-rose-500/40 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-400/40"
    >
      {PHOTO_ROW_HINT}
    </span>
  );
}
