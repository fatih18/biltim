import type { ReactNode } from "react";
import { PASSIVE_NOTICE } from "../../_utils/attendanceText";

export type QuestionsFieldsetProps = {
  /** True while the attendance box is not ticked (_utils/attendance.ts → isAuditPassive). */
  passive: boolean;
  children: ReactNode;
};

/**
 * The question sections of the audit form. Passive, a disabled fieldset
 * switches off every control inside it at once — ratings, detail buttons,
 * and whatever a question gains later — and the sections are greyed, under
 * one line that says what is going to happen and what to do about it.
 */
export function QuestionsFieldset({ passive, children }: QuestionsFieldsetProps) {
  return (
    <>
      {passive ? (
        <p
          role="status"
          className="rounded-md border border-amber-400/60 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200"
        >
          {PASSIVE_NOTICE}
        </p>
      ) : null}
      <fieldset
        disabled={passive}
        aria-label="Denetim soruları"
        className={`m-0 min-w-0 space-y-6 border-0 p-0 ${passive ? "cursor-not-allowed opacity-50 grayscale" : ""}`}
      >
        {children}
      </fieldset>
    </>
  );
}
