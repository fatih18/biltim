/**
 * Download a file the backend builds (an Excel workbook), through the same-origin
 * rewrites in next.config.ts so the session cookie goes with the request.
 *
 * The outcome is a value, not a throw: a refusal carries the status and the
 * server's own sentence, so the screen can say what is wrong and what to do.
 * Status 0 is "no answer at all" (offline, server down).
 */
export type DownloadResult =
  | { ok: true; filename: string }
  | { ok: false; status: number; message: string }

/** The file name a `Content-Disposition: attachment; filename="…"` header carries. */
export function filenameFromDisposition(header: string | null | undefined, fallback: string): string {
  return /filename="?([^";]+)"?/.exec(header ?? '')?.[1] ?? fallback
}

/** `?a=1&b=2` for the parameters that have a value; empty when none do. */
export function queryString(params: Record<string, string>): string {
  const qs = new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString()
  return qs ? `?${qs}` : ''
}

/** The anchor the browser clicks to save a file; an `HTMLAnchorElement` is one. */
type AnchorLike = { href: string; download: string; click: () => void; remove: () => void }

/** What saving needs from the browser, so a test can stand in for it. */
export type SaveEnv = {
  createObjectURL: (blob: Blob) => string
  revokeObjectURL: (url: string) => void
  /** A new anchor, already in the page. */
  createAnchor: () => AnchorLike
  later: (task: () => void, delayMs: number) => void
}

/** What downloading needs from the outside: the request and the save. */
export type DownloadIo = {
  fetcher: (url: string) => Promise<Response>
  save: (blob: Blob, filename: string) => void
}

/** How long the object URL outlives the click; see `saveBlob`. */
export const REVOKE_DELAY_MS = 1000

const browserEnv: SaveEnv = {
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
  createAnchor: () => {
    const link = document.createElement('a')
    document.body.appendChild(link)
    return link
  },
  later: (task, delayMs) => {
    setTimeout(task, delayMs)
  },
}

export function saveBlob(blob: Blob, filename: string, env: SaveEnv = browserEnv): void {
  const url = env.createObjectURL(blob)
  const link = env.createAnchor()
  link.href = url
  link.download = filename
  link.click()
  link.remove()
  // Revoked at once, iOS Safari can cancel the download it has only just started.
  env.later(() => env.revokeObjectURL(url), REVOKE_DELAY_MS)
}

const browserIo: DownloadIo = {
  fetcher: (url) => fetch(url, { cache: 'no-store' }),
  save: (blob, filename) => saveBlob(blob, filename),
}

/** Never throws: every way it can fail is a `{ ok: false }` the caller words. */
export async function downloadFile(
  path: string,
  params: Record<string, string>,
  fallbackName: string,
  io: DownloadIo = browserIo
): Promise<DownloadResult> {
  const res = await io.fetcher(`${path}${queryString(params)}`).catch(() => null)
  if (!res) return { ok: false, status: 0, message: '' }
  if (!res.ok) {
    const body: { message?: string } | null = await res.json().catch(() => null)
    return { ok: false, status: res.status, message: String(body?.message ?? '') }
  }
  const filename = filenameFromDisposition(res.headers.get('Content-Disposition'), fallbackName)
  try {
    // The connection can drop after the headers: the body read rejects, and that is "no answer" too.
    io.save(await res.blob(), filename)
  } catch {
    return { ok: false, status: 0, message: '' }
  }
  return { ok: true, filename }
}
