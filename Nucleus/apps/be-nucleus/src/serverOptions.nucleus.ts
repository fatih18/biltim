import type { ServerOptions } from './serverOptions'

/**
 * nucleus-core-ts 0.10.115 decisions that `serverOptions.ts` works around, copied from
 * `Nucleus/index.ts` (nucleus-core `f38303c`) so a test can prove the switch against them.
 * Used by the tests only; the server never imports this file. The framework knows a third
 * provider as well; Biltim's config.json declares none, so it is left out of the copy.
 */

/**
 * `resolveCredential` with no secrets store (Biltim's config.json has no `secrets` block): a config
 * value is the NAME of an environment variable; the variable's value wins when it is not empty, a
 * name that is not set resolves to nothing, and a value that is not shaped like a name is a literal.
 */
export function resolveLikeNucleus(env: Record<string, string>, configValue: string | undefined): string | undefined {
  if (!configValue) return undefined
  const fromEnv = env[configValue]
  if (fromEnv) return fromEnv
  return /^[A-Z][A-Z0-9_]{2,}$/.test(configValue) ? undefined : configValue
}

type ProviderName = 'azure' | 'gmail'

const ORDER: readonly ProviderName[] = ['azure', 'gmail']

/**
 * `activeEmailProvider`: a provider the options declare in `email.provider` is active whether or
 * not it is enabled; otherwise the first enabled one in the order azure, gmail; else none.
 * `getEmailService` builds a service (and logs when its credentials are empty) only when this is not null.
 */
export function activeProviderLikeNucleus(options: ServerOptions): ProviderName | null {
  const on = (name: ProviderName): boolean => options.email?.[name]?.enabled === true
  const declared = resolveLikeNucleus({}, options.email?.provider)
  if (declared === 'azure' || declared === 'gmail') {
    return on(declared) || options.email?.provider === declared ? declared : null
  }
  return ORDER.find(on) ?? null
}
