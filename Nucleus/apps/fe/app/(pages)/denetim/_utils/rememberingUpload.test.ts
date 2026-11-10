import { describe, expect, it } from "bun:test";
import { rememberingUpload, uploadPhotosFirst } from "./photoFirst";
import { type Up, fakeUpload, file, questions } from "./photoFirstFixture";

describe("rememberingUpload: a repeated save does not send a photo twice", () => {
  it("returns what already reached the server for the same file, and uploads each file once", async () => {
    const { upload, calls } = fakeUpload();
    const remembering = rememberingUpload(upload, new WeakMap<File, Up>());
    const a = file("a.jpg");
    const first = await remembering(a);
    const second = await remembering(a);
    expect(second).toBe(first);
    expect(calls).toEqual(["a.jpg"]);
  });

  it("does not remember a failure, so the next save tries the photo again", async () => {
    let attempt = 0;
    const flaky = async (f: File): Promise<Up | undefined> => {
      attempt += 1;
      if (attempt === 1) throw new Error("File upload failed (503): unavailable");
      return { fileId: "id-1", name: f.name };
    };
    const remembering = rememberingUpload(flaky, new WeakMap<File, Up>());
    const a = file("a.jpg");
    await expect(remembering(a)).rejects.toThrow("503");
    expect((await remembering(a))?.fileId).toBe("id-1");
    expect(attempt).toBe(2);
  });

  it("does not remember an answer that carries no file id", async () => {
    let attempt = 0;
    const empty = async (f: File): Promise<Up | undefined> => {
      attempt += 1;
      return attempt === 1 ? { name: f.name } : { fileId: "id-2", name: f.name };
    };
    const remembering = rememberingUpload(empty, new WeakMap<File, Up>());
    const a = file("a.jpg");
    await remembering(a);
    expect((await remembering(a))?.fileId).toBe("id-2");
  });

  it("a retry after a stopped save uploads only the photos that had not gone up", async () => {
    const { upload, calls } = fakeUpload({ "b.jpg": "throw" });
    const memory = new WeakMap<File, Up>();
    const items = [
      { questionId: "S1-Q2", photos: [file("a.jpg")] },
      { questionId: "S3-Q1", photos: [file("b.jpg")] },
    ];
    const firstTry = await uploadPhotosFirst({ items, questions, upload: rememberingUpload(upload, memory) });
    expect(firstTry.ok).toBe(false);
    const { upload: working, calls: retryCalls } = fakeUpload();
    const secondTry = await uploadPhotosFirst({ items, questions, upload: rememberingUpload(working, memory) });
    expect(secondTry.ok).toBe(true);
    expect(calls).toEqual(["a.jpg", "b.jpg"]);
    expect(retryCalls).toEqual(["b.jpg"]);
  });
});
