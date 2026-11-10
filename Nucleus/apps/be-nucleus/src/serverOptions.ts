import { readFileSync } from 'node:fs'
import type { CreateNucleusServerOptions } from 'nucleus-core-ts/server'

/**
 * config.json as nucleus gets it, with the one setting the file cannot hold: whether the SMTP
 * mail provider is switched on (customer notes R63 and R70, the plan mails).
 *
 * `email.smtp` in config.json names the environment variables the credentials come from
 * (`SMTP_HOST` ...), the same way `authentication.accessToken.secret` names `ACCESS_TOKEN_SECRET`.
 * What nucleus 0.10.115 will NOT read from the environment is the on/off flag: it picks the
 * provider from `email.smtp.enabled === true`, a literal boolean in the options object.
 *
 * Leaving that flag `true` in the file is not an option. With the flag on and the credentials
 * empty, nucleus still builds the SMTP service and calls it every time anything asks "can mail
 * go out?" (every worker pass, every status read, every login): `SmtpEmailService.applyConfig`
 * runs `initialize` again each time while it is not initialised, so an install with no mail
 * settings would log `[SmtpEmailService] No host configured` over and over. So the flag stays
 * `false` in the file and is set here, once at boot, from what the environment actually holds:
 * complete credentials switch the provider on, anything less leaves it off and silent.
 */

/** What createNucleusServer takes as `config.options` once it is an object. */
export type ServerOptions = Exclude<CreateNucleusServerOptions['config']['options'], string>

export type Env = Record<string, string | undefined>

/** Without these three the framework cannot sign in to a mail server (`SmtpEmailService.initialize`). */
export const SMTP_REQUIRED: readonly string[] = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD']

/** Read when present; each has a default of the framework's own (port 587 with STARTTLS, the user as sender). */
export const SMTP_OPTIONAL: readonly string[] = ['SMTP_PORT', 'SMTP_SECURE', 'SMTP_SENDER_ADDRESS', 'SMTP_FROM_NAME']

/** What recipients see as the sender's name when `SMTP_FROM_NAME` is empty; nucleus itself would say "Nucleus". */
export const DEFAULT_FROM_NAME = 'Biltim 5S'

const filled = (env: Env, name: string): boolean => (env[name] ?? '').trim() !== ''

export type SmtpState = {
  /** Host, mailbox and password are all there: the provider can be switched on. */
  ready: boolean
  /** Some SMTP_* value is set. */
  touched: boolean
  /** The required names that are empty. */
  missing: string[]
}

export function smtpState(env: Env): SmtpState {
  const missing = SMTP_REQUIRED.filter((name) => !filled(env, name))
  return {
    ready: missing.length === 0,
    touched: [...SMTP_REQUIRED, ...SMTP_OPTIONAL].some((name) => filled(env, name)),
    missing,
  }
}

/**
 * The one boot line for a half-filled setup, so "I entered the host and nothing happens" has an answer in the log.
 * An install with every SMTP_* empty gets no line: that is today's normal state and says so elsewhere.
 */
export function smtpNotice(env: Env): string | null {
  const state = smtpState(env)
  if (state.ready || !state.touched) return null
  return `[mail] SMTP_* eksik: ${state.missing.join(', ')} boş. E-posta sağlayıcısı kapalı kalır; üçü de dolu olmadan plan postaları gönderilmez`
}

/** The options with `email.smtp.enabled` and the sender's name decided from `env`; options without an SMTP block are returned as they are. */
export function withSmtpSwitch(options: ServerOptions, env: Env): ServerOptions {
  const smtp = options.email?.smtp
  if (!smtp) return options
  return {
    ...options,
    email: {
      ...options.email,
      smtp: {
        ...smtp,
        enabled: smtpState(env).ready,
        ...(filled(env, 'SMTP_FROM_NAME') ? {} : { from_name: DEFAULT_FROM_NAME }),
      },
    },
  }
}

/** Reads config.json from the working directory the way nucleus does for a path, then applies `withSmtpSwitch`. */
export function loadServerOptions(path: string, env: Env = process.env): ServerOptions {
  const parsed: ServerOptions = JSON.parse(readFileSync(path, 'utf-8'))
  return withSmtpSwitch(parsed, env)
}
