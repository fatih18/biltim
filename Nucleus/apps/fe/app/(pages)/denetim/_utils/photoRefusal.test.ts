import { describe, expect, it } from "bun:test";
import { PHOTO_REFUSAL_MARKER, isPhotoRefusal, photoRefusalQuestionIds, replayStampAction } from "./photoRefusal";

/** The API's own words for the refusal, as be-nucleus guards/photoRequired.ts builds them. */
const API_MESSAGE =
  "Denetim gönderilemedi: bulgu fotoğrafı zorunlu olan sorularda (S1-Q2, S3-Q1) fotoğrafsız bulgu var. Bu sorularda fotoğrafsız bulgu kabul edilmez. Bulguya fotoğraf ekleyin; fotoğraf yüklenemiyorsa Merkez Ekip'e bildirin.";

describe("isPhotoRefusal", () => {
  it("recognises the API's photo refusal", () => {
    expect(isPhotoRefusal([API_MESSAGE])).toBe(true);
    expect(isPhotoRefusal(["Başka bir kural.", API_MESSAGE])).toBe(true);
  });

  it("does not take any other refusal of the plan for it", () => {
    expect(isPhotoRefusal([])).toBe(false);
    expect(isPhotoRefusal(["Plan bulunamadı."])).toBe(false);
    expect(isPhotoRefusal(["Bu plan ekibinize atanmamış; planı yalnız atanan ekip gönderebilir."])).toBe(false);
    expect(isPhotoRefusal(["Bulgu için fotoğraf yüklenemedi."])).toBe(false);
  });
});

describe("photoRefusalQuestionIds: the codes the API's message names", () => {
  it("reads the list in brackets after the marker, in order, each code once", () => {
    expect(photoRefusalQuestionIds([API_MESSAGE])).toEqual(["S1-Q2", "S3-Q1"]);
    expect(photoRefusalQuestionIds([API_MESSAGE, API_MESSAGE])).toEqual(["S1-Q2", "S3-Q1"]);
  });

  it("is empty for another refusal, and for a photo refusal that carries no list", () => {
    expect(photoRefusalQuestionIds(["Plan bulunamadı. (S1-Q2)"])).toEqual([]);
    expect(photoRefusalQuestionIds([`Denetim gönderilemedi: ${PHOTO_REFUSAL_MARKER} fotoğrafsız bulgu var.`])).toEqual([]);
    expect(photoRefusalQuestionIds([])).toEqual([]);
  });

  it("ignores blank entries in the list", () => {
    expect(photoRefusalQuestionIds([`${PHOTO_REFUSAL_MARKER} (S1-Q2, , S2-Q4 ) fotoğrafsız`])).toEqual(["S1-Q2", "S2-Q4"]);
  });
});

describe("replayStampAction: what the offline replay does with a refused plan stamp (R72)", () => {
  it("sets the submission aside for the photo refusal, so the auditor sees it and the data is kept", () => {
    expect(replayStampAction([API_MESSAGE])).toBe("set_aside");
  });

  it("still cleans up after a plan that refuses for its own reasons", () => {
    expect(replayStampAction(["Plan bulunamadı."])).toBe("clean_up");
    expect(replayStampAction([])).toBe("clean_up");
  });
});

describe("the marker is the API's", () => {
  it("is the string be-nucleus puts in the refusal and builds the message from", async () => {
    const api = await Bun.file(new URL("../../../../../be-nucleus/src/guards/photoRequired.ts", import.meta.url)).text();
    expect(api).toContain(`PHOTO_REFUSAL_MARKER = '${PHOTO_REFUSAL_MARKER}'`);
    expect(api).toContain("${PHOTO_REFUSAL_MARKER} (${questionIds.join(', ')})");
  });
});
