import type * as AllSchemas from '@monorepo/db-entities/schemas'
import type { GenericMethods } from '@monorepo/db-entities/types/shared'

// Schema key union (T_Users, T_Addresses, ...)
type AllSchemaKeys = Extract<keyof typeof AllSchemas, string>
type AllSchemaTypes = typeof AllSchemas

// Entity name'i çıkar (T_Users -> Users)
type ExtractEntityName<K extends AllSchemaKeys> = K extends `T_${infer Name}` ? Name : never

// Store key - entity name'i lowercase yap (Users -> users)
type StoreKey<K extends AllSchemaKeys> = Lowercase<ExtractEntityName<K>>

// Excluded methods'u çıkar
type ExtractExcludedMethods<K extends AllSchemaKeys> = AllSchemaTypes[K] extends {
  excluded_methods: infer T
}
  ? T extends GenericMethods[]
    ? T[number]
    : never
  : never

// Her method için success type'ını çıkar - store export'undan
type GetStoreType<K extends AllSchemaKeys> = AllSchemaTypes[K] extends { store: infer S }
  ? NonNullable<S>
  : never

// Tüm method'ları içeren base map
type BaseMethodMap<K extends AllSchemaKeys> = {
  get: GetStoreType<K>[]
  create: GetStoreType<K>
  update: GetStoreType<K>
  delete: GetStoreType<K>
  toggle: GetStoreType<K>
  verification: GetStoreType<K>
}

// Excluded method check - union member kontrolü
type IsExcluded<K extends AllSchemaKeys, M extends keyof BaseMethodMap<K>> = M extends 'get'
  ? [GenericMethods.GET] extends [ExtractExcludedMethods<K>]
    ? false
    : [ExtractExcludedMethods<K>] extends [GenericMethods.GET]
      ? true
      : GenericMethods.GET extends ExtractExcludedMethods<K>
        ? true
        : false
  : M extends 'create'
    ? [GenericMethods.CREATE] extends [ExtractExcludedMethods<K>]
      ? false
      : [ExtractExcludedMethods<K>] extends [GenericMethods.CREATE]
        ? true
        : GenericMethods.CREATE extends ExtractExcludedMethods<K>
          ? true
          : false
    : M extends 'update'
      ? [GenericMethods.UPDATE] extends [ExtractExcludedMethods<K>]
        ? false
        : [ExtractExcludedMethods<K>] extends [GenericMethods.UPDATE]
          ? true
          : GenericMethods.UPDATE extends ExtractExcludedMethods<K>
            ? true
            : false
      : M extends 'delete'
        ? [GenericMethods.DELETE] extends [ExtractExcludedMethods<K>]
          ? false
          : [ExtractExcludedMethods<K>] extends [GenericMethods.DELETE]
            ? true
            : GenericMethods.DELETE extends ExtractExcludedMethods<K>
              ? true
              : false
        : M extends 'toggle'
          ? [GenericMethods.TOGGLE] extends [ExtractExcludedMethods<K>]
            ? false
            : [ExtractExcludedMethods<K>] extends [GenericMethods.TOGGLE]
              ? true
              : GenericMethods.TOGGLE extends ExtractExcludedMethods<K>
                ? true
                : false
          : M extends 'verification'
            ? [GenericMethods.VERIFICATION] extends [ExtractExcludedMethods<K>]
              ? false
              : [ExtractExcludedMethods<K>] extends [GenericMethods.VERIFICATION]
                ? true
                : GenericMethods.VERIFICATION extends ExtractExcludedMethods<K>
                  ? true
                  : false
            : false

// Bir schema için method store'u üret - excluded method'ları çıkar
// Method'lar optional çünkü başlangıçta undefined
type MethodMapForSchema<K extends AllSchemaKeys> = {
  [M in keyof BaseMethodMap<K> as IsExcluded<K, M> extends true ? never : M]?: BaseMethodMap<K>[M]
}

// Ana store tipi
// Table'lar required (runtime'da initialize ediliyor)
// Method'lar optional (dinamik olarak set ediliyor)
export type StoreProps = {
  [K in AllSchemaKeys as StoreKey<K>]: MethodMapForSchema<K>
}

export type StoreMethods = Record<string, never>
