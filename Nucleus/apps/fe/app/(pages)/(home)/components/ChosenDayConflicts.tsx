"use client";

import React from "react";
import { DateConflictNotice } from "@/app/_components/DateConflictNotice";
import { useDayConflicts, type DayConflictLoader } from "../_hooks/useDayConflicts";

/**
 * The same-day clash notice under a date being edited (R28).
 *
 * The day is read from the server, so while it loads the person is told the
 * check is not finished, and when the read fails they are told no warning can
 * be shown and what to do: an empty space would read as "nothing clashes".
 */
export function ChosenDayConflicts({
    load,
    planId,
    day,
}: {
    load: DayConflictLoader | undefined;
    planId: string;
    day: string;
}) {
    const { status, warnings, retry } = useDayConflicts(load, planId, day);

    if (status === "idle") return null;

    if (status === "loading") {
        return (
            <p role="status" className="text-[11px] text-slate-600 dark:text-slate-400">
                Çakışmalar kontrol ediliyor…
            </p>
        );
    }

    if (status === "failed") {
        return (
            <div
                role="alert"
                className="space-y-1 rounded-md border border-rose-500/40 bg-rose-100 px-2 py-1.5 text-rose-900 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-100"
            >
                <p className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 sm:text-xs">
                    Çakışma kontrolü yapılamadı
                </p>
                <p className="text-[11px] text-rose-800 dark:text-rose-200 sm:text-xs">
                    Bu yüzden aynı gün başka denetim olup olmadığı gösterilemiyor. Yeniden deneyin; tarihi yine de
                    kaydedebilirsiniz.
                </p>
                <button
                    type="button"
                    onClick={retry}
                    className="rounded-md border border-rose-500/50 bg-white px-2 py-0.5 text-[11px] font-medium text-rose-800 hover:bg-rose-50 dark:border-rose-400/40 dark:bg-slate-950/60 dark:text-rose-200 dark:hover:bg-slate-950"
                >
                    Yeniden dene
                </button>
            </div>
        );
    }

    return <DateConflictNotice compact warnings={warnings} />;
}
