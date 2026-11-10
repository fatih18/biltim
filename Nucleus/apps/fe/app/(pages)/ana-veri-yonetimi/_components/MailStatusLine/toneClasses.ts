import type { MailStatusTone } from "../../_utils/mailStatusText";

/*
 * Colours of the mail status line per tone, each with its dark twin (rule 4.3):
 * green when mail goes out, amber when it is off or some mails did not or will
 * not go out.
 */
export const TONE_CLASSES: Record<MailStatusTone, { box: string; detail: string }> = {
  on: {
    box: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
    detail: "text-emerald-800 dark:text-emerald-200",
  },
  off: {
    box: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100",
    detail: "text-amber-800 dark:text-amber-200",
  },
  attention: {
    box: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100",
    detail: "text-amber-800 dark:text-amber-200",
  },
};
