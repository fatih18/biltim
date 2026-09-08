import { describe, expect, it } from 'bun:test'
import { durumGruplari, kisaYol, paylar } from './traffic'

describe('paylar', () => {
  it('en çoktan aza sıralar ve oranı verir', () => {
    const p = paylar({ '/a': 30, '/b': 70 })
    expect(p.map((x) => x.ad)).toEqual(['/b', '/a'])
    expect(p[0]?.oran).toBe(70)
    expect(p[1]?.oran).toBe(30)
  })

  it('kuyruğu atmaz, toplayıp gösterir — çubuklar bütünü tamamlar', () => {
    const sayim: Record<string, number> = {}
    for (let i = 0; i < 12; i++) sayim[`/u${i}`] = 10
    const p = paylar(sayim, 3)
    expect(p).toHaveLength(4)
    expect(p[3]?.ad).toBe('+9 uç daha')
    expect(p[3]?.adet).toBe(90)
    expect(p.reduce((s, x) => s + x.oran, 0)).toBeCloseTo(100, 6)
  })

  it('sıfır ve geçersiz sayımları eler', () => {
    expect(paylar({ '/a': 0, '/b': Number.NaN })).toEqual([])
    expect(paylar(undefined)).toEqual([])
  })

  it('eşitlikte ada göre kararlı sıralar', () => {
    expect(paylar({ '/b': 5, '/a': 5 }).map((x) => x.ad)).toEqual(['/a', '/b'])
  })
})

describe('durumGruplari', () => {
  it('4xx ile 5xx ayrı durur', () => {
    // "3 hata" demek, sunucunun mu bozuk olduğunu yoksa birinin hatalı
    // süzgeç mi yazdığını söylemiyor.
    const g = durumGruplari({ '200': 90, '404': 6, '500': 4 })
    expect(g.map((x) => x.etiket)).toEqual(['Başarılı', 'İstemci hatası', 'Sunucu hatası'])
    expect(g[2]?.ton).toBe('bad')
    expect(g[1]?.ton).toBe('warn')
  })

  it('3xx başarılı sayılır', () => {
    const g = durumGruplari({ '304': 10 })
    expect(g).toHaveLength(1)
    expect(g[0]?.etiket).toBe('Başarılı')
  })

  it('boş sayımda hiçbir grup üretmez', () => {
    expect(durumGruplari({})).toEqual([])
    expect(durumGruplari(undefined)).toEqual([])
  })

  it('oranlar 100 eder', () => {
    const g = durumGruplari({ '200': 1, '400': 1, '503': 2 })
    expect(g.reduce((s, x) => s + x.oran, 0)).toBeCloseTo(100, 6)
  })
})

describe('kisaYol', () => {
  it('kısa yolu olduğu gibi bırakır', () => {
    expect(kisaYol('/users')).toBe('/users')
  })

  it('uzun yolu baştan kırpar — anlamlı kısım sonda', () => {
    const k = kisaYol('/auth/admin/cohorts/:id/deactivate-users', 24)
    expect(k.endsWith('deactivate-users')).toBe(true)
    expect(k.length).toBeLessThanOrEqual(26)
  })

  it('tek parçalı uzun yolu sondan keser', () => {
    expect(kisaYol('/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 10)).toHaveLength(10)
  })
})
