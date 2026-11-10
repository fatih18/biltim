/*
 * R72: the per-question "Fotoğraf Zorunlu" switch of the Sorular screen.
 *
 * `five_s_questions.require_photo` (boolean, not null, default false) is the
 * sibling of `require_explanation`. It is off for every question until an
 * administrator switches it on, so nothing changes for the audit form until
 * then. The rule it switches on lives in denetim/_utils/photoRequired.ts and in
 * the API (be-nucleus guards/photoRequired.ts); this file only reads and words
 * the setting for the screen.
 */

/** The column as a question row carries it: a boolean, or "true" where a layer stringified it. Anything else is off. */
export function readRequirePhoto(row: Readonly<Record<string, unknown>>): boolean {
  return row.require_photo === true || row.require_photo === "true";
}

/** What the switch does, in the words the audit form uses: when a finding is raised, and what happens then. */
export const REQUIRE_PHOTO_HELP =
  "Açıkken bu soruda Orta ya da Kötü cevapla yeni bir bulgu açılırken en az bir fotoğraf eklenmeden denetim kaydedilemez ve gönderilemez. Soruda zaten açık bir bulgu varsa fotoğraf istenmez; soruya bağlı tekil bulguda ise fotoğraf zorunludur. Kapalıyken fotoğraf isteğe bağlıdır.";

/** The short state shown on a question row. */
export function photoRuleLabel(requirePhoto: boolean): string {
  return requirePhoto ? "Fotoğraf zorunlu" : "Fotoğraf opsiyonel";
}
