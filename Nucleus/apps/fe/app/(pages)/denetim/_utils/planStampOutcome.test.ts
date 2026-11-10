import { describe, expect, it } from "bun:test";
import type { Question, Step } from "../constants";
import { PHOTO_REFUSAL_MARKER } from "./photoRefusal";
import { PLAN_STAMPED, STAMP_RETRY_LABEL, heldPlanGap, planStampFailure, planStampToast } from "./planStampOutcome";

const steps: Step[] = [
  { code: "S1", title: "1 - Sınıflandırma", maxScore: 20, order: 1 },
  { code: "S3", title: "3 - Temizlik", maxScore: 20, order: 3 },
];
const question = (id: string, stepCode: Question["stepCode"], order: number, requirePhoto?: boolean): Question => ({
  id,
  stepCode,
  order,
  text: `Soru ${id}`,
  maxScore: 5,
  requireExplanation: true,
  ...(requirePhoto === undefined ? {} : { requirePhoto }),
});
const q12 = question("S1-Q2", "S1", 2, true);
const q31 = question("S3-Q1", "S3", 1, true);
const q13 = question("S1-Q3", "S1", 3, false);
const questions = [q12, q31, q13];
const API_REASON = `Denetim gönderilemedi: ${PHOTO_REFUSAL_MARKER} (S1-Q2) fotoğrafsız bulgu var. Bu sorularda fotoğrafsız bulgu kabul edilmez. Bulguya fotoğraf ekleyin; fotoğraf yüklenemiyorsa Merkez Ekip'e bildirin.`;
const API_REASON_TWO = `Denetim gönderilemedi: ${PHOTO_REFUSAL_MARKER} (S1-Q2, S3-Q1) fotoğrafsız bulgu var. Bulguya fotoğraf ekleyin.`;

describe("planStampFailure and planStampToast", () => {
  it("a 4xx is a refusal that keeps its reasons; anything else is a failure that passes", () => {
    expect(planStampFailure({ refused: true, reasons: [API_REASON] })).toEqual({ kind: "refused", reasons: [API_REASON] });
    expect(planStampFailure({ refused: false, reasons: [] })).toEqual({ kind: "failed" });
    expect(PLAN_STAMPED).toEqual({ kind: "sent" });
  });

  it("the toast carries the server's reasons for a refusal, the generic line otherwise", () => {
    const refused = planStampToast({ kind: "refused", reasons: ["Plan bulunamadı."] });
    expect(refused.text).toBe("Denetim kaydedildi ancak plan onaya gönderilemedi: Plan bulunamadı.");
    expect(refused.long).toBe(true);
    const generic = planStampToast({ kind: "refused", reasons: [] });
    expect(generic.text).toBe("Denetim kaydedildi ancak plan onaya gönderilemedi. Lütfen yöneticinize bildirin.");
    expect(generic.long).toBe(false);
  });

  it("a stamp that only failed in passing points at the retry button, not at the manager", () => {
    const failed = planStampToast({ kind: "failed" });
    expect(failed.text).toContain(`"${STAMP_RETRY_LABEL}"`);
    expect(failed.text).not.toContain("yöneticinize");
    expect(failed.long).toBe(false);
  });

  it("the photo refusal's toast does not repeat the server's 'add a photo' sentence the reader cannot act on", () => {
    const toast = planStampToast({ kind: "refused", reasons: [API_REASON] });
    expect(toast.text).toContain("onaya gönderilemedi");
    expect(toast.text).not.toContain("Bulguya fotoğraf ekleyin");
    expect(toast.long).toBe(true);
  });
});

