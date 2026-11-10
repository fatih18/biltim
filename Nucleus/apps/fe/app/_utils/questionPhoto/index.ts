/*
 * R72: the one reader of a question's "photo required" column.
 *
 * `five_s_questions.require_photo` (boolean, not null, default false) is read
 * by two screens: the question admin (Ana Veri Yönetimi, Sorular) shows it and
 * writes it, and the audit form (Denetim) enforces it. They must agree on what
 * counts as "on", so both go through this function: an explicit true, or the
 * text "true" where a layer stringified the column. Anything else (null, a
 * missing column on a question that predates it, false, 1, "yes") is off, so
 * nothing is demanded until an administrator switches it on.
 */

/** What the column can hold when a question row arrives from the API. */
export type RequirePhotoCell = boolean | string | number | null | undefined;

/** Whether the question demands a photo on the findings it raises. */
export function readRequirePhoto(cell: RequirePhotoCell): boolean {
  return cell === true || cell === "true";
}
