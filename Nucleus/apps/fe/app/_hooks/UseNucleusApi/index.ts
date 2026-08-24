'use client'

/**
 * Endpoint çağrı kancası — nucleus-core-ts sürümü.
 *
 * Dışarıya verdiği arayüz eskisiyle birebir aynı:
 *   actions.GET_FIVE_S_FINDINGS?.start({ payload, onAfterHandle, onErrorHandle })
 * ve her endpoint için `isPending` / `data` / `error` / `code`. Bu yüzden
 * çağıran 26 ekranda tek satır değişmedi; sadece import yolu güncellendi.
 */
import { createApiHook } from 'nucleus-core-ts/client'
import { normalizeFilters } from './filters'
import { useMemo } from 'react'
import { FactoryFunction } from '@/lib/api/factory.nucleus'
import { NucleusEndpoints } from '@/lib/api/endpoints.nucleus'

type Dict = Record<string, unknown>

const SNAKE_CACHE = new Map<string, string>()

function toSnake(key: string): string {
  const hit = SNAKE_CACHE.get(key)
  if (hit) return hit
  const out = key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()
  SNAKE_CACHE.set(key, out)
  return out
}

/**
 * Nucleus kayıtları camelCase döndürüyor (`operation_type` → `operationType`);
 * ekranlar ise sütun adlarını veritabanındaki hâliyle, snake_case okuyor.
 *
 * Anahtarları DEĞİŞTİRMİYORUZ, snake_case ikizlerini EKLİYORUZ. Böylece hem
 * dokunulmamış 26 ekran hem de yeni yazılacak camelCase kod aynı nesneden
 * okuyabiliyor; ekranlar zamanla geçtikçe bu katman kaldırılabilir.
 *
 * Derinlik sınırı, ilişki genişletmelerinde kendine referans veren yapılara
 * karşı ucuz bir emniyet kemeri.
 */
function withSnakeAliases(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value
  if (Array.isArray(value)) return value.map((v) => withSnakeAliases(v, depth + 1))
  if (typeof value !== 'object') return value
  // Date, Blob gibi düz olmayan nesnelere dokunma.
  if (Object.getPrototypeOf(value) !== Object.prototype) return value

  const src = value as Dict
  const out: Dict = {}
  for (const [k, v] of Object.entries(src)) {
    const converted = withSnakeAliases(v, depth + 1)
    out[k] = converted
    const snake = toSnake(k)
    if (snake !== k && !(snake in src)) out[snake] = converted
  }
  return out
}

/**
 * `/auth/me` iki noktada eski cevaptan ayrılıyor: kullanıcı alanları artık
 * `data.user` altında iç içe geliyor, ve alan adları camelCase (`isGod`,
 * `firstName`). Ekranlar ise düz bir nesnede snake_case bekliyor
 * (`user.is_god`, `user.profile.first_name`).
 *
 * Farkı tek yerde kapatıyoruz — 26 ekranın hiçbirine dokunmadan. Her iki
 * yazımı da bırakıyoruz ki yeni kod camelCase kullanabilsin.
 */
function normalizeMe(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data
  // Sunucu fabrikası backend zarfını olduğu gibi `data` içinde veriyor, yani
  // burada elimizde `{ success, data: { user, profile, … } }` var. Bir kat
  // daha açmak gerekiyor; zarfsız gelirse de çalışsın diye ikisini de dener.
  const outer = data as Dict
  const d = (outer.data as Dict) ?? outer
  const user = (d.user as Dict) ?? null
  if (!user) return data

  const profile = d.profile as Dict | null
  return {
    ...user,
    is_god: user.isGod ?? user.is_god,
    is_active: user.isActive ?? user.is_active,
    last_login_at: user.lastLoginAt ?? user.last_login_at,
    profile: profile
      ? {
          ...profile,
          first_name: profile.firstName ?? profile.first_name,
          last_name: profile.lastName ?? profile.last_name,
        }
      : null,
    roles: d.roles ?? [],
    claims: d.claims ?? [],
    addresses: d.addresses ?? [],
    phones: d.phones ?? [],
    files: d.files ?? [],
  }
}

const ME_KEYS = new Set(['GET_ME', 'GET_ME_V2'])

