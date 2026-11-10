import { describe, expect, it } from "bun:test";
import { bodyOf, pageCode } from "./pageSource";

/*
 * Wiring guard for the correction of a rejected audit (R30) and the single
 * finding work (R19, R2/R17): the decisions are pure and tested on their own;
 * this proves the page asks them. Source-text checks, see pageSource.ts.
 */

describe("an unreadable plan does not open the correction", () => {
  const body = bodyOf("fetchAssignment");

  it("asks editPlanVerdict with the address's planId and the plan that was read", () => {
    expect(body).toContain("new URLSearchParams(window.location.search).get('planId')");
    expect(body).toContain("editPlanVerdict({ addressPlanId, plan: plan ?? null }) === 'unreadable'");
    expect(body).toContain("setEditPlanUnreadable(true)");
  });

  it("clears the flag when it reads again, and shows the screen with a retry", () => {
    expect(body).toContain("setEditPlanUnreadable(false)");
    expect(pageCode).toContain("if (editPlanUnreadable) return <EditPlanUnreadable onRetry={fetchAssignment} />");
  });

  it("decides before the form state is set", () => {
    expect(body.indexOf("editPlanVerdict(")).toBeLessThan(body.indexOf("setEditAudit({"));
  });
});

describe("the teams are read page by page", () => {
  it("through the shared reader, not one read of 2000", () => {
    const body = bodyOf("fetchAssignment");
    expect(body).toContain("readAllTeams(startTeams, apiCallError)");
    expect(body).not.toMatch(/startAsPromise\(startTeams/);
  });
});

describe("a correction counts every write before it resends", () => {
  it("createFindingForAnswer says whether the finding saved and how many photos failed", () => {
    const body = bodyOf("createFindingForAnswer");
    expect(body).toContain("Promise<FindingWrite>");
    expect(body).toContain("return { saved: true, failedPhotos }");
    expect(body).toContain("return { saved: false, failedPhotos }");
    expect(body.match(/failedPhotos \+= 1/g)).toHaveLength(2);
  });

  it("submitAuditEdit tallies answers, findings and photos and leaves the decision to the helper", () => {
    const body = bodyOf("submitAuditEdit");
    expect(body).toContain("const findingWrites = await Promise.all(");
    expect(body).toContain("...tallyFindingWrites(findingWrites)");
    expect(body).toContain("correctionVerdict({");
    expect(body).toContain("verdict.resend && assignedPlan");
    expect(body).toContain("correctionEnd(verdict, stamp)");
    expect(body).not.toContain("shouldResendAfterCorrection");
    expect(body).not.toContain("correctionSavedText");
  });

  it("stays on the page with a gap when it did not go through, and leaves only otherwise", () => {
    const body = bodyOf("submitAuditEdit");
    expect(body).toContain("if (!end.leave) {");
    expect(body.indexOf("setSavedGap(end.gap)")).toBeLessThan(body.indexOf("window.location.href"));
  });

  it("the button and the link home read the gap", () => {
    expect(pageCode).toContain("? savedLabelOf(savedGap)");
    expect(pageCode).toContain("<SavedWithGap gap={savedGap} />");
  });

  it("the page keeps no copy of the plan status constant", () => {
    expect(pageCode).not.toMatch(/const PLAN_STATUS_SENT\b/);
    expect(pageCode).toMatch(/import \{[^}]*\bPLAN_STATUS_SENT\b[^}]*\} from '@\/app\/_utils\/planReview'/);
  });
});

describe("a standalone single finding is no part of the audit that opens later", () => {
  it("a saved single finding carries the plan it was raised in", () => {
    expect(pageCode).toContain("auditPlanId: assignedPlan?.id ?? null,");
  });

  it("a replayed one carries the plan its submission was queued for", () => {
    expect(pageCode).toContain("sessionFindingsOfReplay(s.findings, replayedNumbers, s.planId)");
  });

  it("the added-here set is asked for the open audit's plan", () => {
    const at = pageCode.indexOf("questionsAddedHere(\n");
    expect(at).toBeGreaterThan(-1);
    expect(pageCode.slice(at, at + 260)).toContain("assignedPlan?.id ?? null");
  });
});

describe("the finding fields are hidden where no new finding is written", () => {
  it("the lock comes from detailsLockOf with the save's own rule, and the note says which", () => {
    expect(pageCode).toContain("needsDetails: needsFindingDetails(activeQuestion.id, activeAnswer)");
    expect(pageCode).toContain("<FindingDetailsLocked lock={detailsLock} />");
    expect(pageCode).toContain("const detailsLocked = detailsLock !== null");
  });
});
