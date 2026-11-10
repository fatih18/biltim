import { auditStatusLabelTr } from "@/app/_utils/StatusLabels";

/** A plan's status as a small coloured label; the same one on a plan row and on its repeat (R43). */
export function StatusPill({ status }: { status: string }) {
    const base = "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium";
    if (status === "planned")
        return <span className={`${base} border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200`}>{auditStatusLabelTr(status)}</span>;
    if (status === "pending_approval")
        return <span className={`${base} border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-800/60 dark:bg-violet-950/30 dark:text-violet-200`}>{auditStatusLabelTr(status)}</span>;
    if (status === "completed")
        return <span className={`${base} border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/25 dark:text-emerald-200`}>{auditStatusLabelTr(status)}</span>;
    if (status === "rejected")
        return <span className={`${base} border-amber-500/70 bg-amber-100 dark:border-amber-700/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200`}>{auditStatusLabelTr(status)}</span>;
    if (status === "cancelled")
        return <span className={`${base} border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-200`}>{auditStatusLabelTr(status)}</span>;
    return <span className={`${base} border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/50 text-slate-800 dark:text-slate-200`}>{auditStatusLabelTr(status)}</span>;
}
