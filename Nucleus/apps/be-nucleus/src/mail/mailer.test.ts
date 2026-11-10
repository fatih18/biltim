import { describe, expect, it } from 'bun:test'
import { MAIL_PACKAGE, isMailPackageInstalled } from './mailer'

describe('isMailPackageInstalled', () => {
  it('asks for the @azure/communication-email package and says yes when it resolves', () => {
    const asked: string[] = []
    const installed = isMailPackageInstalled((name) => {
      asked.push(name)
      return '/srv/biltim/Nucleus/node_modules/@azure/communication-email/dist/commonjs/index.js'
    })
    expect(installed).toBe(true)
    expect(asked).toEqual([MAIL_PACKAGE])
    expect(MAIL_PACKAGE).toBe('@azure/communication-email')
  })

  it('says no, without throwing, when the package is not installed', () => {
    const missing = isMailPackageInstalled(() => {
      throw new Error("Cannot find package '@azure/communication-email'")
    })
    expect(missing).toBe(false)
  })

  it('says no for a non-Error throw too', () => {
    expect(
      isMailPackageInstalled(() => {
        throw 'not found'
      })
    ).toBe(false)
  })

  it('finds the installed package with the real resolver, from where nucleus loads it (bun links it next to nucleus-core-ts only)', () => {
    expect(isMailPackageInstalled()).toBe(true)
  })
})
