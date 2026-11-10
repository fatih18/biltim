import { afterAll, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  DEFAULT_FROM_NAME,
  SMTP_OPTIONAL,
  SMTP_REQUIRED,
  isServerOptions,
  loadServerOptions,
  readServerOptions,
  smtpNotice,
  smtpState,
  withSmtpSwitch,
} from './serverOptions'

const CONFIG = join(import.meta.dir, '..', 'config.json')

const EMPTY: Record<string, string> = Object.fromEntries([...SMTP_REQUIRED, ...SMTP_OPTIONAL].map((name) => [name, '']))
const COMPLETE = { ...EMPTY, SMTP_HOST: 'smtp.office365.com', SMTP_USER: 'denetim@firma.example', SMTP_PASSWORD: 'abcd efgh ijkl mnop' }

type CredentialKey = 'host' | 'port' | 'secure' | 'user' | 'password' | 'sender_address'
const CREDENTIAL_KEYS: readonly CredentialKey[] = ['host', 'port', 'secure', 'user', 'password', 'sender_address']

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
    for (const key of CREDENTIAL_KEYS) {
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
    const raw = readServerOptions(CONFIG)
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

describe('isServerOptions', () => {
  it('accepts the options of the file and an object without an email block', () => {
    expect(isServerOptions(readServerOptions(CONFIG))).toBe(true)
    expect(isServerOptions({ appId: 'biltim' })).toBe(true)
    expect(isServerOptions({ email: {} })).toBe(true)
    expect(isServerOptions({ email: { smtp: { enabled: false } } })).toBe(true)
  })

  it('rejects an email block, or an smtp block, that is not an object', () => {
    for (const email of [null, 'smtp', 3, true, [], ['smtp']]) {
      expect(isServerOptions({ email })).toBe(false)
    }
    for (const smtp of [null, 'SMTP_HOST', 3, false, [], [1]]) {
      expect(isServerOptions({ email: { smtp } })).toBe(false)
    }
  })
})

describe('readServerOptions', () => {
  const dir = mkdtempSync(join(tmpdir(), 'biltim-options-'))
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  const write = (name: string, text: string): string => {
    const path = join(dir, name)
    writeFileSync(path, text)
    return path
  }

  it('reads an options file', () => {
    const path = write('ok.json', '{"appId":"biltim","email":{"smtp":{"enabled":false,"host":"SMTP_HOST"}}}')
    expect(readServerOptions(path)).toEqual({ appId: 'biltim', email: { smtp: { enabled: false, host: 'SMTP_HOST' } } })
  })

  it('refuses a file that is not an object, naming the file', () => {
    const NOT_OBJECTS: readonly { name: string; text: string }[] = [
      { name: 'null.json', text: 'null' },
      { name: 'list.json', text: '[1]' },
      { name: 'text.json', text: '"options"' },
      { name: 'number.json', text: '7' },
    ]
    for (const { name, text } of NOT_OBJECTS) {
      const path = write(name, text)
      expect(() => readServerOptions(path)).toThrow(`${path} is not a nucleus options object`)
    }
  })

  it('refuses a file whose email block or smtp block is not an object', () => {
    const email = write('email.json', '{"email":"smtp"}')
    const smtp = write('smtp.json', '{"email":{"smtp":null}}')
    expect(() => readServerOptions(email)).toThrow('is not a nucleus options object')
    expect(() => loadServerOptions(smtp, COMPLETE)).toThrow('is not a nucleus options object')
  })

  it('lets a file that is not JSON fail the way JSON.parse does', () => {
    expect(() => readServerOptions(write('broken.json', '{"appId":'))).toThrow()
  })

  it('applies the switch after the check', () => {
    const path = write('switch.json', '{"email":{"smtp":{"enabled":false,"host":"SMTP_HOST"}}}')
    expect(loadServerOptions(path, COMPLETE).email?.smtp?.enabled).toBe(true)
    expect(loadServerOptions(path, EMPTY).email?.smtp?.enabled).toBe(false)
  })
})
