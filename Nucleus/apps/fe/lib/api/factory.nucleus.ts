'use server'

/**
 * Sunucu tarafı çağrı fabrikası.
 *
 * Eskiden `@hidayetcanozcan/nucleus-generic-api-caller/server` yapıyordu; artık
 * nucleus-core-ts'in kendi `createServerFactory`'si. Dönüş zarfı aynı
 * (`{ isSuccess, data, errors, code }`), bu yüzden çağrı yerlerindeki 18 adet
 * `isSuccess` kontrolü olduğu gibi çalışıyor.
 *
 * Token adları backend'in cookie isimleriyle birebir aynı tutuldu — mevcut
 * oturumlar geçişte düşmesin diye.
 */
import { cookies, headers } from 'next/headers'
import { createServerFactory } from 'nucleus-core-ts/client'
import { NucleusEndpoints } from './endpoints.nucleus'

const factory = createServerFactory(
  NucleusEndpoints,
  {
    baseUrl: process.env.AUTH_API_URL || '',
    tokenNames: {
      accessToken: 'nucleus_access_token',
      refreshToken: 'nucleus_refresh_token',
    },
    debug: process.env.NEXT_PUBLIC_NUCLEUS_API_DEBUG === '1',
  },
  async () => {
    const store = await cookies()
    return {
      get: (name: string) => store.get(name),
      set: (name: string, value: string, opts?: Parameters<typeof store.set>[2]) => {
        store.set(name, value, opts)
      },
      delete: (name: string) => {
        store.delete(name)
      },
    }
  },
  async () => {
    const list = await headers()
    return {
      get: (name: string) => list.get(name),
      forEach: (cb: (value: string, key: string) => void) => {
        list.forEach(cb)
      },
    }
  }
)

export async function FactoryFunction<K extends keyof typeof NucleusEndpoints & string>(
  payload: unknown,
  endpoint: K
) {
  // biome-ignore lint/suspicious/noExplicitAny: payload shape is per-endpoint
  return factory(endpoint, payload as any)
}

/** Eski çağrı yerleriyle uyum için korunan sarmalayıcı. */
export async function Factory(_config: { endpoint: string }) {
  return FactoryFunction
}
