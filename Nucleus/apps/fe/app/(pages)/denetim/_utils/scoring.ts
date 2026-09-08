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
