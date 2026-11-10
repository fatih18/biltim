import { describe, expect, it } from "bun:test";
import type { Question, Step } from "../constants";
import {
  type DiscardedSubmission,
  discardConfirmMessage,
  discardStampsPlan,
  photoSetAsideOf,
} from "./discardRefused";
import { PHOTO_REFUSAL_MARKER } from "./photoRefusal";
import { replayPhotoRefusalText } from "./replayPhotoGate";

const steps: Step[] = [{ code: "S1", title: "1 - Sınıflandırma", maxScore: 20, order: 1 }];
const demanding: Question = {
  id: "S1-Q2",
  stepCode: "S1",
  order: 2,
  text: "Soru S1-Q2",
  maxScore: 5,
  requireExplanation: true,
  requirePhoto: true,
};
const LABEL = "Kaynak Atölyesi · 10.11.2026";

const synced = (lastError: string | null, over: Partial<DiscardedSubmission> = {}): DiscardedSubmission => ({
  planId: "plan-1",
  syncedAuditId: "audit-1",
  source: undefined,
  lastError,
  ...over,
});

describe("discardStampsPlan: the one rule the confirmation and the discard share", () => {
  it("stamps when the audit is on the server and the record belongs to a plan", () => {
    expect(discardStampsPlan(synced(null))).toBe(true);
  });

  it("does not stamp without a synced audit, without a plan, or for a single finding", () => {
    expect(discardStampsPlan(synced(null, { syncedAuditId: null }))).toBe(false);
    expect(discardStampsPlan(synced(null, { syncedAuditId: undefined }))).toBe(false);
    expect(discardStampsPlan(synced(null, { planId: null }))).toBe(false);
    expect(discardStampsPlan(synced(null, { source: "single_finding" }))).toBe(false);
  });
});

describe("photoSetAsideOf recognises the two photo refusals by the text the record carries", () => {
  it("the replay gate's own texts, both variants", () => {
    expect(photoSetAsideOf(replayPhotoRefusalText(demanding, steps, 2))).toBe("gate");
    expect(photoSetAsideOf(replayPhotoRefusalText(demanding, steps, 0))).toBe("gate");
  });

  it("the server's stamp refusal", () => {
    expect(photoSetAsideOf(`Denetim gönderilemedi: ${PHOTO_REFUSAL_MARKER} (S1-Q2) fotoğrafsız bulgu var.`)).toBe("stamp");
  });

  it("any other reason, or none", () => {
    expect(photoSetAsideOf("Plan bulunamadı.")).toBeNull();
    expect(photoSetAsideOf("")).toBeNull();
    expect(photoSetAsideOf(null)).toBeNull();
    expect(photoSetAsideOf(undefined)).toBeNull();
  });
});

describe("discardConfirmMessage", () => {
  it("a photo refusal whose audit already synced says the plan is stamped as sent WITHOUT that question's finding and the photos are deleted", () => {
    const text = discardConfirmMessage(LABEL, synced(replayPhotoRefusalText(demanding, steps, 2)));
    expect(text).toContain(LABEL);
    expect(text).toContain("denetimi sunucuda kayıtlı");
    expect(text).toContain("onaya gönderilmiş sayılır");
    expect(text).toContain("bulgusu OLMADAN");
    expect(text).toContain("cihazdaki fotoğraflar silinir");
    expect(text).toContain("geri alınamaz");
  });

  it("tells what keeps the finding: the retry, or Merkez Ekip switching the flag off", () => {
    const text = discardConfirmMessage(LABEL, synced(replayPhotoRefusalText(demanding, steps, 0)));
    expect(text).toContain('"Vazgeç"');
    expect(text).toContain('"Tekrar dene"');
    expect(text).toContain('"Fotoğraf Zorunlu" ayarını kapatsın');
  });

  it("the server's stamp refusal is told as it is: the stamp is tried again and may be refused, the photos go either way", () => {
    const text = discardConfirmMessage(
      LABEL,
      synced(`Denetim gönderilemedi: ${PHOTO_REFUSAL_MARKER} (S1-Q2) fotoğrafsız bulgu var.`),
    );
    expect(text).toContain("yine reddedilebilir");
    expect(text).toContain("fotoğraflar her durumda silinir");
    expect(text).not.toContain("OLMADAN");
  });

  it("keeps the generic text for a photo refusal whose audit never reached the server (nothing is stamped)", () => {
    const text = discardConfirmMessage(LABEL, synced(replayPhotoRefusalText(demanding, steps, 2), { syncedAuditId: null }));
    expect(text).toBe(
      `${LABEL} sunucu tarafından reddedildi ve cihazda bekliyor. Çıkarılırsa bu kayıt ve fotoğrafları cihazdan silinir; geri alınamaz.`,
    );
  });

  it("keeps the generic text for a single finding and for every other refusal", () => {
    const generic = `${LABEL} sunucu tarafından reddedildi ve cihazda bekliyor. Çıkarılırsa bu kayıt ve fotoğrafları cihazdan silinir; geri alınamaz.`;
    expect(discardConfirmMessage(LABEL, synced(replayPhotoRefusalText(demanding, steps, 1), { source: "single_finding" }))).toBe(generic);
    expect(discardConfirmMessage(LABEL, synced("Plan bulunamadı."))).toBe(generic);
    expect(discardConfirmMessage(LABEL, synced(null))).toBe(generic);
  });
});
