import { describe, expect, it } from "bun:test";
import { bodyOf, pageCode, pageSource } from "./pageSource";

/*
 * Wiring guard for R72's "no finding without its photo" hardening
 * (photoFirst.ts, replayPhotoGate.ts). Those files prove the decisions; the page
 * is a ~5000-line client component with no render harness, so this file proves
 * on its source that the page asks them in the right ORDER: photos before any
 * row, the last door before a finding row, and the replay's decision before the
 * finding is created.
 */

describe("the photos of demanding questions go up before any row is written (online save)", () => {
  it("submitForm uploads them after the offline branch and before the audit row, and stops the save when one fails", () => {
    const body = bodyOf("submitForm");
    const offline = body.indexOf("if (!isOnline) {");
    const upload = body.indexOf("const uploadedFirst = await uploadRequiredPhotos(auditRecord.findings, 'audit')");
    const stop = body.indexOf("if (!uploadedFirst) return false");
    const auditRow = body.indexOf("ADD_FIVE_S_AUDIT?.start");
    expect(offline).toBeGreaterThan(0);
    expect(upload).toBeGreaterThan(offline);
    expect(stop).toBeGreaterThan(upload);
    expect(stop).toBeLessThan(auditRow);
  });

  it("every attempt clears the message of the stopped one first, the offline queue's included", () => {
    const body = bodyOf("submitForm");
    const clear = body.indexOf("setUploadGap(null)");
    expect(clear).toBeGreaterThan(0);
    expect(clear).toBeLessThan(body.indexOf("if (!isOnline) {"));
    expect(clear).toBeLessThan(body.indexOf("if (editAudit) {"));
  });

  it("the uploaded photos reach the finding writes, so they are not sent twice", () => {
    expect(bodyOf("submitForm")).toContain("await finishSentAudit(data, uploadedFirst)");
    expect(pageCode).toContain(
      "const finishSentAudit = async (data: any, uploadedFirst: ReadonlyMap<string, UploadedPhotos<UploadedFileInfo>>)"
    );
    expect(bodyOf("finishSentAudit")).toContain(
      "createFindingForAnswer(ans, auditId, detectedDate, uploadedFirst)"
    );
  });

  it("the correction uploads them before its first write too", () => {
    const body = bodyOf("submitAuditEdit");
    const upload = body.indexOf("const uploadedFirst = await uploadRequiredPhotos(auditRecord.findings, 'audit')");
    const stop = body.indexOf("if (!uploadedFirst) return false");
    expect(upload).toBeGreaterThan(0);
    expect(stop).toBeGreaterThan(upload);
    expect(stop).toBeLessThan(body.indexOf("startAsPromise("));
    expect(body).toContain("createFindingForAnswer(ans, target.id, header.date, uploadedFirst)");
  });

  it("the single finding uploads a demanding question's photos before its carrier audit row", () => {
    const body = bodyOf("saveSingleFinding");
    const offline = body.indexOf("if (!isOnline) {");
    const upload = body.indexOf("await uploadRequiredPhotos(");
    const stop = body.indexOf("if (!uploadedFirst) return", upload);
    expect(upload).toBeGreaterThan(offline);
    expect(stop).toBeGreaterThan(upload);
    expect(stop).toBeLessThan(body.indexOf("ADD_FIVE_S_AUDIT?.start"));
    expect(body).toContain("const uploadedPhotos: UploadedFileInfo[] = [...(firstPhotos?.uploaded ?? [])]");
    expect(body).toContain("for (const f of firstPhotos ? [] : (singleFinding.photos ?? []))");
  });

  it("uploadRequiredPhotos remembers uploads, names the failed questions, keeps the message on screen for the audit and says it once in a toast", () => {
    const body = bodyOf("uploadRequiredPhotos");
    expect(body).toContain("await uploadPhotosFirst({");
    expect(body).toContain("rememberingUpload(");
    expect(body).toContain("uploadMemoryRef.current");
    expect(body).toContain("photoUploadAbortText({ failed: result.failedQuestions, steps, subject })");
    expect(body).toContain("if (subject === 'audit') setUploadGap(text)");
    expect(body).toContain("toast.error(text, { duration: 20000 })");
    expect(body).toContain("return null");
  });

  it("a stopped save writes nothing: no row call sits between the upload and the stop", () => {
    const body = bodyOf("uploadRequiredPhotos");
    for (const write of ["ADD_FIVE_S", "UPDATE_", "PATCH", "clearDraft", "enqueueSubmission"]) {
      expect(body).not.toContain(write);
    }
  });

  it("the message stays on the page, with the way to the offline queue only for a new audit", () => {
    expect(pageCode.match(/<PhotoUploadGap\s/g)).toHaveLength(1);
    const at = pageCode.indexOf("<PhotoUploadGap");
    const tag = pageCode.slice(at, pageCode.indexOf("/>", at));
    expect(tag).toContain("text={uploadGap}");
    expect(tag).toContain("editAudit");
    expect(tag).toContain("queueAfterUploadFailure()");
    expect(tag).toContain("liveUnanswered.size > 0");
  });

  it("queueing after a stopped save takes the form's own lock and states, and refuses a form that cannot be saved", () => {
    const body = bodyOf("queueAfterUploadFailure");
    expect(body).toContain("if (submitLockRef.current || liveUnanswered.size > 0) return");
    expect(body).toContain("await enqueueAuditAndFindingsFromForm()");
    expect(body).toContain("submitLockRef.current = false");
    expect(body).toContain("setSubmitState('done')");
  });
});

