/*
 * The record path of the audit form, decided in one place.
 *
 * Kaydet, the offline queue and Merkez Ekip's correction all turn the form's
 * state into what is sent: the audit row's scores, the answer rows, the new
 * findings, the attendance stamp, and the questions that must be answered
 * first. Each of them read the answers on its own; only one of them reading
 * the raw state instead of the recorded answers is enough for a passive audit
 * (attendance box not ticked, _utils/attendance.ts) to send answers and
 * findings it must not, or to refuse to save for a question nobody can see.
 *
 * buildAuditRecord is the only reader. The page builds one record per render
 * and every save path takes its body from it, so the passive case is decided
 * here, once, and a test can run it without a browser. The page keeps the
 * form's own state untouched (ticking the box again brings the typed answers
 * back); the record is what is scored, queued, sent and turned into findings.
 */
import type { Question, Step } from "../constants";
import {
  type AttendanceState,
  answersToStore,
  areAnswersRequired,
  attendanceForScoring,
  attendanceToRecord,
  isAuditPassive,
} from "./attendance";
import {
  type AnswerRowPayload,
  type AnswerRowSource,
  type AuditScore,
  type Rating,
  RATING_FACTOR,
  answerRowsFor,
  notGood,
  scoreAudit,
} from "./scoring";

/** The answer fields the record path reads; the form's own answer type carries more. */
export type RecordableAnswer = AnswerRowSource & { questionId: string };

/** The five step totals and the total, as the audit row stores them (two decimals). */
export type ScoreBody = {
  total_score: string;
  score_s1: string;
  score_s2: string;
  score_s3: string;
  score_s4: string;
  score_s5: string;
};

export function scoreBodyOf(score: Pick<AuditScore, "stepScores" | "total">): ScoreBody {
  const { S1, S2, S3, S4, S5 } = score.stepScores;
  return {
    total_score: score.total.toFixed(2),
    score_s1: (S1 ?? 0).toFixed(2),
    score_s2: (S2 ?? 0).toFixed(2),
    score_s3: (S3 ?? 0).toFixed(2),
    score_s4: (S4 ?? 0).toFixed(2),
    score_s5: (S5 ?? 0).toFixed(2),
  };
}

export type AuditRecordInput<A extends RecordableAnswer> = {
  attendance: AttendanceState;
  steps: readonly Step[];
  questions: readonly Question[];
  /** The form's own answers, typed or not, passive or not. */
  answers: Readonly<Record<string, A>>;
  /** The question already has an open finding (it is not asked for a second one). */
  hasOpenFinding: (questionId: string) => boolean;
  /** The answer has to carry a NEW finding, so saving writes one (scoring.ts → requiresNewFinding). */
  needsFinding: (answer: A) => boolean;
};

export type AuditRecord<A extends RecordableAnswer> = {
  /** The attendance box is not ticked where the rule applies: the questions are switched off. */
  passive: boolean;
  /** Kaydet insists on an answer, and on the details of a non-good one, for every question. */
  answersRequired: boolean;
  /** The questions Kaydet checks; none while passive, so nothing blocks the save. */
  toValidate: readonly Question[];
  /** Kaydet asks "did not attend, continue?" before saving a 0. */
  confirmNotAttended: boolean;
  /** What is scored, queued, sent and turned into findings; empty while passive. */
  answers: Readonly<Record<string, A>>;
  score: AuditScore;
  /** total_score and score_s1..score_s5 of the audit row; every one "0.00" while passive. */
  scoreBody: ScoreBody;
  /** What the plan is stamped with: true/false, or null where the location has no field manager. */
  attendanceStamp: boolean | null;
  /** Recorded answers rated Orta or Kötü, in question order. */
  nonGood: readonly A[];
  /** The non-good answers that write a new finding: a type was picked and a new one is due. */
  findings: readonly A[];
  /** Questions rated İyi although an open finding exists: Kaydet warns first. */
  goodButOpen: readonly Question[];
  /** Every recorded answer with its question, in question order (a correction patches or adds each). */
  answered: readonly { question: Question; answer: A }[];
  /** One five_s_audit_answers row per recorded answer; the queue stores and the save posts the same rows. */
  answerRows: (answeredAt: string) => AnswerRowPayload[];
};

export function buildAuditRecord<A extends RecordableAnswer>(input: AuditRecordInput<A>): AuditRecord<A> {
  const { attendance, steps, questions, hasOpenFinding, needsFinding } = input;
  const answers = answersToStore(attendance, input.answers);
  const passive = isAuditPassive(attendance);
  const answersRequired = areAnswersRequired(attendance);

  const score = scoreAudit(steps, questions, answers, {
    fieldManagerAttended: attendanceForScoring(attendance),
  });

  const answered = questions.flatMap((question) => {
    const answer = answers[question.id];
    return answer?.rating ? [{ question, answer }] : [];
  });
  const nonGood = answered.map((a) => a.answer).filter((a) => notGood(a.rating));

  return {
    passive,
    answersRequired,
    toValidate: answersRequired ? questions : [],
    confirmNotAttended: passive,
    answers,
    score,
    scoreBody: scoreBodyOf(score),
    attendanceStamp: attendanceToRecord(attendance),
    nonGood,
    findings: nonGood.filter((a) => !!a.findingType && needsFinding(a)),
    goodButOpen: questions.filter((q) => hasOpenFinding(q.id) && answers[q.id]?.rating === "good"),
    answered,
    answerRows: (answeredAt) => answerRowsFor(questions, answers, hasOpenFinding, answeredAt),
  };
}

/**
 * A question's own points as the Puan column shows them. Read from the
 * recorded answers: while passive there are none, so the column is empty
 * where the step scores and the total already say 0.
 */
export function questionPoint(
  question: Pick<Question, "maxScore">,
  recorded: { rating: Rating | null } | undefined,
): number | undefined {
  return recorded?.rating ? question.maxScore * RATING_FACTOR[recorded.rating] : undefined;
}

/** The Detaylar column exists when a question of the step is rated Orta or Kötü in the recorded answers. */
export function showsDetailsColumn(
  stepQuestions: readonly Pick<Question, "id">[],
  recorded: Readonly<Record<string, { rating: Rating | null } | undefined>>,
): boolean {
  return stepQuestions.some((q) => notGood(recorded[q.id]?.rating));
}
