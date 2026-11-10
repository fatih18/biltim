import { describe, expect, it } from "bun:test";
import { bodyOf, pageCode, pageSource } from "./pageSource";

/*
 * Wiring guard for a refused plan stamp (R72, planStampOutcome.ts and
 * photoRefusal.ts). Those two files prove the decisions; the page is a
 * ~5000-line client component with no render harness, so this file proves on
 * its source that the page acts on them: a refused stamp never ends in the
 * success toast and the redirect, and the offline replay sets a photo refusal
 * aside instead of cleaning the submission up.
 */

describe("a refused plan stamp keeps the form open (online send)", () => {
  it("markPlanCompleted hands its outcome back instead of swallowing the failure", () => {
    const body = bodyOf("markPlanCompleted");
    expect(body).toContain("return PLAN_STAMPED");
    expect(body).toContain("planStampFailure({ refused, reasons: refused ? serverReasonsOf(err) : [] })");
    expect(body).toContain("return outcome");
    expect(pageCode).toContain("const markPlanCompleted = async (planId: string, auditId: string): Promise<PlanStampOutcome>");
  });

  it("both branches of finishSentAudit end in concludeSend with the stamp's outcome, and none of them touches the draft or leaves the page itself", () => {
    const body = bodyOf("finishSentAudit");
    expect(body.match(/await markPlanCompleted\(assignedPlan\.id, auditId\)/g)).toHaveLength(2);
    expect(body.match(/await concludeSend\(assignedPlan\?\.id \?\? null, auditId, outcome\)/g)).toHaveLength(2);
    expect(body).not.toContain("clearDraft(");
    expect(body).not.toContain("window.location.href");
    expect(body).not.toContain("toast.success");
  });

  it("concludeSend deletes the draft only once the stamp went through, after the held page was ruled out (R72)", () => {
    const body = bodyOf("concludeSend");
    const held = body.indexOf("const held = heldPlanGap(outcome, questions, steps)");
    const hold = body.indexOf("if (held && planId) {");
    const leave = body.indexOf("return", hold);
    const clear = body.indexOf("await clearDraft(planId, header)");
    const success = body.indexOf("toast.success('Denetim başarıyla kaydedildi.')");
    const redirect = body.indexOf("window.location.href = '/'");
    expect(held).toBeGreaterThan(0);
    expect(hold).toBeGreaterThan(held);
    // The hold itself (state and the remembered record) is holdSend's; see r72PolishWiring.test.ts.
    expect(body.slice(hold, clear)).toContain("await holdSend(planId, auditId, held)");
    expect(leave).toBeGreaterThan(hold);
    expect(leave).toBeLessThan(clear);
    expect(clear).toBeLessThan(success);
    expect(success).toBeLessThan(redirect);
  });

  it("no other step of the online send deletes the draft: only the offline queue and the reset do", () => {
    for (const name of ["submitForm", "finishSentAudit", "submitAuditEdit", "markPlanCompleted", "retryHeldSend"]) {
      expect(bodyOf(name)).not.toContain("clearDraft(");
    }
    expect(pageCode.match(/await clearDraft\(/g)).toHaveLength(3);
  });

  it("'Yeniden gönder' stamps the audit already on the server and concludes like the first try, never saves a new audit", () => {
    const body = bodyOf("retryHeldSend");
    expect(body).toContain("await concludeSend(heldSend.planId, heldSend.auditId, await markPlanCompleted(heldSend.planId, heldSend.auditId))");
    expect(body).not.toContain("ADD_FIVE_S_AUDIT");
    expect(body).not.toContain("createFindingForAnswer");
    expect(body).toContain("if (!heldSend || retryingSend) return");
  });

  it("the held message stays in the place a correction's 'kaydedildi, gönderilmedi' uses, with the retry button, and the green line steps aside", () => {
    expect(pageCode).toMatch(/<SavedWithGap\s+gap=\{savedGap\}\s+retry=\{/);
    expect(pageCode).toContain("{ label: STAMP_RETRY_LABEL, busy: retryingSend, onClick: () => void retryHeldSend() }");
    expect(pageCode).toContain("{submitted && !savedGap && (");
    expect(pageCode).toContain("? savedLabelOf(savedGap)");
  });
});

describe("the offline replay sets a photo refusal aside (R72)", () => {
  const replay = () => {
    // The comments are kept here on purpose: they are what marks where the clean-up starts.
    const from = pageSource.indexOf("await stampPlanSent(s.planId, auditId, attended)");
    const to = pageSource.indexOf("// 5) cleanup submission");
    expect(from).toBeGreaterThan(0);
    expect(to).toBeGreaterThan(from);
    return pageSource.slice(from, to);
  };

  it("rethrows for the set-aside decision before the clean-up warning and the cleanup", () => {
    const code = replay();
    const decision = code.indexOf("replayStampAction(serverReasonsOf(err)) === 'set_aside') throw err");
    expect(decision).toBeGreaterThan(0);
    expect(decision).toBeGreaterThan(code.indexOf("if (!isRefusal(err)) throw err"));
    expect(decision).toBeLessThan(code.indexOf("toast.warning("));
  });

  it("the catch every other refusal reaches records the reason and sets the submission aside", () => {
    const at = pageCode.indexOf("refusedNow += 1");
    expect(at).toBeGreaterThan(0);
    const catchBlock = pageCode.slice(pageCode.lastIndexOf("} catch (err: any) {", at), at + 120);
    expect(catchBlock).toContain("if (isRefusal(err))");
    expect(catchBlock).toContain("lastError: msg, setAsideAt: Date.now()");
  });
});
