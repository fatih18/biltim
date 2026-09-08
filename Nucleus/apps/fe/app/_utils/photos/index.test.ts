import { describe, expect, it } from "bun:test";
import {
  buildFileUrl,
  extractUuidMaybe,
  getBeforePhotoResolvedUrls,
  mergeFilesUnique,
  normalizeBeforePhotos,
  resolvePhotoUrl,
  toPhotoArr,
} from "./index";

const UUID = "3f1a2b4c-5d6e-4f70-8a91-0b1c2d3e4f50";

describe("buildFileUrl", () => {
  it("points at the CDN route, which is the one that serves bytes", () => {
    // /files/:id answers the database row as JSON; an <img> pointed there
    // renders broken.
    expect(buildFileUrl(UUID)).toBe(`/cdn/${UUID}`);
  });

  it("escapes an id that would otherwise change the path", () => {
    expect(buildFileUrl("a/b?c")).toBe("/cdn/a%2Fb%3Fc");
  });
});

describe("extractUuidMaybe", () => {
  it("finds an id inside a path the old system stored", () => {
    expect(extractUuidMaybe(`https://old.example/uploads/${UUID}.jpg`)).toBe(UUID);
  });

  it("returns null when there is nothing that shape", () => {
    expect(extractUuidMaybe("/uploads/photo-2024.jpg")).toBeNull();
    expect(extractUuidMaybe("")).toBeNull();
  });

  it("does not accept hex that is not a v1–v5 id", () => {
    // The version and variant nibbles are checked on purpose: a run of hex in a
    // path is not a file id.
    expect(extractUuidMaybe("00000000-0000-0000-0000-000000000000")).toBeNull();
  });
});

describe("resolvePhotoUrl", () => {
  it("prefers the stored id over any URL beside it", () => {
    expect(resolvePhotoUrl({ file_id: UUID, url: "https://old/x.jpg" })).toBe(`/cdn/${UUID}`);
  });

  it("recovers an id out of a legacy URL", () => {
    expect(resolvePhotoUrl({ url: ` https://old/u/${UUID}.jpg ` })).toBe(`/cdn/${UUID}`);
  });

  it("keeps a URL that carries no id", () => {
    expect(resolvePhotoUrl({ url: "https://old/u/photo.jpg" })).toBe("https://old/u/photo.jpg");
  });

  it("answers null rather than an empty src", () => {
    // An <img src=""> re-requests the page itself, which is worse than no image.
    expect(resolvePhotoUrl({ url: "   " })).toBeNull();
    expect(resolvePhotoUrl(null)).toBeNull();
    expect(resolvePhotoUrl({})).toBeNull();
  });
});

describe("normalizeBeforePhotos", () => {
  it("reads the array column when it has entries", () => {
    expect(
      normalizeBeforePhotos({ photo_before_files: [{ file_id: UUID }], photo_before_url: "legacy" }),
    ).toEqual([{ file_id: UUID }]);
  });

  it("falls back to the single-photo columns that came before it", () => {
    expect(
      normalizeBeforePhotos({ photo_before_files: [], photo_before_url: "https://old/x.jpg" }),
    ).toEqual([{ file_id: null, url: "https://old/x.jpg" }]);
  });

  it("drops entries that carry neither an id nor a url", () => {
    expect(normalizeBeforePhotos({ photo_before_files: [{}, { file_id: UUID }] })).toEqual([
      { file_id: UUID },
    ]);
  });

  it("survives a null finding and a null column", () => {
    expect(normalizeBeforePhotos(null)).toEqual([]);
    expect(normalizeBeforePhotos({ photo_before_files: null })).toEqual([]);
  });

  it("resolves the lot to addresses", () => {
    expect(getBeforePhotoResolvedUrls({ photo_before_files: [{ file_id: UUID }, {}] })).toEqual([
      `/cdn/${UUID}`,
    ]);
  });
});

describe("mergeFilesUnique", () => {
  const file = (name: string, size = 10, lastModified = 1) =>
    ({ name, size, lastModified }) as File;

  it("keeps the same photo from being added twice", () => {
    const a = file("a.jpg");
    expect(mergeFilesUnique([a], [a, file("b.jpg")]).map((f) => f.name)).toEqual(["a.jpg", "b.jpg"]);
  });

  it("treats same-name files that differ as different files", () => {
    const out = mergeFilesUnique([file("a.jpg", 10)], [file("a.jpg", 20)]);
    expect(out).toHaveLength(2);
  });

  it("does not mutate the selection it was given", () => {
    const prev = [file("a.jpg")];
    mergeFilesUnique(prev, [file("b.jpg")]);
    expect(prev).toHaveLength(1);
  });
});

describe("toPhotoArr", () => {
  it("keeps only uploads that produced something to point at", () => {
    expect(
      toPhotoArr([
        { fileId: UUID, mimeType: "image/jpeg", sizeBytes: 1, originalName: "a.jpg" },
        { fileId: "", mimeType: "image/jpeg", sizeBytes: 1, originalName: "b.jpg" },
      ]),
    ).toEqual([{ file_id: UUID, url: null }]);
  });

  it("handles nothing having been uploaded", () => {
    expect(toPhotoArr(undefined)).toEqual([]);
  });
});
