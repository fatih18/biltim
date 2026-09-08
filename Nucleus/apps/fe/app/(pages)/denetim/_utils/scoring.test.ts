import { describe, expect, it } from "bun:test";
import type { Question, Step } from "../constants";
import {
  computeStepScores,
  computeTotalScore,
  formatScore,
  isExplanationRequired,
  RATING_FACTOR,
  type ScorableAnswer,
  TARGET_SCORE,
} from "./scoring";

const step = (code: Step["code"], maxScore = 20): Step => ({
  code,
  title: code,
  maxScore,
  order: 1,
});

const q = (id: string, stepCode: Question["stepCode"], maxScore = 10): Question => ({
  id,
  stepCode,
  order: 1,
  text: id,
  maxScore,
  requireExplanation: false,
});

const answers = (m: Record<string, ScorableAnswer["rating"]>) =>
  Object.fromEntries(Object.entries(m).map(([k, rating]) => [k, { rating }]));

const FIVE = [step("S1"), step("S2"), step("S3"), step("S4"), step("S5")];

describe("computeStepScores", () => {
  it("gives a step its full weight when every answer is good", () => {
    const scores = computeStepScores(
      [step("S1", 20)],
      [q("a", "S1", 10), q("b", "S1", 10)],
      answers({ a: "good", b: "good" }),
    );

    expect(scores.S1).toBe(20);
  });

  it("rescales the questions' own scale onto the step's", () => {
    // Four questions worth 10 each, in a step worth 20: full marks is still 20,
    // not 40. Getting this wrong is how a step scores double.
    const four = [q("a", "S1"), q("b", "S1"), q("c", "S1"), q("d", "S1")];
    const scores = computeStepScores(
      [step("S1", 20)],
      four,
      answers({ a: "good", b: "good", c: "good", d: "good" }),
    );

    expect(scores.S1).toBe(20);
  });

  it("counts a medium as half and a bad as nothing", () => {
    const scores = computeStepScores(
      [step("S1", 20)],
      [q("a", "S1"), q("b", "S1")],
      answers({ a: "medium", b: "bad" }),
    );

    expect(scores.S1).toBe(5);
    expect(RATING_FACTOR).toEqual({ good: 1, medium: 0.5, bad: 0 });
  });

  it("counts an unanswered question against the step, not out of it", () => {
    // Skipping a question must not make the audit look better than answering it
    // badly would.
    const scores = computeStepScores(
      [step("S1", 20)],
      [q("a", "S1"), q("b", "S1")],
      answers({ a: "good" }),
    );

    expect(scores.S1).toBe(10);
  });

  it("weights questions by their own maximum", () => {
    const scores = computeStepScores(
      [step("S1", 20)],
      [q("big", "S1", 30), q("small", "S1", 10)],
      answers({ big: "good", small: "bad" }),
    );

    expect(scores.S1).toBe(15);
  });

  it("scores a step with no questions as zero instead of dividing by zero", () => {
    const scores = computeStepScores([step("S1", 20)], [], {});
    expect(scores.S1).toBe(0);
    expect(Number.isNaN(scores.S1)).toBe(false);
  });

  it("scores a step whose questions are all worth nothing as zero", () => {
    const scores = computeStepScores(
      [step("S1", 20)],
      [q("a", "S1", 0)],
      answers({ a: "good" }),
    );
    expect(Number.isFinite(scores.S1)).toBe(true);
    expect(scores.S1).toBe(0);
  });

  it("keeps every step at zero until it is answered, and never leaves one undefined", () => {
    const scores = computeStepScores(FIVE, [q("a", "S3")], answers({ a: "good" }));

    expect(scores.S3).toBe(20);
    expect([scores.S1, scores.S2, scores.S4, scores.S5]).toEqual([0, 0, 0, 0]);
  });

  it("does not credit an answer to a question in another step", () => {
    const scores = computeStepScores(FIVE, [q("a", "S1")], answers({ a: "good" }));
    expect(scores.S2).toBe(0);
  });
});

describe("computeTotalScore", () => {
  it("adds the five steps up, so a perfect audit is 100", () => {
    const questions = FIVE.map((s) => q(`q-${s.code}`, s.code, 10));
    const all = answers(Object.fromEntries(questions.map((x) => [x.id, "good" as const])));

    expect(computeTotalScore(computeStepScores(FIVE, questions, all))).toBe(100);
  });

  it("sits below the target when half the answers are medium", () => {
    const questions = FIVE.map((s) => q(`q-${s.code}`, s.code, 10));
    const half = answers(Object.fromEntries(questions.map((x) => [x.id, "medium" as const])));
    const total = computeTotalScore(computeStepScores(FIVE, questions, half));

    expect(total).toBe(50);
    expect(total).toBeLessThan(TARGET_SCORE);
  });
});

describe("formatScore", () => {
  it("writes two decimals, which is what the stored row expects", () => {
    expect(formatScore(83.456)).toBe("83.46");
    expect(formatScore(0)).toBe("0.00");
  });

  it("shows a dash rather than NaN or an empty cell", () => {
    expect(formatScore(undefined)).toBe("-");
    expect(formatScore(null)).toBe("-");
    expect(formatScore(Number.NaN)).toBe("-");
  });
});

describe("isExplanationRequired", () => {
  const asks = { requireExplanation: true };
  const doesNot = { requireExplanation: false };

  it("asks for one when a question that wants it is not answered good", () => {
    expect(isExplanationRequired(asks, { rating: "medium" })).toBe(true);
    expect(isExplanationRequired(asks, { rating: "bad" })).toBe(true);
  });

  it("does not ask when the answer is good", () => {
    expect(isExplanationRequired(asks, { rating: "good" })).toBe(false);
  });

  it("does not ask before there is an answer at all", () => {
    expect(isExplanationRequired(asks, { rating: null })).toBe(false);
    expect(isExplanationRequired(asks, undefined)).toBe(false);
  });

  it("never asks for a question that does not want one", () => {
    expect(isExplanationRequired(doesNot, { rating: "bad" })).toBe(false);
  });
});
