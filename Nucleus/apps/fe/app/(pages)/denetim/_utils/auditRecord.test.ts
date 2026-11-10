import { describe, expect, it } from "bun:test";
import type { Question, Step } from "../constants";
import type { AttendanceState } from "./attendance";
import {
  type RecordableAnswer,
  buildAuditRecord,
  questionPoint,
  scoreBodyOf,
  showsDetailsColumn,
} from "./auditRecord";

const withManager = (fieldManagerAttended: AttendanceState["fieldManagerAttended"]): AttendanceState => ({
  locationHasFieldManager: true,
  fieldManagerAttended,
});
const withoutManager = (fieldManagerAttended: AttendanceState["fieldManagerAttended"]): AttendanceState => ({
  locationHasFieldManager: false,
  fieldManagerAttended,
});

const codes: Step["code"][] = ["S1", "S2", "S3", "S4", "S5"];
const steps: Step[] = codes.map((code, i) => ({
  code,
  title: code,
  maxScore: 20,
  order: i + 1,
}));
const questions: Question[] = steps.map((s) => ({
  id: `${s.code}-Q1`,
  stepCode: s.code,
  order: 1,
  text: s.code,
  maxScore: 10,
  requireExplanation: true,
}));

const answer = (
  questionId: string,
  rating: RecordableAnswer["rating"],
  findingType: string | null = null,
): RecordableAnswer => ({ questionId, rating, explanation: "", findingType });

/** S1 good (open finding), S2 medium + type, S3 bad + type (open finding), S4 bad without a type, S5 good. */
const typed: Record<string, RecordableAnswer> = {
  "S1-Q1": answer("S1-Q1", "good"),
  "S2-Q1": answer("S2-Q1", "medium", "dagınık"),
  "S3-Q1": answer("S3-Q1", "bad", "kirli"),
  "S4-Q1": answer("S4-Q1", "bad"),
  "S5-Q1": answer("S5-Q1", "good"),
};
const openFindings = new Set(["S1-Q1", "S3-Q1"]);

function recordFor(state: AttendanceState, needsFindingCalls?: string[]) {
  return buildAuditRecord({
    attendance: state,
    steps,
    questions,
    answers: typed,
    hasOpenFinding: (id) => openFindings.has(id),
    needsFinding: (a) => {
      needsFindingCalls?.push(a.questionId);
      return !openFindings.has(a.questionId);
    },
  });
}
const ids = (list: readonly { questionId: string }[]) => list.map((a) => a.questionId);

describe("buildAuditRecord, box ticked", () => {
  const record = recordFor(withManager(true));

  it("records every answer exactly as typed and asks Kaydet to check every question", () => {
    expect(record.passive).toBe(false);
    expect(record.answersRequired).toBe(true);
    expect(record.confirmNotAttended).toBe(false);
    expect(record.answers).toBe(typed);
    expect(record.toValidate).toEqual(questions);
  });

  it("sends the scores of the typed answers and stamps the plan with the tick", () => {
    expect(record.scoreBody).toEqual({
      total_score: "50.00",
      score_s1: "20.00",
      score_s2: "10.00",
      score_s3: "0.00",
      score_s4: "0.00",
      score_s5: "20.00",
    });
    expect(record.attendanceStamp).toBe(true);
  });

  it("builds one answer row per answer, the open-finding flag decided against the form's open findings", () => {
    const rows = record.answerRows("2026-11-10T10:00:00.000Z");
    expect(rows.map((r) => r.question_id)).toEqual(questions.map((q) => q.id));
    expect(rows.map((r) => r.has_open_finding)).toEqual([false, true, true, false, false]);
    expect(new Set(rows.map((r) => r.answered_at))).toEqual(new Set(["2026-11-10T10:00:00.000Z"]));
  });

  it("writes a new finding only for a non-good answer with a type that is not already an open finding", () => {
    expect(ids(record.nonGood)).toEqual(["S2-Q1", "S3-Q1", "S4-Q1"]);
    expect(ids(record.findings)).toEqual(["S2-Q1"]);
  });

  it("warns about an İyi over an open finding, and hands a correction every answered question in order", () => {
    expect(record.goodButOpen.map((q) => q.id)).toEqual(["S1-Q1"]);
    expect(record.answered.map((a) => a.question.id)).toEqual(questions.map((q) => q.id));
    expect(record.answered[1]?.answer).toBe(typed["S2-Q1"]);
  });
});

