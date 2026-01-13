/**
 * Generic action types for all schemas
 *
 * Bu dosya artık sadece runtime type placeholder olarak kullanılıyor.
 * Endpoint key'leri için endpointKeys.ts dosyasına bakın.
 */

export type AllGenericActionTypes = Record<
  string,
  {
    // biome-ignore lint/suspicious/noExplicitAny: Runtime'da Factory doğru tipi çıkaracak
    payload: any
    // biome-ignore lint/suspicious/noExplicitAny: Runtime'da Factory doğru tipi çıkaracak
    success: any
    error: string
  }
>
