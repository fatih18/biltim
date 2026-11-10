import { afterAll, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isServerOptions, loadServerOptions, readServerOptions } from './serverOptions'

const CONFIG = join(import.meta.dir, '..', 'config.json')

/** Both mail values filled in, so the switch is on whenever a test asks for it. */
const COMPLETE = {
  AZURE_EMAIL_CONNECTION_STRING: 'endpoint=https://biltim.communication.azure.com/;accesskey=c2VjcmV0',
  AZURE_EMAIL_SENDER_ADDRESS: 'DoNotReply@biltim.example',
}
const EMPTY = { AZURE_EMAIL_CONNECTION_STRING: '', AZURE_EMAIL_SENDER_ADDRESS: '' }

describe('isServerOptions', () => {
  it('accepts the options of the file and an object without an email block', () => {
    expect(isServerOptions(readServerOptions(CONFIG))).toBe(true)
    expect(isServerOptions({ appId: 'biltim' })).toBe(true)
    expect(isServerOptions({ email: {} })).toBe(true)
    expect(isServerOptions({ email: { azure: { enabled: false } } })).toBe(true)
  })

  it('rejects an email block, or an azure block, that is not an object', () => {
    for (const email of [null, 'azure', 3, true, [], ['azure']]) {
      expect(isServerOptions({ email })).toBe(false)
    }
    for (const azure of [null, 'AZURE_EMAIL_CONNECTION_STRING', 3, false, [], [1]]) {
      expect(isServerOptions({ email: { azure } })).toBe(false)
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
    const text = '{"appId":"biltim","email":{"azure":{"enabled":false,"sender_address":"AZURE_EMAIL_SENDER_ADDRESS"}}}'
    expect(readServerOptions(write('ok.json', text))).toEqual({
      appId: 'biltim',
      email: { azure: { enabled: false, sender_address: 'AZURE_EMAIL_SENDER_ADDRESS' } },
    })
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

  it('refuses a file whose email block or azure block is not an object', () => {
    const email = write('email.json', '{"email":"azure"}')
    const azure = write('azure.json', '{"email":{"azure":null}}')
    expect(() => readServerOptions(email)).toThrow('is not a nucleus options object')
    expect(() => loadServerOptions(azure, COMPLETE)).toThrow('is not a nucleus options object')
  })

  it('lets a file that is not JSON fail the way JSON.parse does', () => {
    expect(() => readServerOptions(write('broken.json', '{"appId":'))).toThrow()
  })

  it('applies the switch after the check', () => {
    const path = write('switch.json', '{"email":{"provider":"azure","azure":{"enabled":false}}}')
    expect(loadServerOptions(path, COMPLETE).email?.azure?.enabled).toBe(true)
    expect(loadServerOptions(path, EMPTY).email?.azure?.enabled).toBe(false)
    expect(loadServerOptions(path, EMPTY).email?.provider).toBeUndefined()
  })
})
