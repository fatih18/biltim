/** Compile-time endpoint key generation - NO runtime execution */
import type * as AllSchemas from '@monorepo/db-entities/schemas'
import type { GenericMethods } from '@monorepo/db-entities/types/shared'

// Schema key'lerini compile-time'da al
type AllSchemaKeys = Extract<keyof typeof AllSchemas, string>

// Singularize helper (compile-time)
type Singularize<S extends string> = S extends `${infer Base}ies`
  ? `${Base}y`
  : S extends `${infer Base}sses`
    ? `${Base}ss`
    : S extends `${infer Base}xes`
      ? `${Base}x`
      : S extends `${infer Base}zes`
        ? `${Base}z`
        : S extends `${infer Base}s`
          ? Base
          : S

// Capitalize helper
type Capitalize<S extends string> = S extends `${infer First}${infer Rest}`
  ? `${Uppercase<First>}${Rest}`
  : S

// Replace spaces and underscores with single underscore, then uppercase
type ToSnakeCase<
  S extends string,
  Acc extends string = '',
  PrevWasLower extends boolean = false,
> = S extends `${infer First}${infer Rest}`
  ? First extends Lowercase<First>
    ? ToSnakeCase<Rest, `${Acc}${First}`, true>
    : ToSnakeCase<
        Rest,
        `${Acc}${Acc extends '' ? '' : PrevWasLower extends true ? '_' : ''}${Lowercase<First>}`,
        false
      >
  : Acc

type ToConstantCase<S extends string> = Uppercase<ToSnakeCase<S>>

// Endpoint key oluştur - compile time
type GenerateEndpointKey<
  EntityName extends string,
  Method extends GenericMethods,
> = Method extends GenericMethods.GET
  ? `GET_${ToConstantCase<EntityName>}`
  : Method extends GenericMethods.CREATE
    ? `ADD_${ToConstantCase<Singularize<Capitalize<EntityName>>>}`
    : Method extends GenericMethods.UPDATE
      ? `UPDATE_${ToConstantCase<Singularize<Capitalize<EntityName>>>}`
      : Method extends GenericMethods.DELETE
        ? `DELETE_${ToConstantCase<Singularize<Capitalize<EntityName>>>}`
        : Method extends GenericMethods.TOGGLE
          ? `TOGGLE_${ToConstantCase<Singularize<Capitalize<EntityName>>>}`
          : Method extends GenericMethods.VERIFICATION
            ? `VERIFY_${ToConstantCase<Singularize<Capitalize<EntityName>>>}`
            : never

// Tablename'i schema'dan çıkar
type ExtractTablename<K extends AllSchemaKeys> = (typeof AllSchemas)[K] extends {
  tablename: infer T
}
  ? T extends string
    ? T
    : never
  : never

// Tüm schema'lar için endpoint key'lerini oluştur - TABLENAME kullan
type AllEndpointKeys = {
  [K in AllSchemaKeys]: ExtractTablename<K> extends infer TName extends string
    ? GenerateEndpointKey<TName, GenericMethods>
    : never
}[AllSchemaKeys]

// Export edilen type - compile-time'da tüm key'ler belli
export type GenericEndpointKeys = AllEndpointKeys

// Runtime için key mapping objesi - bu obje TypeScript tarafından görülebilir
// Compile-time type ile runtime value'ları birleştir
export type EndpointsKeyMap = {
  [K in AllEndpointKeys]: string
}
