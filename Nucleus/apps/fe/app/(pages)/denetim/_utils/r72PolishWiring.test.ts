import { describe, expect, it } from "bun:test";
import { bodyOf, pageCode, pageSource } from "./pageSource";

/*
 * Wiring guard for the R72 polish round. The files next to this one prove the
 * decisions (heldSend.ts, discardRefused.ts, newAuditFindings.ts,
 * auditHeaderCheck.ts, submittedLine.ts, replayPhotoGate.ts); the page is a
 * ~5000-line client component with no render harness, so this proves on its
 * source that it asks them, and in the right order.
 */

/** The page source between two markers (comments kept), failing by name when either is gone. */
function between(from: string, to: string): string {
  const start = pageSource.indexOf(from);
  expect(start).toBeGreaterThan(0);
  const end = pageSource.indexOf(to, start);
  expect(end).toBeGreaterThan(start);
  return pageSource.slice(start, end);
}

describe("the replay waits for the question list", () => {
  it("syncOfflineQueue returns before it takes the replay lock when the questions are not loaded, says why and reads them again", () => {
    const body = bodyOf("syncOfflineQueue");
    const gate = body.indexOf("if (!questionsLoadedRef.current) {");
    const lock = body.indexOf("syncingRef.current = true");
    expect(gate).toBeGreaterThan(0);
    expect(gate).toBeLessThan(lock);
    const gateBody = body.slice(gate, lock);
    expect(gateBody).toContain("toast.message(REPLAY_WAITS_FOR_QUESTIONS_TEXT)");
    expect(gateBody).toContain("void fetchQuestionsFromBE()");
    expect(gateBody).toContain("return");
  });

  it("the auto-sync effect does not start before the questions are loaded and starts again when they are", () => {
    const effect = between("// R72: not before the question list is loaded", "}, [isOnline, queuedCount, questionsLoaded])");
    expect(effect).toContain("if (!questionsLoaded) return");
    expect(effect.indexOf("if (!questionsLoaded) return")).toBeLessThan(effect.indexOf("syncOfflineQueue()"));
  });

  it("questions count as loaded from the server's answer or a list in hand, never flipping back", () => {
    const body = between("const fetchQuestionsFromBE = ", "}, [actions])");
    expect(body).toContain("if (replayQuestionsReady({ answered: qRes !== null, count: rawQ.length })) setQuestionsLoaded(true)");
    expect(body).not.toContain("setQuestionsLoaded(false)");
  });

  it("the page starts with the questions not loaded, so the fallback list alone never lets the replay run", () => {
    expect(pageCode).toContain("const [questionsLoaded, setQuestionsLoaded] = useState(false)");
    expect(pageCode).toContain("questionsLoadedRef.current = questionsLoaded");
  });
});

