/*
 * R72: the per-question "Fotoğraf Zorunlu" switch of the Sorular screen.
 *
 * `five_s_questions.require_photo` (boolean, not null, default false) is the
 * sibling of `require_explanation`. It is off for every question until an
 * administrator switches it on, so nothing changes for the audit form until
 * then. The rule it switches on lives in denetim/_utils/photoRequired.ts and in
 * the API (be-nucleus guards/photoRequired.ts); this file only words the
 * setting for the screen (app/_utils/questionPhoto reads the column).
 */

/**
 * What the switch does, in the words the audit form uses: when a finding is
 * raised, and what happens then. The one sentence shown under the toggle; the
 * rest is REQUIRE_PHOTO_DETAILS, in its tooltip, so the 320 px form stays short.
 */
export const REQUIRE_PHOTO_HELP =
  "Açıkken bu soruda Orta ya da Kötü cevapla yeni bir bulgu açılırken en az bir fotoğraf eklenmeden denetim kaydedilemez ve gönderilemez.";

/** The edge cases of the switch: an already open finding, the single finding form, and the switch off. */
export const REQUIRE_PHOTO_DETAILS =
  "Soruda zaten açık bir bulgu varsa fotoğraf istenmez; soruya bağlı tekil bulguda ise fotoğraf zorunludur. Kapalıyken fotoğraf isteğe bağlıdır.";

/** The tooltip of the whole switch: the sentence under it, then the edge cases. */
export const REQUIRE_PHOTO_TOOLTIP = `${REQUIRE_PHOTO_HELP} ${REQUIRE_PHOTO_DETAILS}`;

/** The short state shown on a question row. */
export function photoRuleLabel(requirePhoto: boolean): string {
  return requirePhoto ? "Fotoğraf zorunlu" : "Fotoğraf opsiyonel";
}
