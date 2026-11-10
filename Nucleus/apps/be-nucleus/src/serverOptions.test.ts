import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import {
  AZURE_OPTIONAL,
  AZURE_REQUIRED,
  DEFAULT_FROM_NAME,
  azureNotice,
  azureState,
  loadServerOptions,
  readServerOptions,
  withAzureSwitch,
} from './serverOptions'
import { activeProviderLikeNucleus, resolveLikeNucleus } from './serverOptions.nucleus'

const CONFIG = join(import.meta.dir, '..', 'config.json')

const EMPTY: Record<string, string> = Object.fromEntries([...AZURE_REQUIRED, ...AZURE_OPTIONAL].map((name) => [name, '']))
const CONNECTION = 'endpoint=https://biltim.communication.azure.com/;accesskey=c2VjcmV0'
const COMPLETE = {
  ...EMPTY,
  AZURE_EMAIL_CONNECTION_STRING: CONNECTION,
  AZURE_EMAIL_SENDER_ADDRESS: 'DoNotReply@biltim.example',
}

const azureOf = (options: ReturnType<typeof loadServerOptions>) => options.email?.azure

describe('config.json email block', () => {
  const raw = readServerOptions(CONFIG)

  it('names the environment variables the credentials come from, as the token secrets do', () => {
    expect(raw.email?.azure).toMatchObject({
      connection_string: 'AZURE_EMAIL_CONNECTION_STRING',
      sender_address: 'AZURE_EMAIL_SENDER_ADDRESS',
      from_name: 'AZURE_EMAIL_FROM_NAME',
    })
  })

  it('names Azure as the provider and leaves the switch off: the boot decides it', () => {
    expect(raw.email?.provider).toBe('azure')
    expect(raw.email?.azure?.enabled).toBe(false)
  })

  it('has no other provider block', () => {
    expect(Object.keys(raw.email ?? {}).sort()).toEqual(['azure', 'provider'])
  })

  it('resolves to nothing for every credential while all of them are empty, so the provider cannot come up', () => {
    const azure = azureOf(loadServerOptions(CONFIG, EMPTY))
    for (const name of [azure?.connection_string, azure?.sender_address, azure?.from_name]) {
      expect(resolveLikeNucleus(EMPTY, name)).toBeUndefined()
    }
  })

  it('resolves to what the environment holds once it is filled in', () => {
    const azure = azureOf(loadServerOptions(CONFIG, COMPLETE))
    expect(resolveLikeNucleus(COMPLETE, azure?.connection_string)).toBe(CONNECTION)
    expect(resolveLikeNucleus(COMPLETE, azure?.sender_address)).toBe('DoNotReply@biltim.example')
  })
})

describe('the switch', () => {
  it('stays off with every AZURE_EMAIL_* empty, and says nothing', () => {
    for (const env of [EMPTY, {}]) {
      expect(azureOf(loadServerOptions(CONFIG, env))?.enabled).toBe(false)
      expect(azureNotice(env)).toBeNull()
    }
  })

  it('goes on with the connection string and the sender address', () => {
    expect(azureOf(loadServerOptions(CONFIG, COMPLETE))?.enabled).toBe(true)
    expect(azureState(COMPLETE)).toEqual({ ready: true, touched: true, missing: [] })
    expect(azureNotice(COMPLETE)).toBeNull()
  })

  it('stays off when one of the two is missing, and names it in one line', () => {
    for (const name of AZURE_REQUIRED) {
      const env = { ...COMPLETE, [name]: '' }
      expect(azureOf(loadServerOptions(CONFIG, env))?.enabled).toBe(false)
      expect(azureNotice(env)).toContain(name)
    }
    expect(azureNotice({ ...EMPTY, AZURE_EMAIL_CONNECTION_STRING: CONNECTION })).toBe(
      '[mail] AZURE_EMAIL_* eksik: AZURE_EMAIL_SENDER_ADDRESS boş. E-posta sağlayıcısı kapalı kalır; ikisi de dolu olmadan plan postaları gönderilmez'
    )
  })

  it('warns for a half-filled setup even when only the optional name was typed', () => {
    expect(azureNotice({ ...EMPTY, AZURE_EMAIL_FROM_NAME: 'Kalite' })).toContain(
      'AZURE_EMAIL_CONNECTION_STRING, AZURE_EMAIL_SENDER_ADDRESS'
    )
  })

  it('counts a value of spaces as empty', () => {
    const env = { ...COMPLETE, AZURE_EMAIL_SENDER_ADDRESS: '   ' }
    expect(azureState(env).ready).toBe(false)
    expect(azureOf(loadServerOptions(CONFIG, env))?.enabled).toBe(false)
  })

  it('does not need the sender name', () => {
    expect(azureState(COMPLETE).ready).toBe(true)
  })

  it('does not count APP_BASE_URL as an Azure value: it belongs to the mail links, not to the provider', () => {
    expect(azureState({ ...EMPTY, APP_BASE_URL: 'http://172.26.16.27:3000' }).touched).toBe(false)
  })
})

