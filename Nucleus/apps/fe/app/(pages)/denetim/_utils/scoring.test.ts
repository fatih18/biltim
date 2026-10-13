import { describe, expect, it } from "bun:test";
import type { Question, Step } from "../constants";
import {
  answerRowsFor,
  answersStillToSend,
  computeStepScores,
  computeTotalScore,
  formatScore,
  isExplanationRequired,
  mapOpenFindingsByQuestion,
  RATING_FACTOR,
  type ScorableAnswer,
  TARGET_SCORE,
  requiresNewFinding,
  scoreAudit,
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

describe("scoreAudit — the plant's rules (Notlar 07.10)", () => {
  // Five steps worth 20, each with five questions worth 4, numbered like the form.
  const STEPS: Step[] = (["S1", "S2", "S3", "S4", "S5"] as const).map((code, i) => ({
    code,
    title: code,
    maxScore: 20,
    order: i + 1,
  }));
  const QUESTIONS: Question[] = STEPS.flatMap((s) =>
    [1, 2, 3, 4, 5].map((n) => ({
      id: `${s.code}-Q${n}`,
      stepCode: s.code,
      order: n,
      text: `${s.order}.${n}`,
      maxScore: 4,
      requireExplanation: false,
    })),
  );
  const allGood = () =>
    Object.fromEntries(QUESTIONS.map((x) => [x.id, { rating: "good" as const }])) as Record<
      string,
      ScorableAnswer
    >;

  it("is the plain sum when no rule applies", () => {
    const r = scoreAudit(STEPS, QUESTIONS, allGood(), { fieldManagerAttended: true });
    expect(r.total).toBeCloseTo(100);
    expect(r.adjustments).toEqual([]);
  });

  it("zeroes step 5 when 5.1 is Orta or Kötü", () => {
    const a = allGood();
    a["S5-Q1"] = { rating: "medium" };
    const r = scoreAudit(STEPS, QUESTIONS, a, { fieldManagerAttended: true });
    expect(r.stepScores.S5).toBe(0);
    expect(r.total).toBeCloseTo(80);
  });

  it("takes 10% off the total for 2.3, and another 10% for 5.5", () => {
    const a = allGood();
    a["S2-Q3"] = { rating: "bad" };
    // 2.3 itself costs its 4 points (scaled 4 -> 4): 96, then 10% off.
    expect(scoreAudit(STEPS, QUESTIONS, a, { fieldManagerAttended: true }).total).toBeCloseTo(96 * 0.9);
    a["S5-Q5"] = { rating: "medium" };
    // 96 - 2 = 94, then 20% off.
    expect(scoreAudit(STEPS, QUESTIONS, a, { fieldManagerAttended: true }).total).toBeCloseTo(94 * 0.8);
  });

  it("scores the audit 0 when the field manager did not attend", () => {
    const r = scoreAudit(STEPS, QUESTIONS, allGood(), { fieldManagerAttended: false });
    expect(r.total).toBe(0);
    expect(r.adjustments.join(" ")).toContain("katılmadı");
  });

  it("finds the questions by the form's numbering, not by id", () => {
    // Same question set, ids shuffled: 2.3 is still step order 2, question order 3.
    const renamed = QUESTIONS.map((x) => ({ ...x, id: `x-${x.text}` }));
    const a = Object.fromEntries(renamed.map((x) => [x.id, { rating: "good" as const }])) as Record<
      string,
      ScorableAnswer
    >;
    a["x-2.3"] = { rating: "medium" };
    const r = scoreAudit(STEPS, renamed, a, { fieldManagerAttended: true });
    expect(r.total).toBeCloseTo(98 * 0.9);
  });
});

describe("requiresNewFinding", () => {
  it("asks a new audit for a finding on every Orta/Kötü, and never on İyi", () => {
    expect(requiresNewFinding("medium", { hasOpenFinding: false })).toBe(true);
    expect(requiresNewFinding("bad", { hasOpenFinding: false })).toBe(true);
    expect(requiresNewFinding("good", { hasOpenFinding: false })).toBe(false);
    expect(requiresNewFinding(null, { hasOpenFinding: false })).toBe(false);
  });

  it("does not ask for a second finding when the question already has an open one", () => {
    expect(requiresNewFinding("bad", { hasOpenFinding: true })).toBe(false);
  });

  it("in a correction, asks only for an answer moved down from İyi or from no answer", () => {
    expect(requiresNewFinding("bad", { hasOpenFinding: false, storedRating: "good" })).toBe(true);
    expect(requiresNewFinding("medium", { hasOpenFinding: false, storedRating: null })).toBe(true);
  });

  it("in a correction, leaves an Orta/Kötü that was already stored alone — changed or not", () => {
    // Its finding was written when the audit was saved.
    expect(requiresNewFinding("medium", { hasOpenFinding: false, storedRating: "medium" })).toBe(false);
    expect(requiresNewFinding("bad", { hasOpenFinding: false, storedRating: "medium" })).toBe(false);
    expect(requiresNewFinding("medium", { hasOpenFinding: false, storedRating: "bad" })).toBe(false);
  });
});

describe("answerRowsFor — the answer rows the online save and the offline replay both post", () => {
  const qs = [q("S1-1", "S1"), q("S1-2", "S1"), q("S2-1", "S2"), q("S2-2", "S2")];
  const at = "2026-10-13T08:00:00.000Z";

  it("writes one row per answered question, in question order, and none for an unanswered one", () => {
    const rows = answerRowsFor(
      qs,
      { "S2-1": { rating: "good" }, "S1-1": { rating: "good" }, "S1-2": { rating: null } },
      () => false,
      at,
    );
    expect(rows.map((r) => r.question_id)).toEqual(["S1-1", "S2-1"]);
    expect(rows[0]).toEqual({
      question_id: "S1-1",
      step_code: "S1",
      rating: "good",
      explanation: undefined,
      finding_type: undefined,
      has_open_finding: false,
      answered_at: at,
    });
  });

  it("trims the explanation and leaves an empty one and an empty type out", () => {
    const [row] = answerRowsFor(
      qs,
      { "S1-1": { rating: "medium", explanation: "  dağınık  ", findingType: "" } },
      () => false,
      at,
    );
    expect(row?.explanation).toBe("dağınık");
    expect(row?.finding_type).toBeUndefined();
    const [blank] = answerRowsFor(qs, { "S1-1": { rating: "medium", explanation: "   " } }, () => false, at);
    expect(blank?.explanation).toBeUndefined();
  });

  it("marks a non-good answer as having an open finding when it gets one now or already has one", () => {
    const rows = answerRowsFor(
      qs,
      {
        "S1-1": { rating: "bad", findingType: "Düzen" },
        "S1-2": { rating: "medium" },
        "S2-1": { rating: "medium" },
        "S2-2": { rating: "good", findingType: "Düzen" },
      },
      (qid) => qid === "S2-1" || qid === "S2-2",
      at,
    );
    const flag = Object.fromEntries(rows.map((r) => [r.question_id, r.has_open_finding]));
    expect(flag).toEqual({ "S1-1": true, "S1-2": false, "S2-1": true, "S2-2": false });
  });
});

describe("answersStillToSend — resuming a queued submission's answers", () => {
  const row = (question_id: string) => ({
    question_id,
    step_code: "S1",
    rating: "good" as const,
    has_open_finding: false,
    answered_at: "2026-10-13T08:00:00.000Z",
  });

  it("skips the answers an earlier attempt already sent", () => {
    const left = answersStillToSend([row("a"), row("b"), row("c")], ["a", "c"]);
    expect(left.map((r) => r.question_id)).toEqual(["b"]);
  });

  it("sends everything on the first attempt", () => {
    expect(answersStillToSend([row("a"), row("b")], undefined)).toHaveLength(2);
  });

  it("replays a submission queued before answers were stored as having none to send", () => {
    expect(answersStillToSend(undefined, undefined)).toEqual([]);
    expect(answersStillToSend(null, ["a"])).toEqual([]);
  });
});

describe("mapOpenFindingsByQuestion", () => {
  it("lists a question's open and in-progress findings by number, and leaves closed ones out", () => {
    const map = mapOpenFindingsByQuestion([
      { question_id: "S1-1", status: "open", finding_no: 7 },
      { question_id: "S1-1", status: "in_progress", finding_no: 9 },
      { question_id: "S1-2", status: "closed", finding_no: 3 },
    ]);
    expect(map.get("S1-1")).toEqual(["#7", "#9"]);
    expect(map.has("S1-2")).toBe(false);
  });

  it("reads the question from an older finding's description", () => {
    const map = mapOpenFindingsByQuestion([
      { status: "open", description: "Soru ID: S3-2\nAdım: S3", finding_no: 4 },
      { status: "open", description: "TEKİL BULGU\nBağlı Soru: S4-1", finding_no: null },
      { status: "open", description: "bağsız" },
    ]);
    expect(map.get("S3-2")).toEqual(["#4"]);
    expect(map.get("S4-1")).toEqual(["#?"]);
    expect(map.size).toBe(2);
  });

  it("counts a single finding still in the offline queue as the open finding", () => {
    const map = mapOpenFindingsByQuestion([{ question_id: "S1-1", status: "open", finding_no: 2 }], ["S1-1", "S2-1"]);
    expect(map.get("S1-1")).toEqual(["#2", "kuyrukta"]);
    expect(map.get("S2-1")).toEqual(["kuyrukta"]);
  });
});