describe("a held send is remembered per plan and comes back when the plan is opened", () => {
  it("holdSend sets the held state and writes the record", () => {
    const body = bodyOf("holdSend");
    expect(body).toContain("setHeldSend({ planId, auditId })");
    expect(body).toContain("setSavedGap(gap)");
    expect(body).toContain("await rememberHeldSend(heldSendStore, { planId, auditId, kind: gap.kind, text: gap.text })");
  });

  it("a stamp that went through forgets the record, after the draft and before the success toast and the redirect", () => {
    const body = bodyOf("concludeSend");
    const clear = body.indexOf("await clearDraft(planId, header)");
    const forget = body.indexOf("if (planId) await forgetHeldSend(heldSendStore, planId)");
    const success = body.indexOf("toast.success('Denetim başarıyla kaydedildi.')");
    expect(forget).toBeGreaterThan(clear);
    expect(forget).toBeLessThan(success);
  });

  it("restoreHeldSend locks the form like the first screen did and shows the remembered message with the retry", () => {
    const body = bodyOf("restoreHeldSend");
    expect(body).toContain("await recallHeldSend(heldSendStore, planId)");
    expect(body).toContain("if (!held || submitLockRef.current) return");
    expect(body).toContain("submitLockRef.current = true");
    expect(body).toContain("setSubmitState('done')");
    expect(body).toContain("setHeldSend({ planId, auditId: held.auditId })");
    expect(body).toContain("setSavedGap(heldGapOf(held))");
  });

  it("openPlan reads the record after the draft is restored, and nothing else restores it", () => {
    const body = bodyOf("openPlan");
    expect(body.indexOf("await restoreHeldSend(plan.id)")).toBeGreaterThan(body.indexOf("await tryRestoreDraft("));
    expect(pageCode.match(/restoreHeldSend\(/g)).toHaveLength(1);
  });

  it("the record lives in the snapshots table of the offline database the page already has", () => {
    expect(pageCode).toContain("const heldSendStore: HeldSendStore = {");
    expect(pageCode).toContain("read: (key) => loadSnapshot(key)");
    expect(pageCode).toContain("write: (key, value) => saveSnapshot(key, value)");
    expect(pageCode).toContain("await db?.snapshots.delete(key)");
  });
});

describe("discarding a refused record says what it does first", () => {
  it("reads the record before the confirmation and builds the text from it", () => {
    const body = bodyOf("discardRefusedSubmission");
    const read = body.indexOf("db?.submissions.get(id)");
    const confirm = body.indexOf("await confirmDialog({");
    expect(read).toBeGreaterThan(0);
    expect(read).toBeLessThan(confirm);
    expect(body).toContain("message: discardConfirmMessage(label, {");
    expect(body).toContain("lastError: record?.lastError");
  });

  it("the stamp before discarding follows the same rule as the text", () => {
    const body = bodyOf("discardRefusedSubmission");
    expect(body).toContain("discardStampsPlan({ planId: s.planId, syncedAuditId: s.syncedAuditId, source: s.auditPayload?.source })");
  });
});

describe("a single finding's stopped save stays in its modal", () => {
  it("the modal shows the message, it is cleared when the modal opens and at the start of every attempt", () => {
    expect(pageCode).toContain("<PhotoUploadGap text={singleUploadGap} />");
    expect(bodyOf("saveSingleFinding")).toMatch(/const saveSingleFinding = async \(\) => \{\s*setSingleUploadGap\(null\)/);
    expect(bodyOf("openSingleFindingModal")).toContain("setSingleUploadGap(null)");
  });

  it("the modal's message has no way to the offline queue: that button is the audit form's", () => {
    const at = pageCode.indexOf("<PhotoUploadGap text={singleUploadGap} />");
    expect(pageCode.slice(at, at + 60)).not.toContain("queue=");
  });
});

describe("'Kuyruğa al' checks what the save checks, and the line under the table says queued", () => {
  it("both ways of saving run the header check, the queue before it takes the lock", () => {
    const submit = bodyOf("submitForm");
    expect(submit).toContain("const headerProblem = auditHeaderProblem(header)");
    expect(submit).not.toContain("Denetimi Yapan alanı zorunludur");
    const queue = bodyOf("queueAfterUploadFailure");
    const check = queue.indexOf("const headerProblem = auditHeaderProblem(header)");
    expect(check).toBeGreaterThan(queue.indexOf("liveUnanswered.size > 0) return"));
    expect(check).toBeLessThan(queue.indexOf("submitLockRef.current = true"));
    expect(queue.slice(check, queue.indexOf("submitLockRef.current = true"))).toContain("return");
  });

  it("the line follows the form (queued or sent), not the connection", () => {
    expect(pageCode).toContain("{submittedLine({ queued: formQueued, online: isOnline })}");
    expect(pageCode).not.toContain("'Form başarıyla gönderildi.'");
    const enqueue = bodyOf("enqueueAuditAndFindingsFromForm");
    expect(enqueue).toContain("setFormQueued(true)");
    expect(enqueue.indexOf("setFormQueued(true)")).toBeGreaterThan(enqueue.indexOf("await clearDraft(planId, header)"));
    expect(bodyOf("handleReset")).toContain("setFormQueued(false)");
  });
});

describe("the new audit path holds the stamp for a finding that did not save", () => {
  it("keeps the finding writes' results and asks newAuditFindings before the stamp", () => {
    const body = bodyOf("finishSentAudit");
    const writes = body.indexOf("const writes = await Promise.all(jobs)");
    const gap = body.indexOf("unsavedFindingsGap({ findings: auditRecord.findings, writes, questions, steps })");
    const hold = body.indexOf("await holdSend(assignedPlan.id, auditId, unsaved)");
    const stamp = body.lastIndexOf("await markPlanCompleted(assignedPlan.id, auditId)");
    expect(writes).toBeGreaterThan(0);
    expect(gap).toBeGreaterThan(writes);
    expect(hold).toBeGreaterThan(gap);
    expect(hold).toBeLessThan(stamp);
    expect(body.slice(hold, stamp)).toContain("return");
    expect(body).not.toMatch(/^\s*await Promise\.all\(jobs\)/m);
  });

  it("types the audit row's answer with a narrow type, not any", () => {
    const body = bodyOf("finishSentAudit");
    expect(body).toContain("const auditId = createdIdOf(data)");
    expect(body).not.toContain("data?.data?.id");
    expect(pageCode).not.toMatch(/const finishSentAudit = async \([^)]*: any/);
  });
});
