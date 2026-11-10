import { describe, expect, it } from "bun:test";
import { findingMayBeWritten, photoUploadAbortText, uploadPhotosFirst } from "./photoFirst";
import { fakeUpload, file, q12, q13, q14, q31, questions, steps } from "./photoFirstFixture";

describe("uploadPhotosFirst: the photos of demanding questions go up before anything is written", () => {
  it("uploads every photo of a demanding question and hands them back by question", async () => {
    const { upload, calls } = fakeUpload();
    const result = await uploadPhotosFirst({
      items: [{ questionId: "S1-Q2", photos: [file("a.jpg"), file("b.jpg")] }],
      questions,
      upload,
    });
    expect(result.ok).toBe(true);
    expect(calls).toEqual(["a.jpg", "b.jpg"]);
    expect(result.byQuestion.get("S1-Q2")?.uploaded.map((u) => u.fileId)).toEqual(["id-a.jpg", "id-b.jpg"]);
    expect(result.byQuestion.get("S1-Q2")?.failed).toBe(0);
  });

  it("a 5xx or network failure on the only photo fails the question: that finding must not be written", async () => {
    const { upload } = fakeUpload({ "a.jpg": "throw" });
    const result = await uploadPhotosFirst({ items: [{ questionId: "S1-Q2", photos: [file("a.jpg")] }], questions, upload });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failedQuestions.map((q) => q.id)).toEqual(["S1-Q2"]);
    expect(result.byQuestion.get("S1-Q2")?.failed).toBe(1);
  });

  it("an answer with no usable file id counts as a failed photo, like a rejection", async () => {
    const { upload } = fakeUpload({ "a.jpg": "empty" });
    const result = await uploadPhotosFirst({ items: [{ questionId: "S1-Q2", photos: [file("a.jpg")] }], questions, upload });
    expect(result.ok).toBe(false);
  });

  it("one photo that got through is enough; the ones that did not are counted", async () => {
    const { upload } = fakeUpload({ "b.jpg": "throw" });
    const result = await uploadPhotosFirst({
      items: [{ questionId: "S1-Q2", photos: [file("a.jpg"), file("b.jpg")] }],
      questions,
      upload,
    });
    expect(result.ok).toBe(true);
    expect(result.byQuestion.get("S1-Q2")?.uploaded).toHaveLength(1);
    expect(result.byQuestion.get("S1-Q2")?.failed).toBe(1);
  });

  it("a demanding question with no photo at all fails too: nothing could reach the server", async () => {
    const { upload, calls } = fakeUpload();
    const result = await uploadPhotosFirst({ items: [{ questionId: "S1-Q2" }], questions, upload });
    expect(result.ok).toBe(false);
    expect(calls).toEqual([]);
  });

  it("tries every demanding question, so one message can name all that failed, and each question once", async () => {
    const { upload, calls } = fakeUpload({ "a.jpg": "throw", "c.jpg": "throw" });
    const result = await uploadPhotosFirst({
      items: [
        { questionId: "S1-Q2", photos: [file("a.jpg")] },
        { questionId: "S3-Q1", photos: [file("b.jpg")] },
        { questionId: "S1-Q2", photos: [file("d.jpg")] },
      ],
      questions,
      upload,
    });
    expect(calls).toEqual(["a.jpg", "b.jpg"]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failedQuestions.map((q) => q.id)).toEqual(["S1-Q2"]);
    expect(result.byQuestion.get("S3-Q1")?.uploaded).toHaveLength(1);
  });

  it("leaves questions that do not demand a photo alone: not uploaded here, not in the map, never failed", async () => {
    const { upload, calls } = fakeUpload({ "x.jpg": "throw" });
    const result = await uploadPhotosFirst({
      items: [
        { questionId: "S1-Q3", photos: [file("x.jpg")] },
        { questionId: "S1-Q4", photos: [file("y.jpg")] },
        { questionId: "S9-Q9", photos: [file("z.jpg")] },
        { questionId: "S1-Q3" },
      ],
      questions,
      upload,
    });
    expect(result.ok).toBe(true);
    expect(calls).toEqual([]);
    expect(result.byQuestion.size).toBe(0);
  });
});

describe("findingMayBeWritten: the last door before a finding row", () => {
  it("refuses a demanding question with no uploaded photo, whatever else is true", () => {
    expect(findingMayBeWritten(q12, 0)).toBe(false);
  });

  it("lets a demanding question through with one photo or more", () => {
    expect(findingMayBeWritten(q12, 1)).toBe(true);
    expect(findingMayBeWritten(q12, 3)).toBe(true);
  });

  it("never holds back a question that does not demand a photo: no new behaviour for them", () => {
    expect(findingMayBeWritten(q13, 0)).toBe(true);
    expect(findingMayBeWritten(q14, 0)).toBe(true);
  });
});

describe("photoUploadAbortText: what the person reads when the save stopped", () => {
  it("for an audit names the question by number and text, says nothing was written and what to do", () => {
    const text = photoUploadAbortText({ failed: [q12], steps, subject: "audit" });
    expect(text).toContain("Denetim kaydedilmedi");
    expect(text).toContain("şu sorunun");
    expect(text).toContain("1.2 · Soru S1-Q2");
    expect(text).toContain("hiçbir şey kaydedilmedi");
    expect(text).toContain("yanıtlarınız ve fotoğraflarınız formda duruyor");
    expect(text).toContain("bağlantınızı kontrol edip Kaydet düğmesine tekrar basın");
  });

  it("names every failed question, in the order given", () => {
    const text = photoUploadAbortText({ failed: [q31, q12], steps, subject: "audit" });
    expect(text).toContain("şu soruların");
    expect(text.indexOf("3.1 · Soru S3-Q1")).toBeLessThan(text.indexOf("1.2 · Soru S1-Q2"));
  });

  it("for a single finding says so", () => {
    const text = photoUploadAbortText({ failed: [q12], steps, subject: "single" });
    expect(text).toContain("Tekil bulgu kaydedilmedi");
    expect(text).toContain("tekrar kaydedin");
    expect(text).not.toContain("Denetim kaydedilmedi");
  });
});
