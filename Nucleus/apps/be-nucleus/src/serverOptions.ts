import { readFileSync } from 'node:fs'
import type { CreateNucleusServerOptions } from 'nucleus-core-ts/server'

/**
 * config.json as nucleus gets it, with the one setting the file cannot hold: whether the Azure
 * Communication Services mail provider is switched on (customer notes R63 and R70, the plan mails).
 *
 * `email.azure` in config.json names the environment variables the credentials come from
 * (`AZURE_EMAIL_CONNECTION_STRING` ...), the same way `authentication.accessToken.secret` names
 * `ACCESS_TOKEN_SECRET`. What nucleus 0.10.115 will NOT read from the environment is the on/off
 * flag: it picks the provider from `email.azure.enabled === true`, a literal boolean in the options
 * object, and from the literal `email.provider`.
 *
 * Leaving either set in the file is not an option. `activeEmailProvider` answers 'azure' whenever
 * `email.provider` is 'azure', enabled or not, and `getEmailService` then builds `AzureEmailService`
 * with `enabled: true` and calls `reconfigure` on every "can mail go out?" question (every worker
 * pass, every status read). While the service is not initialised `reconfigure` runs `initialize`
 * again, so an install with no mail settings would log `[AzureEmailService] No connection string
 * provided` over and over. So the file says `enabled: false` and names the provider for the reader,
 * and this module decides both at boot, once, from what the environment actually holds: complete
 * credentials switch the provider on, anything less removes the provider and leaves mail off and
 * silent (no provider: `activeEmailProvider` is null, `getEmailService` returns null and nothing is built).
 *
 * Mail needs two things on the server: these AZURE_EMAIL_* values AND the `@azure/communication-email`
 * package, which nucleus loads lazily. The package is an optional dependency of nucleus-core-ts and
 * is already in bun.lock, so a normal `bun install` brings it (see `mail/mailer.ts`). A change to
 * the values takes a restart of the backend: the switch is decided here, once, not per request.
 */

/** What createNucleusServer takes as `config.options` once it is an object. */
export type ServerOptions = Exclude<CreateNucleusServerOptions['config']['options'], string>

type EmailOptions = NonNullable<ServerOptions['email']>

export type Env = Record<string, string | undefined>

/** Without these two the framework cannot build the client (`AzureEmailService.initialize`). */
export const AZURE_REQUIRED: readonly string[] = ['AZURE_EMAIL_CONNECTION_STRING', 'AZURE_EMAIL_SENDER_ADDRESS']

/** Read when present. */
export const AZURE_OPTIONAL: readonly string[] = ['AZURE_EMAIL_FROM_NAME']

/** What the framework is told the sender's name is when `AZURE_EMAIL_FROM_NAME` is empty; nucleus itself would say "Nucleus". */
export const DEFAULT_FROM_NAME = 'Biltim 5S'

const filled = (env: Env, name: string): boolean => (env[name] ?? '').trim() !== ''

export type AzureState = {
  /** Connection string and sender address are both there: the provider can be switched on. */
  ready: boolean
  /** Some AZURE_EMAIL_* value is set. */
  touched: boolean
  /** The required names that are empty. */
  missing: string[]
}

export function azureState(env: Env): AzureState {
  const missing = AZURE_REQUIRED.filter((name) => !filled(env, name))
  return {
    ready: missing.length === 0,
    touched: [...AZURE_REQUIRED, ...AZURE_OPTIONAL].some((name) => filled(env, name)),
    missing,
  }
}

/**
 * The one boot line for a half-filled setup, so "I entered the connection string and nothing happens" has an answer in the log.
 * An install with every AZURE_EMAIL_* empty gets no line: that is today's normal state and says so elsewhere.
 */
export function azureNotice(env: Env): string | null {
  const state = azureState(env)
  if (state.ready || !state.touched) return null
  return `[mail] AZURE_EMAIL_* eksik: ${state.missing.join(', ')} boş. E-posta sağlayıcısı kapalı kalır; ikisi de dolu olmadan plan postaları gönderilmez`
}

function withoutProvider(email: EmailOptions): EmailOptions {
  const copy = { ...email }
  delete copy.provider
  return copy
}

/**
 * The options with the Azure switch decided from `env`; options without an `email.azure` block are returned as they are.
 * Complete credentials: `provider: 'azure'`, `email.azure.enabled: true` and the sender's name. Anything less: no
 * provider, `enabled: false` (whatever the file says), so nucleus builds nothing and prints nothing.
 */
export function withAzureSwitch(options: ServerOptions, env: Env): ServerOptions {
  const email = options.email
  const azure = email?.azure
  if (!email || !azure) return options
  if (!azureState(env).ready) {
    return { ...options, email: { ...withoutProvider(email), azure: { ...azure, enabled: false } } }
  }
  return {
    ...options,
    email: {
      ...email,
      provider: 'azure',
      azure: {
        ...azure,
        enabled: true,
        ...(filled(env, 'AZURE_EMAIL_FROM_NAME') ? {} : { from_name: DEFAULT_FROM_NAME }),
      },
    },
  }
}

/** A JSON value, the widest thing `JSON.parse` can hand back. */
type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

type JsonObject = { [key: string]: Json }

function isJsonObject(value: Json | undefined): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Whether a parsed object can be read as nucleus options: the part this file touches, the `email`
 * block and its `azure` block, must be objects where they exist. The rest of the file is nucleus's
 * own to validate at boot; checking it here would only copy its rules.
 */
export function isServerOptions(value: object): value is ServerOptions {
  const email: Json | undefined = Reflect.get(value, 'email')
  if (email === undefined) return true
  if (!isJsonObject(email)) return false
  const azure = email.azure
  return azure === undefined || isJsonObject(azure)
}

/** The file as it stands, read the way nucleus reads a path and checked with `isServerOptions`; throws when it is not options. */
export function readServerOptions(path: string): ServerOptions {
  const parsed: Json = JSON.parse(readFileSync(path, 'utf-8'))
  if (!isJsonObject(parsed) || !isServerOptions(parsed)) {
    throw new Error(`${path} is not a nucleus options object: a JSON object whose "email" and "email.azure" are objects`)
  }
  return parsed
}

/** Reads config.json from the working directory the way nucleus does for a path, then applies `withAzureSwitch`. */
export function loadServerOptions(path: string, env: Env = process.env): ServerOptions {
  return withAzureSwitch(readServerOptions(path), env)
}
