import { previousNumberText } from "../_utils/previousNumber";

/** The old number of a renumbered finding, small and muted under its new number (R61); nothing when there is none. */
export function PreviousFindingNo({ previous }: { previous?: number | null }) {
  const text = previousNumberText(previous);
  if (!text) return null;
  return (
    <small
      title={text.title}
      className="mt-0.5 block cursor-help whitespace-nowrap text-[10px] leading-tight text-slate-500 dark:text-slate-400 sm:text-[11px]"
    >
      {text.label}
    </small>
  );
}
