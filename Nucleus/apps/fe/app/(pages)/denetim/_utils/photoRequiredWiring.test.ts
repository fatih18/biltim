import { describe, expect, it } from "bun:test";
import { bodyOf, pageCode } from "./pageSource";

/*
 * Wiring guard for the per-question photo rule (R72, photoRequired.ts).
 *
 * photoRequired.test.ts proves the decisions. The page is a ~5000-line client
 * component with no render harness, so this file proves on its source that the
 * page asks them in every place a save is refused: the live block list, the
 * save, and the single finding form. It fails by name when a function it reads
 * is gone.
 */

describe("the photo rule is asked wherever the form blocks a save", () => {
  it("submitForm blocks on a missing photo like on a missing explanation, and says which questions", () => {
    const body = bodyOf("submitForm");
    expect(body).toContain("photoMissing(q, ans, needsFindingDetails(q.id, ans))");
    expect(body).toContain("missing.add(q.id)");
    expect(body).toContain("photoGapToast(photoGap, steps)");
  });

  it("the live block list (liveUnanswered) counts a missing photo, so the button and the rows follow", () => {
    const code = pageCode;
    const live = code.slice(code.indexOf("const liveUnanswered"), code.indexOf("const [hasAttempted"));
    expect(live.length).toBeGreaterThan(200);
    expect(live).toContain("photoMissing(q, ans, needsFindingDetails(q.id, ans))");
    expect(live).toContain("if (!answersRequired) return s");
  });

  it("the single finding form refuses a photoless finding on a demanding question before it writes", () => {
    const body = bodyOf("saveSingleFinding");
    const refusal = body.indexOf("singleFindingPhotoRefusal(");
    expect(refusal).toBeGreaterThan(0);
    expect(refusal).toBeLessThan(body.indexOf("ADD_FIVE_S_AUDIT?.start"));
    expect(refusal).toBeLessThan(body.indexOf("enqueueSubmission("));
  });

  it("the gap is judged on the questions the save validates, never on the raw question list", () => {
    const code = pageCode;
    const gap = code.slice(code.indexOf("const photoGap = "), code.indexOf("const photoGapIds"));
    expect(gap).toContain("questions: auditRecord.toValidate");
    expect(gap).toContain("answers: auditRecord.answers");
    expect(gap).toContain("isUnchangedStoredAnswer(q.id, ans.rating)");
  });
});

describe("the page reads the question's setting without defaulting it on", () => {
  it("maps require_photo through the reader the master-data screen uses", () => {
    expect(pageCode).toContain("requirePhoto: readRequirePhoto(q.require_photo)");
    expect(pageCode).not.toContain("require_photo === true");
  });

  it("shows the inline hint on both the table row and the phone row, the list and the label marks", () => {
    expect(pageCode.match(/<PhotoRowHint /g)).toHaveLength(2);
    expect(pageCode.match(/<PhotoGapList /g)).toHaveLength(1);
    expect(pageCode.match(/<PhotoLabelMark/g)).toHaveLength(2);
  });
});
