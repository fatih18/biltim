import Link from 'next/link'
import type { SavedGap } from '../../_utils/resendPlan'

type SavedWithGapProps = {
  /** Why the saved correction is not the end of it, with its text; null shows nothing. */
  gap: SavedGap | null
}

/*
 * Beside the save button once a correction was saved but not sent, or only
 * partly written: the page stays on screen (the held lock keeps a second pass
 * from adding the answers twice), so the way home has to be on it. The text is
 * the one the toast gave, kept here once the toast is gone: sent-again failures
 * and failed writes each carry their own wording (resendPlan.ts → correctionEnd).
 */
export function SavedWithGap({ gap }: SavedWithGapProps) {
  if (!gap) return null
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between"
    >
      <p>{gap.text}</p>
      <Link
        href="/"
        className="inline-flex shrink-0 items-center justify-center rounded-md border border-amber-400 bg-white px-3 py-1.5 font-semibold text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-amber-500/50 dark:bg-slate-950/60 dark:text-amber-200 dark:hover:bg-slate-900 dark:focus-visible:ring-sky-400"
      >
        Ana sayfaya dön
      </Link>
    </div>
  )
}