describe("heldPlanGap: the message that stays when the stamp did not go through", () => {
  it("is nothing when the stamp went through", () => {
    expect(heldPlanGap(PLAN_STAMPED, questions, steps)).toBeNull();
  });

  it("holds the page for a stamp that only failed in passing: says the audit is saved, not to refill, and to send again", () => {
    const gap = heldPlanGap({ kind: "failed" }, questions, steps);
    expect(gap?.kind).toBe("unsent");
    const text = gap?.text ?? "";
    expect(text).toContain("kaydedildi ancak plan onaya gönderilemedi");
    expect(text).toContain("yeniden doldurmayın");
    expect(text).toContain(`"${STAMP_RETRY_LABEL}"`);
  });

  it("for the photo refusal names the questions by number and text, says what it means and who to tell", () => {
    const gap = heldPlanGap({ kind: "refused", reasons: [API_REASON_TWO] }, questions, steps);
    expect(gap?.kind).toBe("unsent");
    const text = gap?.text ?? "";
    expect(text).toContain("onaya gönderilemedi");
    expect(text).toContain("şu sorularda");
    expect(text).toContain("1.2 · Soru S1-Q2");
    expect(text).toContain("3.1 · Soru S3-Q1");
    expect(text).toContain("Fotoğrafsız bulgu kabul edilmez");
    expect(text).toContain("bu ekrandan fotoğraf eklenemez");
    expect(text).toContain("Plan onaya gitmedi ve açık kaldı");
    expect(text).toContain("yeniden doldurmayın");
  });

  it("for the photo refusal names the accurate cure: Merkez Ekip switches 'Fotoğraf Zorunlu' off in Ana Veri Yönetimi > Sorular, then 'Yeniden gönder' passes", () => {
    const two = heldPlanGap({ kind: "refused", reasons: [API_REASON_TWO] }, questions, steps)?.text ?? "";
    expect(two).toContain("Ana Veri Yönetimi > Sorular");
    expect(two).toContain('"Fotoğraf Zorunlu" ayarını kapatmalı');
    expect(two).toContain("bu sorular için");
    expect(two).toContain(`"${STAMP_RETRY_LABEL}" düğmesine basın, plan geçer`);
    expect(two).not.toContain("Merkez Ekip'e bildirin");
    const one = heldPlanGap({ kind: "refused", reasons: [API_REASON] }, questions, steps)?.text ?? "";
    expect(one).toContain("bu soru için");
    expect(one).not.toContain("bu sorular için");
  });

  it("does not hand the reader the server's own 'add a photo' task, which this screen cannot do", () => {
    const text = heldPlanGap({ kind: "refused", reasons: [API_REASON] }, questions, steps)?.text ?? "";
    expect(text).not.toContain("Bulguya fotoğraf ekleyin");
    expect(text).not.toContain("fotoğraf yüklenemiyorsa");
  });

  it("says 'şu soruda' for one question", () => {
    const gap = heldPlanGap({ kind: "refused", reasons: [API_REASON] }, questions, steps);
    expect(gap?.text).toContain("şu soruda");
    expect(gap?.text).toContain("1.2 · Soru S1-Q2");
  });

  it("falls back to the bare code for a question the form does not know, and says it without a list when there is none", () => {
    const notInList = heldPlanGap({ kind: "refused", reasons: [API_REASON] }, [q31], steps);
    expect(notInList?.text).toContain(": S1-Q2.");
    const bare = heldPlanGap({ kind: "refused", reasons: [`Denetim gönderilemedi: ${PHOTO_REFUSAL_MARKER} fotoğrafsız bulgu var.`] }, questions, steps);
    expect(bare?.text).toContain("bulgu fotoğrafı zorunlu olan sorularda fotoğrafsız bulgu var.");
    expect(bare?.text).toContain("ilgili sorular için");
    expect(bare?.text).toContain('"Fotoğraf Zorunlu" ayarını kapatmalı');
  });

  it("keeps the page open for any other refusal too, with its reason", () => {
    const gap = heldPlanGap({ kind: "refused", reasons: ["Plan bulunamadı."] }, questions, steps);
    expect(gap?.text).toContain("Denetim kaydedildi ancak plan onaya gönderilemedi: Plan bulunamadı.");
    expect(gap?.text).toContain("yeniden doldurmayın");
    // A reason that is not the photo refusal has no switch to name: it still goes to Merkez Ekip.
    expect(gap?.text).toContain("Merkez Ekip'e bildirin");
    expect(gap?.text).not.toContain("Fotoğraf Zorunlu");
    expect(heldPlanGap({ kind: "refused", reasons: [] }, questions, steps)?.text).toContain("Sunucu planı kabul etmedi.");
  });
});
