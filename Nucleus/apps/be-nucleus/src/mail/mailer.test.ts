import { describe, expect, it } from 'bun:test'
import { MAILER_PACKAGE, isMailerInstalled } from './mailer'

describe('isMailerInstalled', () => {
  it('asks for the nodemailer package and says yes when it resolves', () => {
    const asked: string[] = []
    const installed = isMailerInstalled((name) => {
      asked.push(name)
      return '/srv/biltim/Nucleus/node_modules/nodemailer/lib/nodemailer.js'
    })
    expect(installed).toBe(true)
    expect(asked).toEqual([MAILER_PACKAGE])
    expect(MAILER_PACKAGE).toBe('nodemailer')
  })

  it('says no, without throwing, when the package is not installed', () => {
    const missing = isMailerInstalled(() => {
      throw new Error("Cannot find package 'nodemailer'")
    })
    expect(missing).toBe(false)
  })

  it('says no for a non-Error throw too', () => {
    expect(
      isMailerInstalled(() => {
        throw 'not found'
      })
    ).toBe(false)
  })

  it('uses the real resolver by default and always answers with a boolean', () => {
    expect(typeof isMailerInstalled()).toBe('boolean')
  })
})