describe('the sender name', () => {
  it('is "Biltim 5S" while AZURE_EMAIL_FROM_NAME is empty, because nucleus would otherwise say "Nucleus"', () => {
    const name = azureOf(loadServerOptions(CONFIG, COMPLETE))?.from_name
    expect(name).toBe(DEFAULT_FROM_NAME)
    expect(resolveLikeNucleus(COMPLETE, name)).toBe(DEFAULT_FROM_NAME)
  })

  it('stays the variable name when AZURE_EMAIL_FROM_NAME is filled in, so nucleus reads the customer value', () => {
    const env = { ...COMPLETE, AZURE_EMAIL_FROM_NAME: 'Çolakoğlu Kalite' }
    const azure = azureOf(loadServerOptions(CONFIG, env))
    expect(azure?.from_name).toBe('AZURE_EMAIL_FROM_NAME')
    expect(resolveLikeNucleus(env, azure?.from_name)).toBe('Çolakoğlu Kalite')
  })
})

describe('what nucleus does with the options (0.10.115 activeEmailProvider)', () => {
  it('would build the Azure service on every question for the file as it stands, empty credentials or not', () => {
    expect(activeProviderLikeNucleus(readServerOptions(CONFIG))).toBe('azure')
  })

  it('builds nothing and prints nothing while the values are empty: no provider is active', () => {
    for (const env of [EMPTY, {}, { ...EMPTY, AZURE_EMAIL_FROM_NAME: 'Kalite' }, { ...COMPLETE, AZURE_EMAIL_SENDER_ADDRESS: '' }]) {
      expect(activeProviderLikeNucleus(loadServerOptions(CONFIG, env))).toBeNull()
    }
  })

  it('names Azure once both values are in', () => {
    expect(activeProviderLikeNucleus(loadServerOptions(CONFIG, COMPLETE))).toBe('azure')
  })
})

describe('withAzureSwitch', () => {
  it('leaves options without an Azure block exactly as they are', () => {
    const options = { appId: 'biltim' }
    expect(withAzureSwitch(options, COMPLETE)).toBe(options)
  })

  it('does not change the options it was given, so a second read starts from the file again', () => {
    const options = { appId: 'biltim', email: { provider: 'azure' as const, azure: { enabled: false } } }
    const on = withAzureSwitch(options, COMPLETE)
    expect(on.email?.azure?.enabled).toBe(true)
    const off = withAzureSwitch(on, EMPTY)
    expect(off.email?.provider).toBeUndefined()
    expect(options).toEqual({ appId: 'biltim', email: { provider: 'azure', azure: { enabled: false } } })
  })

  it('turns an "enabled: true" in the file off while the values are empty, and drops the provider', () => {
    const options = { email: { provider: 'azure' as const, azure: { enabled: true, connection_string: 'AZURE_EMAIL_CONNECTION_STRING' } } }
    const off = withAzureSwitch(options, EMPTY)
    expect(off.email?.azure?.enabled).toBe(false)
    expect(off.email?.provider).toBeUndefined()
  })

  it('keeps every other setting of the file', () => {
    const options = loadServerOptions(CONFIG, COMPLETE)
    expect(options.appId).toBe('biltim')
    expect(options.authentication?.accessToken?.secret).toBe('ACCESS_TOKEN_SECRET')
    expect(options.authorization?.godminEmail).toBe('GODMIN_EMAIL')
    expect(options.email?.azure?.connection_string).toBe('AZURE_EMAIL_CONNECTION_STRING')
  })
})
