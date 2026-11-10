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

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function downloadFile(
  path: string,
  params: Record<string, string>,
  fallbackName: string
): Promise<DownloadResult> {
  const res = await fetch(`${path}${queryString(params)}`, { cache: 'no-store' }).catch(() => null)
  if (!res) return { ok: false, status: 0, message: '' }
  if (!res.ok) {
    const body: { message?: string } | null = await res.json().catch(() => null)
    return { ok: false, status: res.status, message: String(body?.message ?? '') }
  }
  const filename = filenameFromDisposition(res.headers.get('Content-Disposition'), fallbackName)
  saveBlob(await res.blob(), filename)
  return { ok: true, filename }
}
