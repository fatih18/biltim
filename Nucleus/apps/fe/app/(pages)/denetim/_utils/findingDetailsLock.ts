import { notGood, type Rating } from "./scoring";

/*
 * Why the finding fields of a question's detail modal are hidden, or null
 * when they are shown. The fields (type, photos, action, due date, place)
 * only matter where saving writes a NEW finding; where it will not, whatever
 * is typed there is dropped, so they are hidden instead of being labelled
 * "isteğe bağlı".
 *
 *   open_finding    the question already has an open finding: it is the record
 *   already_stored  a correction, and the answer was saved below İyi: its
 *                   finding was written when the audit was sent
 *
 * Decided from `needsDetails` (page.tsx → needsFindingDetails), the same
 * answer the save uses to decide whether to write a finding. An answer that
 * is not Orta or Kötü yet (no rating, or İyi) keeps the fields: details typed
 * before the rating is picked are used once it is.
 */
export type DetailsLock = "open_finding" | "already_stored" | null;

export function detailsLockOf(input: {
  rating: Rating | null | undefined;
  hasOpenFinding: boolean;
  /** Saving this answer writes a new finding (scoring.ts → requiresNewFinding). */
  needsDetails: boolean;
}): DetailsLock {
  if (input.hasOpenFinding) return "open_finding";
  if (notGood(input.rating) && !input.needsDetails) return "already_stored";
  return null;
}
