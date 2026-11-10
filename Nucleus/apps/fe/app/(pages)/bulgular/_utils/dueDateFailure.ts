/*
 * What a refused "Termin" change of the register says (B6).
 *
 * The server refuses a non-team edit of a finding whose plan was sent back for
 * correction (403: only the plan's team and Merkez Ekip write it). The date
 * cell had already taken the new value, the list is read again and puts the old
 * one back, and the screen said nothing: the person saw the date jump back with
 * no reason. The refusal's own sentence is shown, since it names who may change
 * it; with none, a general line says the date was not saved and what to do.
 */

export const DUE_DATE_FAILED = "Termin değiştirilemedi";

/** The toast text: the server's reasons after the headline, or the general line when it gave none. */
export function dueDateFailureMessage(reasons: readonly string[]): string {
  const said = reasons.map((reason) => reason.trim()).filter((reason) => reason.length > 0);
  if (said.length > 0) return `${DUE_DATE_FAILED}: ${said.join(" ")} Liste eski termine döndü.`;
  return `${DUE_DATE_FAILED}, liste eski termine döndü. Bağlantınızı kontrol edip tekrar deneyin.`;
}
