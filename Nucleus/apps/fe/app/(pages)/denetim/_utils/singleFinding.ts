import { auditNameOfTitle, SINGLE_FINDING_TITLE } from "@/app/_utils/singleFindingTitle";
import { foldTr } from "@/app/_utils/textSearch";
import type { Question } from "../constants";
import { isExplanationRequired, mapOpenFindingsByQuestion, type OpenFindingSource, type Rating } from "./scoring";

/*
 * What a single finding is, decided by one fact: the person STARTED a planned
 * audit on this screen (the home page's "Denetime Başla", or picking the plan
 * from the list). Having an audit assigned says nothing: an auditor with a
 * planned audit who opens "Tekil Bulgu" without starting it files a standalone
 * finding (Notlar 22.10, satır 16).
 *
 * Inside an audit the finding must name the question it belongs to (R16);
 * outside one the question is optional and the finding is attached to no plan.
 */
export type SingleFindingMode = { inAudit: boolean; questionRequired: boolean };

export function singleFindingMode(startedPlanId: string | null | undefined): SingleFindingMode {
  const inAudit = !!startedPlanId;
  return { inAudit, questionRequired: inAudit };
}

/*
 * The finding's "Ana Denetim" (#3, R74): the audit's own name when it was raised
 * inside an audit — the very value the audit's other findings carry — and
 * "Tekil Bulgu" only when it stands alone.
 */
export function singleFindingTitle(mode: SingleFindingMode, auditTitle: string): string {
  const name = auditTitle.trim();
  return mode.inAudit && name ? name : SINGLE_FINDING_TITLE;
}

/** The first line of the finding's description, read in the finding detail. */
export function singleFindingHeading(title: string): string {
  return title === SINGLE_FINDING_TITLE ? "TEKİL BULGU" : `Ana Denetim: ${title}`;
}

/** The offline queue's name for one submission, on the "reddedildi" list. */
export function queuedSubmissionLabel(s: {
  source?: string | null;
  formTitle?: string | null;
  department?: string | null;
  date?: string | null;
}): string {
  const place = `${s.department ?? "-"} · ${s.date ?? "-"}`;
  if (s.source !== "single_finding") return `Denetim — ${place}`;
  return `${auditNameOfTitle(s.formTitle) || "Tekil bulgu"} — ${place}`;
}

/** What the create call answers with, in any of the shapes the API layer hands back. */
export type CreatedRow = {
  finding_no?: number | string | null;
  findingNo?: number | string | null;
  data?: CreatedRow | CreatedRow[] | null;
};

/** The number the server gave a just-created finding; null when the answer carries none. */
export function findingNoOf(resp: CreatedRow | null | undefined, depth = 0): number | null {
  if (!resp || depth > 3) return null;
  const raw = resp.finding_no ?? resp.findingNo;
  const no = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
  if (typeof no === "number" && Number.isFinite(no) && no > 0) return no;
  return findingNoOf(Array.isArray(resp.data) ? resp.data[0] : resp.data, depth + 1);
}

/*
 * A single finding this screen saved and the server confirmed, linked to a
 * question. `auditPlanId` is the plan of the audit that was open when it was
 * raised, null for a standalone finding: only the former was added "in this
 * audit" (questionsAddedHere), the latter is just an open finding.
 */
export type SessionFinding = {
  questionId: string;
  location: string;
  findingNo: number | null;
  auditPlanId: string | null;
};

/*
 * The label of a saved finding the server has not numbered yet. Neutral on
 * purpose: the same wording shows for a standalone finding saved from the plan
 * list and seen later when an audit starts at that location, which was not
 * added "in this audit".
 */
const UNNUMBERED = "yeni eklendi";

/*
 * Question id -> the open findings of one location, as the question rows, the
 * save-time check and the single-finding modal all read them (R2/R17).
 *
 * Three sources: the open findings read from the server, the single findings
 * still waiting in the offline queue, and the ones this screen saved a moment
 * ago. The last would come back with the next read — but a read can fail, lag
 * or return an older snapshot, and the form then demanded a second finding for
 * the very defect just recorded and refused to close the audit. A saved one
 * counts at once, and only once: not again when the read already lists it.
 */
export function openFindingsFor(
  location: string,
  sources: {
    findings: readonly OpenFindingSource[];
    queuedQuestionIds: readonly string[];
    session: readonly SessionFinding[];
  },
): Map<string, string[]> {
  const map = mapOpenFindingsByQuestion(sources.findings, sources.queuedQuestionIds);
  const read = mapOpenFindingsByQuestion(sources.findings);
  const here = foldTr(location);
  for (const saved of sources.session) {
    if (!saved.questionId || foldTr(saved.location) !== here) continue;
    const label = saved.findingNo != null ? `#${saved.findingNo}` : UNNUMBERED;
    const listed = read.get(saved.questionId) ?? [];
    if (saved.findingNo != null ? listed.includes(label) : listed.length > 0) continue;
    map.set(saved.questionId, [...(map.get(saved.questionId) ?? []), label]);
  }
  return map;
}

/*
 * The questions that got a single finding during THIS audit, at its location:
 * saved from the modal a moment ago (session) or still waiting in the offline
 * queue. A finding that was already open before the audit started is not one
 * of them (see explanationMissing), and neither is a standalone finding saved
 * earlier in the same page visit: a session finding counts only when it was
 * raised inside the audit now open (`auditPlanId`, the plan it started).
 */
export function questionsAddedHere(
  location: string,
  sources: { queuedQuestionIds: readonly string[]; session: readonly SessionFinding[] },
  auditPlanId: string | null,
): Set<string> {
  const here = foldTr(location);
  const added = new Set<string>(sources.queuedQuestionIds.filter(Boolean));
  for (const saved of sources.session) {
    if (auditPlanId === null || saved.auditPlanId !== auditPlanId) continue;
    if (saved.questionId && foldTr(saved.location) === here) added.add(saved.questionId);
  }
  return added;
}

/*
 * Whether an answer is still waiting for its explanation (Orta/Kötü).
 *
 * Not when a single finding was added to the question during this audit: that
 * finding is the record, and choosing Orta or Kötü there must be enough to
 * close the audit (R2/R17). An open finding from an EARLIER audit at the same
 * location waives nothing: the customer asked only that the finding just
 * written stops the second-finding demand, so the explanation is still asked.
 */
export function explanationMissing(
  question: Pick<Question, "requireExplanation">,
  answer: { rating: Rating | null; explanation: string },
  findingAddedInThisAudit: boolean,
): boolean {
  if (findingAddedInThisAudit) return false;
  return isExplanationRequired(question, answer) && !answer.explanation.trim();
}

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