describe("buildAuditRecord, passive (box not ticked)", () => {
  const states: [string, AttendanceState][] = [
    ["unticked", withManager(false)],
    ["untouched", withManager(undefined)],
    ["null", withManager(null)],
  ];

  for (const [name, state] of states) {
    it(`${name}: records no answer, finding or warning, scores 0.00 everywhere, validates nothing`, () => {
      const calls: string[] = [];
      const record = recordFor(state, calls);
      expect(record.passive).toBe(true);
      expect(Object.keys(record.answers)).toEqual([]);
      expect(record.answered).toEqual([]);
      expect(record.nonGood).toEqual([]);
      expect(record.findings).toEqual([]);
      expect(record.goodButOpen).toEqual([]);
      expect(record.answerRows("2026-11-10T10:00:00.000Z")).toEqual([]);
      expect(Object.values(record.scoreBody)).toEqual(["0.00", "0.00", "0.00", "0.00", "0.00", "0.00"]);
      expect(record.attendanceStamp).toBe(false);
      // The new-finding rule is never even asked about an answer nobody records.
      expect(calls).toEqual([]);
      // No validation: Kaydet cannot refuse for a question nobody can answer; it asks to confirm the 0.
      expect(record.answersRequired).toBe(false);
      expect(record.toValidate).toEqual([]);
      expect(record.confirmNotAttended).toBe(true);
    });
  }

  it("leaves the typed answers untouched: ticking the box again brings the same record back", () => {
    const before = JSON.stringify(typed);
    recordFor(withManager(false));
    expect(JSON.stringify(typed)).toBe(before);
    expect(recordFor(withManager(true)).answers).toBe(typed);
  });
});

describe("buildAuditRecord, location without a field manager", () => {
  it("never goes passive, records the answers, requires them and stamps no attendance", () => {
    const ticks: AttendanceState["fieldManagerAttended"][] = [undefined, null, false, true];
    for (const tick of ticks) {
      const record = recordFor(withoutManager(tick));
      expect(record.passive).toBe(false);
      expect(record.answers).toBe(typed);
      expect(record.toValidate).toEqual(questions);
      expect(record.confirmNotAttended).toBe(false);
      expect(record.attendanceStamp).toBeNull();
      expect(record.scoreBody.total_score).toBe("50.00");
    }
  });
});

describe("scoreBodyOf", () => {
  it("writes the total and the five steps with two decimals", () => {
    const body = scoreBodyOf({ stepScores: { S1: 17.5, S2: 0, S3: 20, S4: 3.3333, S5: 1 }, total: 41.8333 });
    expect(body).toEqual({
      total_score: "41.83",
      score_s1: "17.50",
      score_s2: "0.00",
      score_s3: "20.00",
      score_s4: "3.33",
      score_s5: "1.00",
    });
  });
});

describe("the Puan column and the Detaylar column read the recorded answers", () => {
  it("questionPoint is the question's own points, nothing for an unanswered one", () => {
    const q = { maxScore: 2.5 };
    expect(questionPoint(q, { rating: "good" })).toBe(2.5);
    expect(questionPoint(q, { rating: "medium" })).toBe(1.25);
    expect(questionPoint(q, { rating: "bad" })).toBe(0);
    expect(questionPoint(q, { rating: null })).toBeUndefined();
    expect(questionPoint(q, undefined)).toBeUndefined();
  });

  it("passive: no question shows a point and no step shows the Detaylar column, although answers were typed", () => {
    const record = recordFor(withManager(false));
    expect(questions.map((q) => questionPoint(q, record.answers[q.id])).every((p) => p === undefined)).toBe(true);
    expect(showsDetailsColumn(questions, record.answers)).toBe(false);
  });

  it("active: the same typed answers show their points and the Detaylar column", () => {
    const record = recordFor(withManager(true));
    expect(questions.map((q) => questionPoint(q, record.answers[q.id]))).toEqual([10, 5, 0, 0, 10]);
    expect(showsDetailsColumn(questions, record.answers)).toBe(true);
    expect(showsDetailsColumn(questions.slice(0, 1), record.answers)).toBe(false);
  });
});