describe("the last door before a finding row", () => {
  it("createFindingForAnswer refuses a demanding question's finding without an uploaded photo, before it is posted", () => {
    const body = bodyOf("createFindingForAnswer");
    const door = body.indexOf("if (!findingMayBeWritten(q, uploadedPhotos.length)) {");
    expect(door).toBeGreaterThan(0);
    expect(door).toBeLessThan(body.indexOf("ADD_FIVE_S_FINDING?.start"));
    expect(body.slice(door, door + 260)).toContain("return { saved: false, failedPhotos }");
  });

  it("a photo uploaded first is used as it is and its failures are carried, so a correction still holds its resend", () => {
    const body = bodyOf("createFindingForAnswer");
    expect(body).toContain("const first = uploadedFirst?.get(ans.questionId)");
    expect(body).toContain("let failedPhotos = first?.failed ?? 0");
    expect(body).toContain("for (const f of first ? [] : (ans.photos ?? []))");
  });
});

describe("the offline queue carries the flag and the replay decides before it creates the finding", () => {
  it("both queue builders store the question's photo flag with the finding", () => {
    expect(pageCode).toContain("require_photo: q.requirePhoto === true,");
    expect(pageCode).toContain("require_photo: linkedQuestion?.requirePhoto === true,");
    expect(pageCode).toContain("require_photo?: boolean");
  });

  const findings = () => {
    const from = pageSource.indexOf("// 3) findings");
    const to = pageSource.indexOf("// 4) the plan goes to Merkez Ekip");
    expect(from).toBeGreaterThan(0);
    expect(to).toBeGreaterThan(from);
    return pageSource.slice(from, to);
  };

  it("replayFindingPhotoDecision runs after the photo uploads and before the finding is posted", () => {
    const code = findings();
    const uploads = code.indexOf("up = await uploadAnswerPhoto({ file })");
    const decision = code.indexOf("replayFindingPhotoDecision({");
    const post = code.indexOf("await startAsPromise(startFinding");
    expect(uploads).toBeGreaterThan(0);
    expect(decision).toBeGreaterThan(uploads);
    expect(post).toBeGreaterThan(decision);
  });

  it("a set-aside decision throws a 422 with its reason, which the refusal catch records with setAsideAt", () => {
    const code = findings();
    const set = code.indexOf("if (photoDecision.action === 'set_aside') {");
    expect(set).toBeGreaterThan(0);
    expect(code.slice(set, code.indexOf("await startAsPromise(startFinding"))).toContain(
      "throw apiCallError(photoDecision.reason, 422)"
    );
    expect(pageCode).toContain("lastError: msg, setAsideAt: Date.now()");
  });

  it("releases the photos it skipped for that finding and takes them back out of the skipped count", () => {
    const code = findings();
    expect(code).toContain("!photoDecision.releasePhotoIds.includes(id)");
    expect(code).toContain("skippedPhotosNow -= skippedHere");
    expect(code).toContain("skippedHere += 1");
  });

  it("reads the question as it is now, through a ref, and the flag the form queued", () => {
    const code = findings();
    expect(code).toContain("questionsRef.current.find((qq) => qq.id === queuedQuestionId)");
    expect(code).toContain("queuedRequirePhoto: f.require_photo");
    expect(pageCode).toContain("questionsRef.current = questions");
  });
});
