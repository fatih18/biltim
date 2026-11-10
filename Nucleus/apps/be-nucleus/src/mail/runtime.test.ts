import { afterEach, describe, expect, it } from 'bun:test'
import { fakeRuntime } from './mailKit'
import { forgetMailRuntime, isMailRuntime, latchMailRuntime, latchedMailRuntime, onMailRuntimeLatched } from './runtime'

afterEach(() => forgetMailRuntime())

describe('getting the mail service out of a request', () => {
  it('knows nucleus’s runtime by the four things the worker calls', () => {
    const { runtime } = fakeRuntime({}, [])
    expect(isMailRuntime(runtime)).toBe(true)
    const needed: string[] = ['sendEmail', 'isEmailAvailable', 'emailProvider', 'emailSenderAddress']
    for (const missing of needed) {
      const partial = { ...runtime, [missing]: 'not a function' }
      expect(isMailRuntime(partial)).toBe(false)
    }
  })

  it('ignores anything else a context could carry', () => {
    for (const other of [undefined, null, 'azure', 42, {}, { sendEmail: () => undefined }]) {
      expect(isMailRuntime(other)).toBe(false)
    }
  })

  it('wakes the worker once, on the first real service only', () => {
    let woken = 0
    onMailRuntimeLatched(() => void (woken += 1))
    latchMailRuntime(undefined)
    expect(woken).toBe(0)
    latchMailRuntime(fakeRuntime({}, []).runtime)
    latchMailRuntime(fakeRuntime({}, []).runtime)
    expect(woken).toBe(1)
    onMailRuntimeLatched(null)
    forgetMailRuntime()
    latchMailRuntime(fakeRuntime({}, []).runtime)
    expect(woken).toBe(1)
  })

  it('keeps the first real service it is handed and is not replaced by an empty context', () => {
    expect(latchedMailRuntime()).toBeNull()
    latchMailRuntime(undefined)
    expect(latchedMailRuntime()).toBeNull()
    const { runtime } = fakeRuntime({}, [])
    latchMailRuntime(runtime)
    latchMailRuntime(undefined)
    latchMailRuntime({})
    expect(latchedMailRuntime()).toBe(runtime)
  })
})
