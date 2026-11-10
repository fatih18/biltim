import { doneDayNote, REPEATS_UNAVAILABLE_NOTE } from "../_utils/doneDayNote";

/**
 * Said under the list when an audit appears twice (R43): which one is the
 * repeat, and that the counts take it once. When the plans outside the page
 * could not be read it says that too, so a partial list is never passed off as
 * a whole one. Nothing is drawn for an ordinary list.
 */
export function DoneDayListNote(props: { audits: number; repeats: number; outside: number; unavailable: boolean }) {
    const { audits, repeats, outside, unavailable } = props;
    const note = doneDayNote(audits, repeats, outside);
    if (note === null && !unavailable) return null;
    return (
        <div className="mt-3 flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400">
            {note !== null && <p>{note}</p>}
            {unavailable && <p role="status" className="text-amber-800 dark:text-amber-200">{REPEATS_UNAVAILABLE_NOTE}</p>}
        </div>
    );
}
