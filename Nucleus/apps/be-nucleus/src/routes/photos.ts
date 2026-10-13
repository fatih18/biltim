import path from 'node:path'
import config from '../../config.json'
import { type Row, query } from '../db'

/**
 * A finding photo's bytes, for embedding in an Excel report.
 *
 * Read straight from the storage directory, the way nucleus's own /cdn/:id
 * does (cdn.ts: path.join(record.path, record.name), checked to stay inside
 * the base). Storage is local on this install and the CDN's resizing is off,
 * so /cdn would hand back exactly these bytes — fetching it from here would
 * only add an authenticated round trip per photo and a dependency on the
 * caller's token surviving the export.
 *
 * Excel embeds PNG, JPEG and GIF only. The format is read from the file's
 * first bytes, never from `mime_type`, which is whatever the browser declared
 * and can be empty. WEBP/HEIC (iPhone) come back as `unsupported`, so the
 * report can say so in the cell instead of failing.
 */

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
/** Single uploads may be up to 50 MB; a report cell does not need that. */
const MAX_PHOTO_BYTES = 15 * 1024 * 1024

const STORAGE_ROOT = path.resolve(
  (config as { storage?: { basePath?: string } }).storage?.basePath ?? './storage'
)

export type Photo = {
  buffer: Buffer
  extension: 'png' | 'jpeg' | 'gif'
  width: number
  height: number
}

/**
 * The ids of a finding's photos on one side, in the order the screens show
 * them: the array column, else the single-photo columns that preceded it.
 * A url without an id is skipped — it points at the old system.
 */
export function photoIds(f: Row, side: 'before' | 'after'): string[] {
  let list: unknown = f[`photo_${side}_files`]
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list)
    } catch {
      list = []
    }
  }
  const items: Array<{ file_id?: unknown; url?: unknown }> =
    Array.isArray(list) && list.length > 0
      ? (list as Array<{ file_id?: unknown; url?: unknown }>)
      : [{ file_id: f[`photo_${side}_file_id`], url: f[`photo_${side}_url`] }]
  const ids: string[] = []
  for (const it of items) {
    const raw = String(it?.file_id ?? '') || String(it?.url ?? '')
    const id = UUID.exec(raw)?.[0]?.toLowerCase()
    if (id && !ids.includes(id)) ids.push(id)
  }
  return ids
}

function sniff(buf: Buffer): Photo['extension'] | 'unsupported' {
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png'
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg'
  if (buf.length >= 4 && buf.toString('ascii', 0, 4) === 'GIF8') return 'gif'
  return 'unsupported'
}

/** Pixel size from the header, so the picture keeps its shape in the cell. */
function dimensions(buf: Buffer, ext: Photo['extension']): { width: number; height: number } {
  try {
    if (ext === 'png' && buf.length >= 24) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
    if (ext === 'gif' && buf.length >= 10) return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) }
    if (ext === 'jpeg') {
      let orientation = 1
      let i = 2
      let size: { width: number; height: number } | null = null
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) {
          i += 1
          continue
        }
        const marker = buf[i + 1] ?? 0
        const len = buf.readUInt16BE(i + 2)
        // EXIF orientation 5–8 means the stored image is on its side.
        if (marker === 0xe1 && buf.toString('ascii', i + 4, i + 8) === 'Exif') {
          const tiff = i + 10
          const le = buf.toString('ascii', tiff, tiff + 2) === 'II'
          const u16 = (o: number) => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o))
          const u32 = (o: number) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o))
          const ifd = tiff + u32(tiff + 4)
          const count = u16(ifd)
          for (let e = 0; e < count; e++) {
            const at = ifd + 2 + e * 12
            if (at + 12 > buf.length) break
            if (u16(at) === 0x0112) orientation = u16(at + 8)
          }
        }
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          size = { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) }
          break
        }
        i += 2 + len
      }
      if (size) return orientation >= 5 && orientation <= 8 ? { width: size.height, height: size.width } : size
    }
  } catch {
    // A header we cannot read still embeds; it just gets the default box.
  }
  return { width: 4, height: 3 }
}

/** Where a photo's bytes are, found without reading them. */
export type PhotoFile = { id: string; abs: string }

/**
 * Finds the files for many ids with one lookup and reads none of them. null =
 * no such file record, larger than a cell needs, or outside the storage root.
 *
 * Finding and reading are separate so the report can read one photo at a
 * time, and stop reading when it has embedded as much as it can hold: the
 * first version read every photo of the year up front, so the memory was
 * spent before the cap was ever consulted.
 */
export async function locatePhotos(ids: string[]): Promise<Map<string, PhotoFile | null>> {
  const out = new Map<string, PhotoFile | null>()
  const wanted = [...new Set(ids.filter((id) => UUID.test(id)))]
  if (wanted.length === 0) return out
  const rows = await query(
    'select id::text as id, name, path, size from files where id = any($1::uuid[]) and is_active = true',
    [wanted]
  )
  const byId = new Map(rows.map((r) => [String(r.id), r]))
  for (const id of wanted) {
    const row = byId.get(id)
    if (!row || Number(row.size ?? 0) > MAX_PHOTO_BYTES) {
      out.set(id, null)
      continue
    }
    const abs = path.resolve(String(row.path ?? ''), String(row.name ?? ''))
    out.set(id, abs.startsWith(STORAGE_ROOT + path.sep) ? { id, abs } : null)
  }
  return out
}

/**
 * One photo's bytes, read only when they fit in `budgetBytes`.
 *
 * - a Photo when it is PNG/JPEG/GIF and no larger than the budget;
 * - 'unsupported' for a format Excel cannot embed — told from the first bytes
 *   alone, the rest never read;
 * - 'over-budget' when it would not fit — nothing past the header read;
 * - null when the file is gone, unreadable or larger than a cell needs.
 *
 * The size is the file's own, not files.size, which is what the upload said.
 */
export async function readPhoto(
  file: PhotoFile,
  budgetBytes: number
): Promise<Photo | 'unsupported' | 'over-budget' | null> {
  try {
    const handle = Bun.file(file.abs)
    if (!(await handle.exists())) return null
    const size = handle.size
    if (!Number.isFinite(size) || size <= 0 || size > MAX_PHOTO_BYTES) return null
    const ext = sniff(Buffer.from(await handle.slice(0, 16).arrayBuffer()))
    if (ext === 'unsupported') return 'unsupported'
    if (size > budgetBytes) return 'over-budget'
    const buffer = Buffer.from(await handle.arrayBuffer())
    return { buffer, extension: ext, ...dimensions(buffer, ext) }
  } catch {
    return null
  }
}

/** A box no larger than maxW × maxH that keeps the photo's proportions. */
export function fitBox(photo: Pick<Photo, 'width' | 'height'>, maxW: number, maxH: number): { width: number; height: number } {
  const w = photo.width > 0 ? photo.width : 4
  const h = photo.height > 0 ? photo.height : 3
  const scale = Math.min(maxW / w, maxH / h)
  return { width: Math.round(w * scale), height: Math.round(h * scale) }
}
