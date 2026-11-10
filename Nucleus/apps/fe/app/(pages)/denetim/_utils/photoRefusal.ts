/*
 * R72: recognising the API's photo refusal, and what the offline replay does
 * with it.
 *
 * When an audit is sent, the API refuses the plan stamp with 422 if a finding
 * on a photo-demanding question has no photo (be-nucleus guards/photoRequired.ts).
 * It answers with the message only, so the form recognises that refusal by a
 * phrase of the message. The phrase is PHOTO_REFUSAL_MARKER on the API side;
 * photoRefusal.test.ts reads that file and fails when the two drift apart.
 */

/** The phrase every photo refusal carries; the same string as be-nucleus PHOTO_REFUSAL_MARKER. */
export const PHOTO_REFUSAL_MARKER = "bulgu fotoğrafı zorunlu olan sorularda";

/** Whether the reasons the server gave are the photo refusal (not a deleted plan, not another rule). */
export function isPhotoRefusal(reasons: readonly string[]): boolean {
  return reasons.some((reason) => reason.includes(PHOTO_REFUSAL_MARKER));
}

/**
 * The question codes the refusal names: the API puts them in brackets right
 * after the marker ("... sorularda (S1-Q2, S3-Q1) fotoğrafsız bulgu var").
 * Empty when no reason carries a list, so the caller says it without one.
 */
export function photoRefusalQuestionIds(reasons: readonly string[]): string[] {
  const ids: string[] = [];
  for (const reason of reasons) {
    const at = reason.indexOf(PHOTO_REFUSAL_MARKER);
    if (at < 0) continue;
    const list = /^\s*\(([^)]*)\)/.exec(reason.slice(at + PHOTO_REFUSAL_MARKER.length))?.[1] ?? "";
    for (const id of list.split(",")) {
      const code = id.trim();
      if (code !== "" && !ids.includes(code)) ids.push(code);
    }
  }
  return ids;
}

/**
 * What the offline replay does with a refused plan stamp:
 * - "clean_up": the plan itself refuses (deleted, taken over, ...). The audit
 *   and its findings are on the server and retrying the stamp would only fail
 *   again, so the queued copy is removed and the auditor is told.
 * - "set_aside": the audit is refused for a finding without its photo. The
 *   queued copy may be the only place the auditor's photos and answers still
 *   are (a photo refused for good was skipped), so it stays on the device,
 *   with the reason, in the list of refused records, like any refusal of the
 *   audit or a finding.
 */
export type ReplayStampAction = "clean_up" | "set_aside";

export function replayStampAction(reasons: readonly string[]): ReplayStampAction {
  return isPhotoRefusal(reasons) ? "set_aside" : "clean_up";
}
