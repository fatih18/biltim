import { describe, expect, it } from 'bun:test'
import { isAbortError } from '@/app/_utils/readAllPages'
import { attachRoles, roleNamesByUser } from './index'
import { cancelled, crowded, refuse, roles, serve } from './roleFixtures'

/* A request the browser cancelled (leaving the page) is not a failure; a real one still is. */

describe('attachRoles and a cancelled read', () => {
  it('says nothing when the browser cancelled the read: leaving the page is not a failure', async () => {
    let said = 0
    const onReadFailed = () => {
      said += 1
    }
    expect(await attachRoles([{ id: 'u-0' }], serve(roles), cancelled, onReadFailed)).toEqual([{ id: 'u-0', roles: [] }])
    expect(await attachRoles([{ id: 'u-0' }], cancelled, serve(crowded), onReadFailed)).toEqual([{ id: 'u-0', roles: [] }])
    expect(said).toBe(0)
  })

  it('still says so when one read was cancelled and the other really failed', async () => {
    let said = 0
    const onReadFailed = () => {
      said += 1
    }
    await attachRoles([{ id: 'u-0' }], cancelled, refuse, onReadFailed)
    await attachRoles([{ id: 'u-0' }], refuse, cancelled, onReadFailed)
    expect(said).toBe(2)
  })
})

describe('roleNamesByUser and a cancelled read', () => {
  it('hands on the cancellation as such, and prefers a real failure over it', async () => {
    const aborted = await roleNamesByUser(cancelled, serve(crowded))
    expect(!aborted.ok && isAbortError(aborted.error)).toBe(true)
    const abortedSecond = await roleNamesByUser(serve(roles), cancelled)
    expect(!abortedSecond.ok && isAbortError(abortedSecond.error)).toBe(true)

    const mixed = await roleNamesByUser(cancelled, refuse)
    expect(!mixed.ok && isAbortError(mixed.error)).toBe(false)
    const mixedBack = await roleNamesByUser(refuse, cancelled)
    expect(!mixedBack.ok && isAbortError(mixedBack.error)).toBe(false)
  })
})
