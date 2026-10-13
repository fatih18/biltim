import type { Question, Step, StepCode } from "../constants";

/** How a single answer scores against the question's own maximum. */
export type Rating = "good" | "medium" | "bad";

export const RATING_FACTOR: Record<Rating, number> = {
  good: 1,
  medium: 0.5,
  bad: 0,
};

/** The score an audit is measured against. */
export const TARGET_SCORE = 75;

/** Only the answer fields scoring reads. */
export type ScorableAnswer = { rating: Rating | null };

/**
 * Score each 5S step out of the step's own maximum.
 *
 * Two separate scales are at work and confusing them is the easy mistake. A
 * question carries its own maxScore, and those need not add up to the step's
 * maxScore — a step worth 20 may hold four questions worth 10 each. So the
 * earned points are gathered on the questions' scale and then rescaled onto the
 * step's, which is what makes the five steps comparable and the total meaningful.
 *
 * Unanswered questions score nothing but still count towards the maximum: an
 * audit that skipped half its questions must not look like a good one.
 */
export function computeStepScores(
  steps: readonly Step[],
  questions: readonly Question[],
  answers: Readonly<Record<string, ScorableAnswer | undefined>>,
): Record<StepCode, number> {
  const scores: Record<StepCode, number> = { S1: 0, S2: 0, S3: 0, S4: 0, S5: 0 };

  for (const step of steps) {
    const stepQuestions = questions.filter((q) => q.stepCode === step.code);

    const rawMax = stepQuestions.reduce((sum, q) => sum + (q.maxScore ?? 0), 0);
    const rawEarned = stepQuestions.reduce((sum, q) => {
      const rating = answers[q.id]?.rating;
      if (!rating) return sum;
      return sum + (q.maxScore ?? 0) * RATING_FACTOR[rating];
    }, 0);

    // A step with no questions, or whose questions are all worth nothing, scores
    // zero rather than dividing by zero.
    const scale = rawMax > 0 ? step.maxScore / rawMax : 0;
    scores[step.code] = rawEarned * scale;
  }

  return scores;
}

/** The audit's score: the five step scores added up. */
export function computeTotalScore(stepScores: Record<StepCode, number>): number {
  return (Object.values(stepScores) as number[]).reduce((a, b) => a + b, 0);
}

/*
 * The plant's own scoring rules (Notlar 07.10, "Kurallar").
 *
 * The plain sum above is how a 5S score is built; these are the exceptions
 * the customer applies on paper and asked the program to apply too:
 *
 *   5.1 answered Orta or Kötü   -> step 5 (Sürdürme) scores 0
 *   2.3 answered Orta or Kötü   -> 10% off the total
 *   5.5 answered Orta or Kötü   -> 10% off the total
 *   the location's field manager did not take part -> the audit scores 0
 *
 * A question is named the way the form numbers it — step order, then the
 * question's order inside the step ("2.3") — not by its database id, so the
 * rule follows the question the auditor sees. The 10% is of the total
 * obtained ("toplam alınan puandan %10 düşürülecektir", their own form, 2.3);
 * when both apply, each takes its 10%, 20% in all.
 */
export const RULE_ZERO_STEP_IF_NOT_GOOD = [{ step: 5, question: 1 }] as const;
export const RULE_TOTAL_PENALTY_IF_NOT_GOOD = [
  { step: 2, question: 3 },
  { step: 5, question: 5 },
] as const;
export const TOTAL_PENALTY = 0.1;

export type AuditScore = {
  stepScores: Record<StepCode, number>;
  total: number;
  /** What changed the plain sum, in the words the screen shows. */
  adjustments: string[];
};

function ruleQuestion(
  steps: readonly Step[],
  questions: readonly Question[],
  rule: { step: number; question: number },
): Question | undefined {
  const step = steps.find((s) => s.order === rule.step);
  if (!step) return undefined;
  return questions.find((q) => q.stepCode === step.code && q.order === rule.question);
}

const notGood = (rating: Rating | null | undefined) => rating === "medium" || rating === "bad";

export function scoreAudit(
  steps: readonly Step[],
  questions: readonly Question[],
  answers: Readonly<Record<string, ScorableAnswer | undefined>>,
  options: { fieldManagerAttended: boolean },
): AuditScore {
  const stepScores = computeStepScores(steps, questions, answers);
  const adjustments: string[] = [];

  for (const rule of RULE_ZERO_STEP_IF_NOT_GOOD) {
    const q = ruleQuestion(steps, questions, rule);
    if (q && notGood(answers[q.id]?.rating) && stepScores[q.stepCode] > 0) {
      stepScores[q.stepCode] = 0;
      adjustments.push(`${rule.step}.${rule.question} Orta/Kötü: ${rule.step}. adım puanı 0`);
    }
  }

  let total = computeTotalScore(stepScores);

  let penalties = 0;
  for (const rule of RULE_TOTAL_PENALTY_IF_NOT_GOOD) {
    const q = ruleQuestion(steps, questions, rule);
    if (q && notGood(answers[q.id]?.rating)) {
      penalties += 1;
      adjustments.push(`${rule.step}.${rule.question} Orta/Kötü: toplamdan %${TOTAL_PENALTY * 100} düşüldü`);
    }
  }
  if (penalties > 0) total = total * Math.max(0, 1 - TOTAL_PENALTY * penalties);

  if (!options.fieldManagerAttended) {
    total = 0;
    adjustments.push("Bölge sorumlusu denetime katılmadı: denetim puanı 0");
  }

  return { stepScores, total, adjustments };
}

