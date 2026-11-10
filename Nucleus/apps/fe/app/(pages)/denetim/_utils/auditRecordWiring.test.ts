import { describe, expect, it } from "bun:test";
import { bodyOf, pageCode } from "./pageSource";

/*
 * Wiring guard for the attendance box (Notlar 22.10, satır 39).
 *
 * auditRecord.test.ts proves what the record holds while the form is passive.
 * This file proves the page reads it: every save path takes its body from
 * `auditRecord`, none of them reads the raw `answers` state, and the Puan and
 * Detaylar columns read the recorded answers. The page is a ~5000-line client
 * component with no render harness, so the check is on its source
 * (pageSource.ts): it names the exact spot that was bypassed when it fails, and
 * it fails by name when a function it reads is gone.
 */

/** The form's own state, read by name: not `auditRecord.answers`, not a key such as `answers:`. */
const RAW_ANSWERS = /(?<![\w$.])answers(?![\w$])(?!\s*:)/;

const SAVE_PATHS = [
  "enqueueAuditAndFindingsFromForm",
  "submitAuditEdit",
  "submitForm",
  "finishSentAudit",
  "markPlanCompleted",
];

describe("the guards find every function they read", () => {
  for (const name of [...SAVE_PATHS, "fetchAssignment", "createFindingForAnswer"]) {
    it(`page.tsx has a ${name} with a body`, () => {
      expect(bodyOf(name).length).toBeGreaterThan(0);
    });
  }

  it("fails loudly for a function that is not there", () => {
    expect(() => bodyOf("noSuchFunction")).toThrow("page.tsx has no function noSuchFunction");
  });
});

describe("the save paths read the record, never the raw answers", () => {
  for (const name of SAVE_PATHS) {
    it(`${name} does not read the raw answers state, the score or the step totals`, () => {
      const body = bodyOf(name);
      expect(body).not.toMatch(RAW_ANSWERS);
      expect(body).not.toMatch(/\brecordedAnswers\b/);
      expect(body).not.toMatch(/\b(totalScore|stepScores|auditScore)\b/);
      expect(body).not.toContain("Object.values(");
    });
  }

  it("the page no longer scores, builds answer rows or filters answers on its own", () => {
    const code = pageCode;
    expect(code).not.toContain("scoreAudit(");
    expect(code).not.toContain("answerRowsFor(");
    expect(code).not.toContain("answersToStore(");
    expect(code).not.toContain("RATING_FACTOR");
  });

  it("the record is built once, from the form's raw answers and its attendance", () => {
    const code = pageCode;
    expect(code.match(/buildAuditRecord\(/g)).toHaveLength(1);
    const call = code.slice(code.indexOf("buildAuditRecord({"), code.indexOf("buildAuditRecord({") + 400);
    expect(call).toContain("attendance,");
    expect(call).toMatch(/\n\s+answers,\n/);
  });
});

describe("each save path takes its body from the record", () => {
  const needs: [string, string[]][] = [
    // Offline queue: the score fields, the answer rows, the findings and the stamp it replays with.
    [
      "enqueueAuditAndFindingsFromForm",
      [
        "...auditRecord.scoreBody",
        "auditRecord.findings",
        "auditRecord.answerRows(",
        "fieldManagerAttended: auditRecord.attendanceStamp",
      ],
    ],
    // Merkez Ekip's correction: score fields, every recorded answer, new findings.
    ["submitAuditEdit", ["...auditRecord.scoreBody", "auditRecord.answered", "auditRecord.findings"]],
    // Online save: validation, the not-attended confirmation, the warning, the audit row.
    [
      "submitForm",
      [
        "auditRecord.toValidate",
        "auditRecord.answers[q.id]",
        "auditRecord.confirmNotAttended",
        "auditRecord.goodButOpen",
        "...auditRecord.scoreBody",
      ],
    ],
    // What follows the saved audit row: its answer rows and its findings.
    ["finishSentAudit", ["auditRecord.answerRows(", "auditRecord.nonGood", "auditRecord.findings"]],
    // The plan stamp.
    ["markPlanCompleted", ["auditRecord.attendanceStamp"]],
  ];

  for (const [name, expected] of needs) {
    it(`${name} uses ${expected.join(", ")}`, () => {
      const body = bodyOf(name);
      for (const text of expected) expect(body).toContain(text);
    });
  }

  it("the correction's answer rows and the findings are not rebuilt from the questions", () => {
    expect(bodyOf("submitAuditEdit")).not.toMatch(/questions\s*\.(filter|map)\(/);
    expect(bodyOf("finishSentAudit")).not.toContain("needsFindingDetails");
  });
});

describe("the question table reads the recorded answers", () => {
  const code = pageCode;

  it("the Puan cell of the desktop row and of the mobile row, and the Detaylar column", () => {
    expect(code.match(/questionPoint\(q, recordedAnswers\[q\.id\]\)/g)).toHaveLength(2);
    expect(code).toContain("showsDetailsColumn(stepQuestions, recordedAnswers)");
  });

  it("recordedAnswers is the record's own answers", () => {
    expect(code).toMatch(/answers: recordedAnswers\b/);
    expect(code).toContain("= auditRecord");
  });
});

describe("the correction screen reads attendance through the helper, gated by the rule", () => {
  const body = bodyOf("fetchAssignment");

  it("calls initialAttendanceOf with the plan, the recorded tick and the stored total", () => {
    expect(body).toContain("initialAttendanceOf({");
    const call = body.slice(body.indexOf("initialAttendanceOf({"), body.indexOf("initialAttendanceOf({") + 200);
    expect(call).toContain("planFound: !!plan");
    expect(call).toContain("recorded: recordedAttendance");
    expect(call).toContain("storedTotal");
  });

  it("computes the rule gate once, and the toast and the stored value both use it", () => {
    expect(body.match(/const ruleApplies = /g)).toHaveLength(1);
    expect(body).toContain("if (attendanceUnknown && ruleApplies)");
    expect(body).toContain("attendanceUnknown: attendanceUnknown && ruleApplies,");
    // No ungated attendanceUnknown reaches the screen's state.
    expect(body).not.toMatch(/\n\s+attendanceUnknown,\n/);
  });

  it("the banner passes the rule gate to noAnswersNotice", () => {
    const call = pageCode.slice(pageCode.indexOf("noAnswersNotice({"), pageCode.indexOf("noAnswersNotice({") + 400);
    expect(call).toContain("attendanceUnknown: editAudit.attendanceUnknown");
    expect(call).toContain("ruleApplies: locationHasFieldManager");
  });
});

describe("the open-finding notice of a question row reads the recorded rating", () => {
  /** Every <OpenFindingNotice ... /> of a question row (the ones given the row's open findings). */
  const rowNotices = pageCode.match(/<OpenFindingNotice\s+labels=\{openFindingsByQuestion\.get\(q\.id\)[\s\S]*?\/>/g) ?? [];

  it("is rendered by the desktop row and by the mobile row", () => {
    expect(rowNotices).toHaveLength(2);
  });

  it("takes its rating from recordedAnswers, which is empty while the form is passive", () => {
    for (const notice of rowNotices) expect(notice).toContain("rating={recordedAnswers[q.id]?.rating}");
  });
});
