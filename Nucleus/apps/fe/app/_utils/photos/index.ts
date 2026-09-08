import type { UploadedFileInfo } from "../../(pages)/bulgular/hooks/useUploadAnswersPhoto";

/** One stored photo: either an uploaded file id, or a URL from the old system. */
export type PhotoItem = { file_id?: string | null; url?: string | null };

/** The finding fields these helpers read. */
export type FindingPhotoFields = {
  photo_before_files?: PhotoItem[] | null;
  photo_before_file_id?: string | null;
  photo_before_url?: string | null;
};

/**
 * Where the bytes of a stored file live.
 *
 * `/cdn/:id`, not `/files/:id`. They look interchangeable and are not: the
 * files route answers the database ROW as JSON, so every <img> pointed at it
 * received a JSON body and rendered broken. Only the CDN route sets a real
 * Content-Type, honours Range requests and serves the resized derivatives.
 */
export function buildFileUrl(fileId: string): string {
  return `/cdn/${encodeURIComponent(fileId)}`;
}

/**
 * Pull a file id out of a URL written by the old system, which stored whole
 * paths rather than ids. Deliberately strict about the version and variant
 * nibbles: something that merely looks hex-ish in a path is not an id.
 */
export function extractUuidMaybe(input: string): string | null {
  const m =
    input.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i) ?? null;
  return m?.[0] ?? null;
}

/** The address to render a photo from, whichever shape it was stored in. */
export function resolvePhotoUrl(p: PhotoItem | null | undefined): string | null {
  if (p?.file_id) return buildFileUrl(p.file_id);

  const u = (p?.url ?? "").trim();
  if (!u) return null;

  const uuid = extractUuidMaybe(u);
  if (uuid) return buildFileUrl(uuid);

  return u;
}

/**
 * The "before" photos of a finding, from either the current array column or the
 * single-photo columns that preceded it.
 */
export function normalizeBeforePhotos(f: FindingPhotoFields | null): PhotoItem[] {
  if (!f) return [];
  const beforeArr = Array.isArray(f.photo_before_files) ? f.photo_before_files : [];

  const fromLegacy =
    !beforeArr.length && (f.photo_before_file_id || f.photo_before_url)
      ? [{ file_id: f.photo_before_file_id ?? null, url: f.photo_before_url ?? null }]
      : [];

  const source = beforeArr.length ? beforeArr : fromLegacy;
  return source.filter((x) => x?.file_id || x?.url);
}

/** Every resolvable address for a finding's "before" photos. */
export function getBeforePhotoResolvedUrls(f: FindingPhotoFields | null): string[] {
  return normalizeBeforePhotos(f)
    .map(resolvePhotoUrl)
    .filter((u): u is string => Boolean(u));
}

/**
 * Add files to a selection without duplicating them. Picking the same photo
 * twice from the gallery is easy to do and produced two identical uploads.
 */
export function mergeFilesUnique(prev: File[], incoming: File[]): File[] {
  const key = (f: File) => `${f.name}__${f.size}__${f.lastModified}`;
  const seen = new Set(prev.map(key));
  const next = [...prev];
  for (const f of incoming) {
    const k = key(f);
    if (!seen.has(k)) {
      next.push(f);
      seen.add(k);
    }
  }
  return next;
}

/** Upload results, in the shape the finding row stores. */
export function toPhotoArr(ups: UploadedFileInfo[] | null | undefined): PhotoItem[] {
  return (ups ?? [])
    .filter((x) => x?.fileId || x?.fileUrl)
    .map((x) => ({ file_id: x?.fileId ?? null, url: x?.fileUrl ?? null }));
}
