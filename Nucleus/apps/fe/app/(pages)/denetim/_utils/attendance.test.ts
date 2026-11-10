import { describe, expect, it } from "bun:test";
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
  ATTENDANCE_HINT,
  ATTENDANCE_LABEL,
  NOT_ATTENDED_CONFIRM,
  NO_FIELD_MANAGER_TEXT,
  PASSIVE_NOTICE,
  noAnswersNotice,
  unknownAttendanceWarning,
} from "./attendanceText";
import { type Rating, answerRowsFor, answersStillToSend, scoreAudit } from "./scoring";

/** An answer as the form holds it: what scoring reads plus what the save writes. */
type TypedAnswer = { rating: Rating | null; explanation: string; findingType: string | null };

const withManager = (fieldManagerAttended: AttendanceState["fieldManagerAttended"]): AttendanceState => ({
  locationHasFieldManager: true,
  fieldManagerAttended,
});
const withoutManager = (fieldManagerAttended: AttendanceState["fieldManagerAttended"]): AttendanceState => ({
  locationHasFieldManager: false,
  fieldManagerAttended,
});

describe("isAuditPassive / areAnswersRequired", () => {
  it("is passive while the box is not ticked, and an untouched box is not ticked", () => {
    expect(isAuditPassive(withManager(undefined))).toBe(true);
    expect(isAuditPassive(withManager(null))).toBe(true);
    expect(isAuditPassive(withManager(false))).toBe(true);
    expect(areAnswersRequired(withManager(undefined))).toBe(false);
    expect(areAnswersRequired(withManager(false))).toBe(false);
  });

  it("is active once the box is ticked, and asks for every answer again", () => {
    expect(isAuditPassive(withManager(true))).toBe(false);
    expect(areAnswersRequired(withManager(true))).toBe(true);
  });

  it("never applies where the location has no field manager", () => {
    const ticks: AttendanceState["fieldManagerAttended"][] = [undefined, null, false, true];
    for (const tick of ticks) {
      expect(isAuditPassive(withoutManager(tick))).toBe(false);
      expect(areAnswersRequired(withoutManager(tick))).toBe(true);
      expect(attendanceForScoring(withoutManager(tick))).toBe(true);
    }
  });
});

describe("attendanceToRecord", () => {
  it("stamps the plan with the tick as a plain true/false", () => {
    expect(attendanceToRecord(withManager(true))).toBe(true);
    expect(attendanceToRecord(withManager(false))).toBe(false);
    // An untouched box is stamped false, not left as "no record": nobody attended.
    expect(attendanceToRecord(withManager(undefined))).toBe(false);
  });

  it("records nothing where the rule does not apply", () => {
    expect(attendanceToRecord(withoutManager(undefined))).toBeNull();
    expect(attendanceToRecord(withoutManager(true))).toBeNull();
  });
});

describe("answersToStore", () => {
  const typed: Record<string, TypedAnswer> = {
    q1: { rating: "good", explanation: "", findingType: null },
    q2: { rating: "bad", explanation: "kirli", findingType: "Temizlik" },
  };

  it("keeps the answers of an active audit exactly as they are", () => {
    expect(answersToStore(withManager(true), typed)).toBe(typed);
    expect(answersToStore(withoutManager(undefined), typed)).toBe(typed);
  });

  it("stores none for a passive audit, and leaves what was typed untouched for when the box is ticked again", () => {
    const stored = answersToStore(withManager(false), typed);
    expect(Object.keys(stored)).toEqual([]);
    expect(typed.q2?.rating).toBe("bad");
    expect(answersToStore(withManager(true), typed)).toBe(typed);
  });
});

describe("a passive audit through the same functions the save and the offline queue use", () => {
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
  const good: TypedAnswer = { rating: "good", explanation: "", findingType: null };
  const typed: Record<string, TypedAnswer> = Object.fromEntries(questions.map((x) => [x.id, good]));

  const scoreFor = (state: AttendanceState) =>
    scoreAudit(steps, questions, answersToStore(state, typed), {
      fieldManagerAttended: attendanceForScoring(state),
    });

  it("is stored with a total of 0 and every step at 0", () => {
    const r = scoreFor(withManager(false));
    expect(r.total).toBe(0);
    expect(Object.values(r.stepScores)).toEqual([0, 0, 0, 0, 0]);
    expect(r.adjustments.join(" ")).toContain("katılmadı");
  });

  it("scores the typed answers again as soon as the box is ticked", () => {
    expect(scoreFor(withManager(true)).total).toBeCloseTo(100);
  });

  it("queues no answer rows, so the replay has nothing to post and nothing to refuse", () => {
    const rows = answerRowsFor(
      questions,
      answersToStore(withManager(false), typed),
      () => false,
      "2026-11-10T10:00:00.000Z",
    );
    expect(rows).toEqual([]);
    expect(answersStillToSend(rows, undefined)).toEqual([]);
    expect(answersStillToSend(rows, ["S1-Q1"])).toEqual([]);
  });

  it("queues the answer rows of an active audit as before", () => {
    const rows = answerRowsFor(
      questions,
      answersToStore(withManager(true), typed),
      () => false,
      "2026-11-10T10:00:00.000Z",
    );
    expect(rows.map((r) => r.question_id)).toEqual(questions.map((x) => x.id));
  });
});

describe("the words", () => {
  const all = [
    ATTENDANCE_LABEL,
    ATTENDANCE_HINT,
    NO_FIELD_MANAGER_TEXT,
    PASSIVE_NOTICE,
    NOT_ATTENDED_CONFIRM.title,
    NOT_ATTENDED_CONFIRM.message,
    unknownAttendanceWarning(true),
    unknownAttendanceWarning(false),
    noAnswersNotice({ hadAnswers: false, initialAttended: false }),
    noAnswersNotice({ hadAnswers: false, initialAttended: true }),
  ];

  it("the label is the customer's wording", () => {
    expect(ATTENDANCE_LABEL).toBe("Bölge sorumlusu veya görevlendirdiği kişi denetime katıldı");
  });

  it("no message repeats the old wording", () => {
    for (const text of all) expect(text).not.toContain("Bölge sorumlusu denetime katıldı");
  });

  it("the passive line says the audit is saved with score 0 and what to do", () => {
    expect(PASSIVE_NOTICE).toContain("0 puan");
    expect(PASSIVE_NOTICE).toContain("kutuyu işaretleyin");
  });

  it("the correction screen explains a missing answer set by its real cause", () => {
    expect(noAnswersNotice({ hadAnswers: true, initialAttended: false })).toBe("");
    expect(noAnswersNotice({ hadAnswers: false, initialAttended: false })).toContain("katılmadığı için");
    expect(noAnswersNotice({ hadAnswers: false, initialAttended: true })).toContain("eski kayıt");
  });

  it("the unknown-attendance warning names the box it asks to be ticked", () => {
    expect(unknownAttendanceWarning(true)).toContain("planı okunamadı");
    expect(unknownAttendanceWarning(false)).toContain("planı bulunamadı");
    expect(unknownAttendanceWarning(false)).toContain(`"${ATTENDANCE_LABEL}"`);
  });
});
