/**
 * Said under the list when an audit appears twice (R43): which one is the
 * repeat, and that the counts take it once. Nothing is drawn when no audit was
 * done on another day than it was planned, so an ordinary list stays as it was.
 */
export function DoneDayListNote(props: { audits: number; repeats: number }) {
    const { audits, repeats } = props;
    if (repeats === 0) return null;
    return (
        <p className="mt-3 text-[11px] text-slate-600 dark:text-slate-400">
            Listede {audits} denetim var. {repeats} tanesi planlandığından farklı bir günde yapıldığı için yapıldığı günde
            de görünür (mavi çizgili satır, &quot;Aynı denetim&quot;). Sekmelerdeki sayılar ve toplamlar her denetimi bir kez sayar.
        </p>
    );
}
