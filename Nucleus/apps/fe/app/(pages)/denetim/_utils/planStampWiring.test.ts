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

  it("finishSentAudit holds the page on a refusal before the success toast and the redirect, on both branches", () => {
    const body = bodyOf("finishSentAudit");
    const holds = [...body.matchAll(/heldPlanGap\(await markPlanCompleted\(/g)].map((m) => m.index ?? -1);
    const successes = [...body.matchAll(/toast\.success\('Denetim başarıyla kaydedildi\.'\)/g)].map((m) => m.index ?? -1);
    expect(holds).toHaveLength(2);
    expect(successes).toHaveLength(2);
    expect(holds[0]).toBeGreaterThan(0);
    expect(holds[0]).toBeLessThan(successes[0] ?? -1);
    expect(holds[1]).toBeGreaterThan(successes[0] ?? Number.MAX_SAFE_INTEGER);
    expect(holds[1]).toBeLessThan(successes[1] ?? -1);
    expect(body.match(/setSavedGap\(held\)/g)).toHaveLength(2);
    expect(body.match(/window\.location\.href = '\/'/g)).toHaveLength(2);
  });

  it("names the questions whose photos did not upload from the findings it just wrote", () => {
    const body = bodyOf("finishSentAudit");
    expect(body).toContain("const writes = await Promise.all(jobs)");
    expect(body).toContain("questionsLeftWithoutPhoto({ answers: auditRecord.findings, writes, questions })");
  });

  it("the held message stays in the place a correction's 'kaydedildi, gönderilmedi' uses, and the green line steps aside", () => {
    expect(pageCode).toContain("<SavedWithGap gap={savedGap} />");
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
