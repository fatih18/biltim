import type { SessionFinding } from "./singleFinding";

/** The finding fields of a queued single finding, as far as the screen needs them back. */
export type ReplayedFinding = {
  question_id?: string | null;
  location_name?: string | null;
  client_finding_id?: string | null;
};

/*
 * The single findings a queued submission put on the server, as session
 * findings, tagged with the plan the submission was queued for. Replayed, they
 * leave the queue list at once; without this they
 * stopped counting as the question's open finding until the closing read of
 * the findings came back — and the form asked for a second one in between.
 * Only findings linked to a question count; `numbers` is the number the
 * server gave each, by client_finding_id, when the replay saw it.
 */
export function sessionFindingsOfReplay(
  findings: readonly ReplayedFinding[],
  numbers: ReadonlyMap<string, number | null> = new Map(),
  auditPlanId: string | null = null,
): SessionFinding[] {
  const saved: SessionFinding[] = [];
  for (const f of findings) {
    const questionId = String(f.question_id ?? "").trim();
    if (!questionId) continue;
    saved.push({
      questionId,
      location: String(f.location_name ?? ""),
      findingNo: numbers.get(String(f.client_finding_id ?? "")) ?? null,
      auditPlanId,
    });
  }
  return saved;
}