/*
 * Whether a non-good answer has to carry a NEW finding (type, action, due
 * date) before the form can be saved — and so whether saving writes one.
 *
 * Not when the question already has an open finding: that is the finding
 * (Notlar 07.10, satır 3 ve 16).
 *
 * Not, in Merkez Ekip's correction of a carried-out audit (#12), for an answer
 * that was already below "İyi" when the audit was saved. Its finding was
 * written back then; asking again made the editor fill in details for every
 * old Orta/Kötü and wrote a second finding for each one on save. Only an
 * answer the correction itself moves from İyi (or from no answer) down to
 * Orta/Kötü is a new defect.
 *
 * `storedRating` is undefined for a new audit; for a correction it is the
 * rating the audit was saved with, null when that question had no answer.
 */
export function requiresNewFinding(
  rating: Rating | null | undefined,
  context: { hasOpenFinding: boolean; storedRating?: Rating | null },
): boolean {
  if (!notGood(rating)) return false;
  if (context.hasOpenFinding) return false;
  if (context.storedRating === undefined) return true;
  return context.storedRating === null || context.storedRating === "good";
}

/*
 * One five_s_audit_answers row, as the form writes it.
 *
 * Built in one place so the online save and the offline queue's replay post
 * exactly the same thing. The queue used to carry no answers at all: an audit
 * sent from a tablet without a connection reached the server with every
 * question blank, its KYS.180 sheet came out empty and Merkez Ekip's
 * correction opened with nothing answered.
 *
 * `has_open_finding` is decided when the form is saved, against the open
 * findings the form knew about then.
 */
export type AnswerRowPayload = {
  question_id: string;
  step_code: string;
  rating: Rating;
  explanation?: string;
  finding_type?: string;
  has_open_finding: boolean;
  answered_at: string;
};

export type AnswerRowSource = {
  rating: Rating | null;
  explanation?: string | null;
  findingType?: string | null;
};

/** Every answered question's row, in question order; an unanswered one has none. */
export function answerRowsFor(
  questions: readonly Pick<Question, "id" | "stepCode">[],
  answers: Readonly<Record<string, AnswerRowSource | undefined>>,
  hasOpenFinding: (questionId: string) => boolean,
  answeredAt: string,
): AnswerRowPayload[] {
  const rows: AnswerRowPayload[] = [];
  for (const q of questions) {
    const ans = answers[q.id];
    if (!ans?.rating) continue;
    rows.push({
      question_id: q.id,
      step_code: q.stepCode,
      rating: ans.rating,
      explanation: ans.explanation?.trim() || undefined,
      finding_type: ans.findingType || undefined,
      has_open_finding: ans.rating !== "good" && (!!ans.findingType || hasOpenFinding(q.id)),
      answered_at: answeredAt,
    });
  }
  return rows;
}

/*
 * The answers of a queued submission that have not reached the server yet.
 * A retry resumes here instead of posting every answer again. Submissions
 * queued before the queue carried answers have none, and replay without them.
 */
export function answersStillToSend(
  rows: readonly AnswerRowPayload[] | null | undefined,
  sentQuestionIds: readonly string[] | null | undefined,
): AnswerRowPayload[] {
  const sent = new Set(sentQuestionIds ?? []);
  return (rows ?? []).filter((row) => !sent.has(row.question_id));
}

/** Only the finding fields the open-findings lookup reads. */
export type OpenFindingSource = {
  status?: string | null;
  question_id?: string | null;
  description?: string | null;
  finding_no?: number | null;
};

/*
 * Question id -> the numbers of its open findings ("#7"), for one location's
 * findings. "Devam ediyor" is not closed either; it is still the open
 * finding. Older findings carry the question only in their description.
 * `queuedQuestionIds` are single findings still in this device's offline
 * queue for the same location: no number yet, but already the finding.
 */
export function mapOpenFindingsByQuestion(
  findings: readonly OpenFindingSource[],
  queuedQuestionIds: readonly string[] = [],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const f of findings) {
    if (String(f.status ?? "") === "closed") continue;
    const fromField = (f.question_id ?? "").toString().trim();
    const fromDesc =
      f.description?.match(/Soru ID:\s*(\S+)/)?.[1] ??
      f.description?.match(/Bağlı Soru:\s*(\S+)/)?.[1] ??
      "";
    const qid = fromField || fromDesc;
    if (!qid) continue;
    map.set(qid, [...(map.get(qid) ?? []), f.finding_no != null ? `#${f.finding_no}` : "#?"]);
  }
  for (const qid of queuedQuestionIds) {
    if (!qid) continue;
    map.set(qid, [...(map.get(qid) ?? []), "kuyrukta"]);
  }
  return map;
}

/** A score as the screens and the stored row write it. */
export function formatScore(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return "-";
  return value.toFixed(2);
}

/** Whether an answer must carry an explanation before the audit can be sent. */
export function isExplanationRequired(
  question: Pick<Question, "requireExplanation">,
  answer?: ScorableAnswer,
): boolean {
  if (!answer?.rating) return false;
  return question.requireExplanation && answer.rating !== "good";
}
