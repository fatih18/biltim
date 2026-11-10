import type { Photo, PhotoFile } from './photos'

/**
 * What a report workbook with photos is allowed to hold, and what it says when
 * it left some out: the types the embedder (findingPhotos.ts) works with, the
 * caps, the cell notes, the sheet note and the one-at-a-time queue.
 */

export type PhotoSide = 'before' | 'after'
export type PhotoSlot = { col: number; side: PhotoSide; width: number }
export type PhotoLoader = {
  locate: (ids: string[]) => Promise<Map<string, PhotoFile | null>>
  read: (file: PhotoFile, budgetBytes: number) => Promise<Photo | 'unsupported' | 'over-budget' | null>
}
export type PhotoLimits = { maxFiles: number; maxBytes: number; perSide: number }
export type PhotoTally = { placed: number; hidden: number; missing: number; unsupported: number; capped: number }

/*
 * Uploaded photos are stored as sent (no downscaling), so an iPad photo is
 * several MB and exceljs holds every embedded picture in memory twice (the
 * workbook, then the zip). 40 MB keeps one export well under the proxy's
 * time limit and the process's memory; what does not fit is counted in the
 * sheet note, and the register narrows by place, status and date.
 */
export const REPORT_PHOTO_LIMITS: PhotoLimits = { maxFiles: 150, maxBytes: 40 * 1024 * 1024, perSide: 3 }
export const PHOTO_COLUMN_WIDTH = 26

/** The photo columns of a finding row (alias `f`) that `hasPhoto` and the Excel photo cells read. */
export const PHOTO_COLUMNS = ['before', 'after']
  .flatMap((side) => [`f.photo_${side}_files`, `f.photo_${side}_file_id`, `f.photo_${side}_url`])
  .join(', ')

/** Said under a findings sheet whose photo caps left some out: the register narrows by place, status and date. */
export const PHOTO_HINT = 'Raporu lokasyon, durum ya da tarih aralığıyla daraltırsanız tüm fotoğraflar eklenir.'

/** The dashboard workbook takes a date range and nothing else, so that is all its hint offers. */
export const DASHBOARD_PHOTO_HINT = 'Raporu tarih aralığıyla daraltırsanız tüm fotoğraflar eklenir.'

export const NOTE_UNSUPPORTED = "Fotoğraf biçimi Excel'e eklenemiyor (HEIC/WEBP)"
export const NOTE_MISSING = 'Fotoğraf okunamadı'
export const NOTE_CAPPED = 'Fotoğraf sınırı aşıldı'

export const emptyTally = (): PhotoTally => ({ placed: 0, hidden: 0, missing: 0, unsupported: 0, capped: 0 })

/*
 * One workbook with photos at a time, in the process.
 *
 * At the photo cap that is 150 MB of pictures held twice (the workbook, then
 * the zip), and two people pressing the button together would hold it four
 * times. Later requests wait in order rather than being refused: the export
 * is rare, and a wait beats an error.
 */
let queue: Promise<void> = Promise.resolve()

export function oneAtATime<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task)
  queue = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

/** The line under a sheet that says what the photo caps left out; '' when nothing was. */
export function photoNote(tally: PhotoTally, limits: PhotoLimits, hint = ''): string {
  const parts = [
    tally.missing > 0 ? `${tally.missing} fotoğraf dosyası okunamadı` : '',
    tally.unsupported > 0 ? `${tally.unsupported} fotoğraf Excel'in desteklemediği biçimde (HEIC/WEBP)` : '',
    tally.hidden > 0
      ? `${tally.hidden} fotoğraf, hücre başına en fazla ${limits.perSide} fotoğraf gösterildiği için "+k fotoğraf daha" notuyla bırakıldı`
      : '',
    tally.capped > 0
      ? `${tally.capped} fotoğraf, rapor başına ${limits.maxFiles} fotoğraf / ${Math.round(limits.maxBytes / (1024 * 1024))} MB sınırını aştığı için eklenmedi`
      : '',
  ].filter(Boolean)
  if (parts.length === 0) return ''
  return `${parts.join('; ')} — ilgili hücrelerde not olarak belirtildi.${hint ? ` ${hint}` : ''}`
}
