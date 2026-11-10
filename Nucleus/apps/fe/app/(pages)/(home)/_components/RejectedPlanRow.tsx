import { RESEND_LABEL } from "@/app/_utils/planReview";
import { RejectedPlanNote } from "./RejectedPlanNote";

/**
 * The second line of a rejected plan's row (R30): why Merkez Ekip returned the
 * audit, and the team's way back into it.
 *
 * It is a child of the plan row's grid and spans the whole row at every width.
 * The reason runs to 500 characters and the button's label is long, so neither
 * belongs in the status cell, which is a sixth of the row on a table and half a
 * card on a phone. On a phone the note sits over a full-width button (a thumb
 * target); from `sm` the button stands to the right of the note.
 */
export function RejectedPlanRow(props: {
  reason: string | null | undefined;
  rejectedAt: string | null | undefined;
  /** Given only to the plan's team and admins; without it the row is the note alone. */
  onCorrect?: () => void;
}) {
  const { reason, rejectedAt, onCorrect } = props;
  return (
    <div className="col-span-2 mt-1 flex flex-col gap-2 border-t border-amber-200 pt-2 sm:col-span-3 sm:flex-row sm:items-start sm:gap-3 md:col-span-12 dark:border-amber-500/30">
      <div className="min-w-0 sm:flex-1">
        <RejectedPlanNote reason={reason} rejectedAt={rejectedAt} />
      </div>
      {onCorrect ? (
        <button
          type="button"
          onClick={onCorrect}
          className="min-h-11 w-full shrink-0 rounded-md border border-amber-700/60 bg-amber-200 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:min-h-0 sm:w-auto dark:border-amber-600/60 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/60 dark:focus-visible:ring-amber-400"
          title="Denetimi soru-cevap ekranında düzelt; kaydedince onaya yeniden gönderilir"
        >
          {RESEND_LABEL}
        </button>
      ) : null}
    </div>
  );
}
