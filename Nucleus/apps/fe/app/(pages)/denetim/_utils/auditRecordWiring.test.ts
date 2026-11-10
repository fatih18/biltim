import { describe, expect, it } from "bun:test";

/*
 * Wiring guard for the attendance box (Notlar 22.10, satır 39).
 *
 * auditRecord.test.ts proves what the record holds while the form is passive.
 * This file proves the page reads it: every save path takes its body from
 * `auditRecord`, none of them reads the raw `answers` state, and the Puan and
 * Detaylar columns read the recorded answers. The page is a ~5000-line client
 * component with no render harness, so the check is on its source: it names
 * the exact spot that was bypassed when it fails.
 */
const source = (await Bun.file(new URL("../page.tsx", import.meta.url)).text()).replace(/\r\n/g, "\n");

const withoutComments = (text: string) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\s\/\/ .*$/gm, "");

/** The body of one of the component's own functions, comments removed (they end at the line `  }`). */
function bodyOf(name: string): string {
  const start = source.indexOf(`\n  const ${name} = `);
  if (start < 0) throw new Error(`page.tsx has no function ${name}`);
  const end = source.indexOf("\n  }\n", start);
  if (end < 0) throw new Error(`page.tsx: the end of ${name} was not found`);
  return withoutComments(source.slice(start, end + "\n  }\n".length));
}

/** The form's own state, read by name: not `auditRecord.answers`, not a key such as `answers:`. */
const RAW_ANSWERS = /(?<![\w$.])answers(?![\w$])(?!\s*:)/;

const SAVE_PATHS = [
  "enqueueAuditAndFindingsFromForm",
  "submitAuditEdit",
  "submitForm",
  "finishSentAudit",
  "markPlanCompleted",
];

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
    const code = withoutComments(source);
    expect(code).not.toContain("scoreAudit(");
    expect(code).not.toContain("answerRowsFor(");
    expect(code).not.toContain("answersToStore(");
    expect(code).not.toContain("RATING_FACTOR");
  });

  it("the record is built once, from the form's raw answers and its attendance", () => {
    const code = withoutComments(source);
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
  const code = withoutComments(source);

  it("the Puan cell of the desktop row and of the mobile row, and the Detaylar column", () => {
    expect(code.match(/questionPoint\(q, recordedAnswers\[q\.id\]\)/g)).toHaveLength(2);
    expect(code).toContain("showsDetailsColumn(stepQuestions, recordedAnswers)");
  });

  it("recordedAnswers is the record's own answers", () => {
    expect(code).toMatch(/answers: recordedAnswers\b/);
    expect(code).toContain("= auditRecord");
  });
});