/**
 * Cevap zarfını ekranların beklediği şekle çevirir.
 *
 * İki fark var:
 *  1. Sunucu fabrikası backend gövdesini olduğu gibi `data` içine koyuyor, yani
 *     bir kat fazla `{ success, data: … }` sarmalı oluşuyor.
 *  2. Liste uçları `{ items, meta }` döndürüyor; ekranlar `{ data, pagination }`
 *     okuyor ve sayfalama alan adları da farklı (`totalItems` ↔ `total`,
 *     `hasNextPage` ↔ `hasNext` …).
 *
 * Çeviriyi burada, tek yerde yapıyoruz. Yeni adlar da bırakılıyor; ileride
 * ekranlar nucleus adlarına geçtikçe bu katman incelerek kaldırılabilir.
 */
function normalizeEnvelope(res: Dict): Dict {
  if (!res?.isSuccess) return res

  let body = res.data as Dict | undefined
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    body = body.data as Dict
  }

  if (body && typeof body === 'object' && Array.isArray((body as Dict).items)) {
    const meta = ((body as Dict).meta ?? {}) as unknown as Dict
    body = {
      ...body,
      data: (body as Dict).items,
      pagination: {
        ...meta,
        total: meta.totalItems,
        totalCount: meta.totalItems,
        pageCount: meta.totalPages,
        hasNext: meta.hasNextPage,
        hasPrev: meta.hasPrevPage,
      },
    }
  }

  return { ...res, data: body }
}

export const useNucleusApiActions = createApiHook(
  NucleusEndpoints,
  // createApiHook (endpointKey, payload) ister; sunucu aksiyonu (payload, endpointKey).
  (async (endpointKey: string, payload: unknown) => {
    // biome-ignore lint/suspicious/noExplicitAny: per-endpoint payload/response shapes
    const res = (await FactoryFunction(
      normalizeFilters(payload),
      endpointKey as any
    )) as unknown as Dict
    if (ME_KEYS.has(endpointKey) && res?.isSuccess) {
      return { ...res, data: withSnakeAliases(normalizeMe(res.data)) }
    }
    const unwrapped = normalizeEnvelope(res)
    if (!unwrapped?.isSuccess) return unwrapped
    return { ...unwrapped, data: withSnakeAliases(unwrapped.data) }
    // biome-ignore lint/suspicious/noExplicitAny: adapter signature
  }) as any
)

/** Eski adla çağıran ekranlar için takma ad. */
export const useGenericApiActions = useNucleusApiActions
export const useGenericApiStore = useNucleusApiActions

export type NucleusEndpointMeta = {
  endpointKey: string
  path: string
  method: string
}

/**
 * API sandbox ekranının beklediği şekil.
 *
 * Eskiden `kind` ayrımı vardı (generic / custom / vorion) ve generic olanlar
 * şema nesnesini de taşıyordu; kaynak, tablo şemalarının taranmasıydı. Artık
 * tek kaynak üretilen endpoint tablosu, dolayısıyla `schema` yok. Ayrımı
 * yol biçiminden koruyoruz ki ekran gruplamayı sürdürebilsin.
 */
export type GenericActionMeta = {
  kind: 'generic' | 'custom'
  endpointKey: string
  endpoint: string
  path: string
  method: string
  schema?: undefined
}

/**
 * Endpoint kataloğu — API sandbox / payload şablonu ekranlarının kullandığı
 * meta. Eskiden şemalar taranarak kuruluyordu; artık üretilen endpoint
 * tablosunun kendisi kaynak, yani liste her zaman backend'le aynı.
 */
export function useNucleusApiMetadata(): Record<string, GenericActionMeta> {
  return useMemo(() => {
    const meta: Record<string, GenericActionMeta> = {}
    for (const [endpointKey, def] of Object.entries(NucleusEndpoints)) {
      const path = def.path
      meta[endpointKey] = {
        // Kimlik ve elle yazılmış uçlar dışındakiler jenerik CRUD'dan geliyor.
        kind: path.startsWith('/auth') || path.startsWith('/reports') ? 'custom' : 'generic',
        endpointKey,
        endpoint: endpointKey,
        path,
        method: def.method as string,
      }
    }
    return meta
  }, [])
}

/** Eski adla çağıran ekranlar için takma ad. */
export const useGenericApiMetadata = useNucleusApiMetadata
