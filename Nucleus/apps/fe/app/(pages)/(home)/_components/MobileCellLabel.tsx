/**
 * The column's name over its value on a card. The table header that carries
 * these names exists only from `md`; below it each plan is a small card whose
 * cells would otherwise be unnamed.
 */
export function MobileCellLabel(props: { children: string }) {
  return (
    <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500 md:hidden dark:text-slate-400">
      {props.children}
    </span>
  );
}
