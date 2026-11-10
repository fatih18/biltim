/*
 * "eski no" of the Bulgular register (R61).
 *
 * Finding numbers repeated after the numbering sequence was reset (two #1, two
 * #2). Boot renumbers the newer finding of each pair and keeps the number it
 * had in `previous_finding_no`. A customer holding a printout that says "#2"
 * finds that finding by the small "eski no: #2" beside its new number.
 */

export type PreviousNumberText = {
  /** What the cell shows under the number. */
  label: string;
  /** The tooltip: says what the old number is and why it is shown. */
  title: string;
};

/** The label and tooltip for a finding's old number; null when it was never renumbered. */
export function previousNumberText(previous: number | null | undefined): PreviousNumberText | null {
  if (previous === null || previous === undefined || !Number.isInteger(previous)) return null;
  return {
    label: `eski no: #${previous}`,
    title: `Bu numara yeniden numaralandı; eski numarası #${previous}`,
  };
}
