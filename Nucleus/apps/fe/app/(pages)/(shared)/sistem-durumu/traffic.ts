/**
 * Shaping the traffic breakdown the monitoring endpoint already returns.
 *
 * The snapshot carries `requests.byEndpoint`, `byStatus` and `byMethod` — 23
 * endpoints on this install — and none of it reached the screen. Counts alone
 * are the least useful part; what someone watching this wants to know is which
 * paths carry the load and whether anything is answering with an error. Both
 * are proportions, so both are shaped here and drawn as bars.
 */

export type Sayim = Record<string, number>

export type Pay = {
  ad: string
  adet: number
  /** 0-100, the share of the total. */
  oran: number
}

/** Sorted, proportioned, and cut to `limit` — with the remainder folded in. */
export function paylar(sayim: Sayim | undefined, limit = 8): Pay[] {
  const girdiler = Object.entries(sayim ?? {}).filter(([, v]) => Number.isFinite(v) && v > 0)
  const toplam = girdiler.reduce((s, [, v]) => s + v, 0)
  if (toplam === 0) return []

  const sirali = [...girdiler].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const bas = sirali.slice(0, limit)
  const kalan = sirali.slice(limit)

  const out: Pay[] = bas.map(([ad, adet]) => ({
    ad,
    adet,
    oran: (adet / toplam) * 100,
  }))

  /*
   * The tail is summed rather than dropped: a list whose bars do not add up to
   * the whole is a list that quietly lies about the share of the ones it does
   * show.
   */
  if (kalan.length > 0) {
    const adet = kalan.reduce((s, [, v]) => s + v, 0)
    out.push({ ad: `+${kalan.length} uç daha`, adet, oran: (adet / toplam) * 100 })
  }
  return out
}

export type DurumGrubu = {
  etiket: string
  adet: number
  oran: number
  ton: 'good' | 'warn' | 'bad'
}

/**
 * HTTP status codes folded into the three groups anyone actually reacts to.
 *
 * 4xx is the caller's mistake and 5xx is ours; keeping them apart is the whole
 * point — a screen that shows "3 hata" cannot tell you whether the server is
 * broken or someone typed a bad filter.
 */
export function durumGruplari(sayim: Sayim | undefined): DurumGrubu[] {
  let basarili = 0
  let istemci = 0
  let sunucu = 0
  for (const [kod, adet] of Object.entries(sayim ?? {})) {
    const n = Number(kod)
    const v = Number(adet)
    if (!Number.isFinite(n) || !Number.isFinite(v) || v <= 0) continue
    if (n >= 500) sunucu += v
    else if (n >= 400) istemci += v
    else basarili += v
  }
  const toplam = basarili + istemci + sunucu
  if (toplam === 0) return []
  const gruplar: DurumGrubu[] = [
    { etiket: 'Başarılı', adet: basarili, oran: (basarili / toplam) * 100, ton: 'good' },
    { etiket: 'İstemci hatası', adet: istemci, oran: (istemci / toplam) * 100, ton: 'warn' },
    { etiket: 'Sunucu hatası', adet: sunucu, oran: (sunucu / toplam) * 100, ton: 'bad' },
  ]
  return gruplar.filter((g) => g.adet > 0)
}

/** A path shortened for display without losing which entity it names. */
export function kisaYol(yol: string, enFazla = 34): string {
  if (yol.length <= enFazla) return yol
  const parcalar = yol.split('/').filter(Boolean)
  if (parcalar.length <= 1) return `${yol.slice(0, enFazla - 1)}…`
  // Baştan kırp: yolun ANLAMLI kısmı sonda olur (/auth/admin/lock-user).
  let out = parcalar[parcalar.length - 1] as string
  for (let i = parcalar.length - 2; i >= 0; i--) {
    const aday = `${parcalar[i]}/${out}`
    if (aday.length + 2 > enFazla) return `…/${out}`
    out = aday
  }
  return `/${out}`
}
