import { toDayKey } from "@/app/_utils/dateConflicts";

/** `five_s_audit_plans.quarter` is varchar(16); the server refuses a longer name. */
export const QUARTER_MAX_LENGTH = 16;

/** How many dates a message spells out before it counts the rest. */
const LISTED_DATES = 8;

/** A period plan as the edit form holds it. */
export type PeriodDraft = {
  quarter: string;
  start: string;
  end: string;
};

export type PeriodCheck = {
  /** Why the draft cannot be saved, one sentence each; empty when it can. */
  reasons: string[];
  /** Quarter, start and end are all filled in. */
  complete: boolean;
  /** Anything differs from the plan as it is stored. */
  changed: boolean;
  canSave: boolean;
};

function listDates(days: readonly string[]): string {
  const sorted = [...new Set(days)].sort();
  if (sorted.length <= LISTED_DATES) return sorted.join(", ");
  return `${sorted.slice(0, LISTED_DATES).join(", ")} ve ${sorted.length - LISTED_DATES} tarih daha`;
}

/**
 * Whether a period plan's new name and range can be saved (R68, R69).
 *
 * The same three refusals the server makes: a name that fits, a range that
 * does not run backwards, and a range that still holds every audit plan filed
 * under it. Checked here so the person is told before the button is pressed;
 * the server still has the last word.
 *
 * @param childDates the planned dates of the period's audit plans that are not
 *   cancelled.
 */
export function checkPeriodDraft(
  draft: PeriodDraft,
  original: PeriodDraft,
  childDates: readonly string[]
): PeriodCheck {
  const quarter = draft.quarter.trim();
  const complete = quarter !== "" && draft.start !== "" && draft.end !== "";
  const changed =
    quarter !== original.quarter.trim() || draft.start !== original.start || draft.end !== original.end;

  const reasons: string[] = [];
  if (quarter.length > QUARTER_MAX_LENGTH) {
    reasons.push(`Dönem adı en fazla ${QUARTER_MAX_LENGTH} karakter olabilir.`);
  }
  if (draft.start && draft.end && draft.end < draft.start) {
    reasons.push("Bitiş tarihi başlangıç tarihinden önce olamaz.");
  } else if (draft.start && draft.end) {
    const outside = childDates
      .map((date) => toDayKey(date))
      .filter((day) => day !== "" && (day < draft.start || day > draft.end));
    if (outside.length > 0) {
      reasons.push(
        `Bu aralığın dışında kalan ${outside.length} denetim planı var (${listDates(outside)}). Önce bu planların tarihini aralığa alın ya da planları iptal edin.`
      );
    }
  }

  return { reasons, complete, changed, canSave: complete && changed && reasons.length === 0 };
}
