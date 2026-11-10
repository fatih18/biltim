/**
 * Download a workbook the backend builds. Same-origin through the /reports
 * rewrite in next.config.ts, so the session cookie goes with it.
 */
export async function downloadWorkbook(path: string, params: Record<string, string>): Promise<void> {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
  const res = await fetch(`${path}${qs ? `?${qs}` : ''}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Excel indirilemedi (${res.status})`)
  const blob = await res.blob()
  const cd = res.headers.get('Content-Disposition') ?? ''
  const filename = cd.match(/filename="?([^";]+)"?/)?.[1] ?? 'rapor.xlsx'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
