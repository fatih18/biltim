import Link from 'next/link'
import { EDIT_PLAN_UNREADABLE_TEXT, EDIT_PLAN_UNREADABLE_WHY } from '../../_utils/editPlanRead'

type EditPlanUnreadableProps = {
  /** Reads the audit and its plan again. */
  onRetry: () => void
}

/*
 * Said in place of the correction form when the address names a plan and the
 * plan could not be read (editPlanRead.ts): what is wrong, what it means for
 * the correction, and the two ways on.
 */
export function EditPlanUnreadable({ onRetry }: EditPlanUnreadableProps) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-50 md:px-8">
      <section
        role="alert"
        aria-labelledby="edit-plan-unreadable-title"
        className="mx-auto max-w-3xl rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 sm:p-6"
      >
        <h1 id="edit-plan-unreadable-title" className="text-base font-semibold">
          Düzeltme ekranı açılamadı
        </h1>
        <p className="mt-2 text-sm">{EDIT_PLAN_UNREADABLE_TEXT}</p>
        <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">{EDIT_PLAN_UNREADABLE_WHY}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center rounded-md bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 dark:focus-visible:ring-sky-400"
          >
            Tekrar Dene
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-950 dark:focus-visible:ring-sky-400"
          >
            Ana sayfaya dön
          </Link>
        </div>
      </section>
    </main>
  )
}
