import { cookies } from 'next/headers'

/**
 * Tarayıcıdan gelen kimlik çerezlerini backend'e iletmek için `Cookie` başlığı.
 *
 * Neden hepsi: erişim jetonu TEK BAŞINA yetmiyor. `jwtClaimsMode: 'resolve'`
 * ile JWT yalnız rolleri taşıyor, yetki çözümü oturum çerezine bağlı — sadece
 * `nucleus_access_token` ileten bir istek backend'den 401 dönüyor (ölçüldü).
 *
 * Bu yardımcı yalnız tarayıcıya `<img src>` / dosya indirme gibi sunucu
 * aksiyonuyla yapılamayan çağrılar için var. Veri çekmenin normal yolu
 * nucleus endpoint'leri; yeni proxy rotası eklemek gerekmiyor.
 */
const AUTH_COOKIES = [
  'nucleus_access_token',
  'nucleus_refresh_token',
  'nucleus_session_token',
] as const

export async function authCookieHeader(): Promise<string | null> {
  const store = await cookies()
  const parts: string[] = []

  for (const name of AUTH_COOKIES) {
    const value = store.get(name)?.value
    if (value) parts.push(`${name}=${value}`)
  }

  // Erişim jetonu yoksa oturum yok demektir; çağıranın 401 dönmesi için null.
  if (!store.get('nucleus_access_token')?.value) return null

  return parts.join('; ')
}
