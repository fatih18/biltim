import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  DEFAULT_FROM_NAME,
  SMTP_OPTIONAL,
  SMTP_REQUIRED,
  type ServerOptions,
  loadServerOptions,
  smtpNotice,
  smtpState,
  withSmtpSwitch,
} from './serverOptions'

const CONFIG = join(import.meta.dir, '..', 'config.json')

const EMPTY: Record<string, string> = Object.fromEntries([...SMTP_REQUIRED, ...SMTP_OPTIONAL].map((name) => [name, '']))
const COMPLETE = { ...EMPTY, SMTP_HOST: 'smtp.office365.com', SMTP_USER: 'denetim@firma.example', SMTP_PASSWORD: 'abcd efgh ijkl mnop' }

/**
 * nucleus-core-ts 0.10.115, `resolveCredential` with no secrets store (Nucleus/index.ts):
 * a config value is the NAME of an environment variable; the variable's value wins when it is
 * not empty, a name that is not set resolves to nothing, and a value that is not shaped like a
 * name is a literal.
 */
function resolveLikeNucleus(env: Record<string, string>, configValue: string | undefined): string | undefined {
  if (!configValue) return undefined
  const fromEnv = env[configValue]
  if (fromEnv) return fromEnv
  return /^[A-Z][A-Z0-9_]{2,}$/.test(configValue) ? undefined : configValue
}

const smtpOf = (options: ReturnType<typeof loadServerOptions>) => options.email?.smtp

describe('config.json email block', () => {
  const smtp = smtpOf(loadServerOptions(CONFIG, EMPTY))

  it('names the environment variables the credentials come from, as the token secrets do', () => {
    expect(smtp).toMatchObject({
      host: 'SMTP_HOST',
      port: 'SMTP_PORT',
      secure: 'SMTP_SECURE',
      user: 'SMTP_USER',
      password: 'SMTP_PASSWORD',
      sender_address: 'SMTP_SENDER_ADDRESS',
    })
  })

  it('resolves to nothing for every credential while all of them are empty, so the provider cannot come up', () => {
    for (const key of ['host', 'port', 'secure', 'user', 'password', 'sender_address'] as const) {
      expect(resolveLikeNucleus(EMPTY, String(smtp?.[key]))).toBeUndefined()
    }
  })

  it('resolves to what the environment holds once it is filled in', () => {
    const env = { ...COMPLETE, SMTP_PORT: '465', SMTP_SECURE: 'true' }
    expect(resolveLikeNucleus(env, String(smtp?.host))).toBe('smtp.office365.com')
    expect(resolveLikeNucleus(env, String(smtp?.port))).toBe('465')
    expect(resolveLikeNucleus(env, String(smtp?.secure))).toBe('true')
  })

  it('does not pin a provider: nucleus would build it on every call even with nothing to send through', () => {
    const raw: ServerOptions = JSON.parse(readFileSync(CONFIG, 'utf-8'))
    expect(raw.email?.provider).toBeUndefined()
    expect(raw.email?.smtp?.enabled).toBe(false)
  })
})

describe('the switch', () => {
  it('stays off with every SMTP_* empty, and says nothing', () => {
    expect(smtpOf(loadServerOptions(CONFIG, EMPTY))?.enabled).toBe(false)
    expect(smtpOf(loadServerOptions(CONFIG, {}))?.enabled).toBe(false)
    expect(smtpNotice(EMPTY)).toBeNull()
    expect(smtpNotice({})).toBeNull()
  })

  it('goes on with host, mailbox and password', () => {
    expect(smtpOf(loadServerOptions(CONFIG, COMPLETE))?.enabled).toBe(true)
    expect(smtpState(COMPLETE)).toEqual({ ready: true, touched: true, missing: [] })
    expect(smtpNotice(COMPLETE)).toBeNull()
  })

  it('stays off when one of the three is missing, and names it in one line', () => {
    for (const name of SMTP_REQUIRED) {
      const env = { ...COMPLETE, [name]: '' }
      expect(smtpOf(loadServerOptions(CONFIG, env))?.enabled).toBe(false)
      expect(smtpNotice(env)).toContain(name)
    }
    const hostOnly = { ...EMPTY, SMTP_HOST: 'smtp.office365.com' }
    expect(smtpNotice(hostOnly)).toBe(
      '[mail] SMTP_* eksik: SMTP_USER, SMTP_PASSWORD boş. E-posta sağlayıcısı kapalı kalır; üçü de dolu olmadan plan postaları gönderilmez'
    )
  })

  it('warns for a half-filled setup even when only an optional value was typed', () => {
    expect(smtpNotice({ ...EMPTY, SMTP_PORT: '587' })).toContain('SMTP_HOST, SMTP_USER, SMTP_PASSWORD')
  })

  it('counts a value of spaces as empty', () => {
    const env = { ...COMPLETE, SMTP_PASSWORD: '   ' }
    expect(smtpState(env).ready).toBe(false)
    expect(smtpOf(loadServerOptions(CONFIG, env))?.enabled).toBe(false)
  })

  it('does not need the optional values: port 587 and the mailbox as sender are the framework defaults', () => {
    expect(smtpState(COMPLETE).ready).toBe(true)
  })
})

describe('the sender name', () => {
  it('is "Biltim 5S" while SMTP_FROM_NAME is empty, because nucleus would otherwise say "Nucleus"', () => {
    expect(smtpOf(loadServerOptions(CONFIG, COMPLETE))?.from_name).toBe(DEFAULT_FROM_NAME)
    expect(resolveLikeNucleus(COMPLETE, DEFAULT_FROM_NAME)).toBe(DEFAULT_FROM_NAME)
  })

  it('stays the variable name when SMTP_FROM_NAME is filled in, so nucleus reads the customer value', () => {
    const env = { ...COMPLETE, SMTP_FROM_NAME: 'Çolakoğlu Kalite' }
    const smtp = smtpOf(loadServerOptions(CONFIG, env))
    expect(smtp?.from_name).toBe('SMTP_FROM_NAME')
    expect(resolveLikeNucleus(env, smtp?.from_name)).toBe('Çolakoğlu Kalite')
  })
})

describe('withSmtpSwitch', () => {
  it('leaves options without an SMTP block exactly as they are', () => {
    const options = { appId: 'biltim' }
    expect(withSmtpSwitch(options, COMPLETE)).toBe(options)
  })

  it('does not change the options it was given, so a second read starts from the file again', () => {
    const options = { appId: 'biltim', email: { smtp: { enabled: false, host: 'SMTP_HOST' } } }
    const switched = withSmtpSwitch(options, COMPLETE)
    expect(switched.email?.smtp?.enabled).toBe(true)
    expect(options.email.smtp.enabled).toBe(false)
  })

  it('keeps every other setting of the file', () => {
    const options = loadServerOptions(CONFIG, COMPLETE)
    expect(options.appId).toBe('biltim')
    expect(options.authentication?.accessToken?.secret).toBe('ACCESS_TOKEN_SECRET')
    expect(options.authorization?.godminEmail).toBe('GODMIN_EMAIL')
    expect(options.email?.smtp?.password).toBe('SMTP_PASSWORD')
  })
})
