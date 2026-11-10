import type { DateEditRule } from "../page";

/**
 * The Tarih cell of a plan row while its date is not being edited.
 *
 * The cell holds the plan's date. An audit done on another day says so under
 * it ("Yapıldı: ..."; on the live data a plan of 08.10 was done on 02.10), and
 * the same audit is listed again under that day (DoneDayRow, R43).
 */
export function PlanDateCell(props: {
    plannedDate: string;
    /** The day the audit was done, only when it is not the planned day. */
    doneDay: string | null;
    rule: DateEditRule;
    onEdit: () => void;
}) {
    const { plannedDate, doneDay, rule, onEdit } = props;
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-sm text-slate-800 dark:text-slate-200">{plannedDate || "-"}</span>
            {doneDay ? (
                <span className="text-[11px] text-slate-600 dark:text-slate-400">Yapıldı: {doneDay}</span>
            ) : null}
            {rule.allowed ? (
                <button
                    type="button"
                    onClick={onEdit}
                    className="text-left text-[11px] text-sky-700 dark:text-sky-400 hover:underline"
                >
                    {rule.remaining === null ? "Tarihi Düzenle" : `Düzenle (${rule.remaining} hak)`}
                </button>
            ) : rule.locked ? (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Tarih kilitli</span>
            ) : null}
        </div>
    );
}
