import { afterEach, describe, expect, it } from 'bun:test'
import { BiltimRoutes } from '../routes/biltim'
import { fakeRuntime } from './mailKit'
import { type NucleusSlot, forgetMailRuntime, latchedMailRuntime } from './runtime'

/**
 * `/biltim/me/scope` is the route every signed-in person's home page calls; it
 * is where the mail worker gets nucleus's mail service (`runtime.ts`). Called
 * here without an `x-user-id` the route answers 401 before it reads anything, so
 * no database is needed: what is checked is the hand-over, which happens first.
 */

afterEach(() => forgetMailRuntime())

const scope = BiltimRoutes.routes.find((r) => r.path === '/me/scope')

async function callScope(nucleus?: NucleusSlot) {
  if (!scope) throw new Error('/biltim/me/scope is no longer a route of BiltimRoutes')
  const set: { status?: number; headers: Record<string, string> } = { headers: {} }
  const answer = await scope.handler({
    request: new Request('http://localhost:1001/biltim/me/scope'),
    params: {},
    query: {},
    body: undefined,
    set,
    nucleus,
  })
  return { answer, set }
}

describe('the scope route and the mail service', () => {
  it('is GET /biltim/me/scope', () => {
    expect(BiltimRoutes.prefix).toBe('/biltim')
    expect(scope?.method).toBe('GET')
  })

  it('keeps the mail service of its context for the worker', async () => {
    const nucleus = fakeRuntime({}, []).runtime
    expect(latchedMailRuntime()).toBeNull()
    const { set } = await callScope(nucleus)
    expect(latchedMailRuntime()).toBe(nucleus)
    expect(set.status).toBe(401)
  })

  it('still works when its context has no nucleus: it answers as before and latches nothing', async () => {
    const { answer, set } = await callScope(undefined)
    expect(set.status).toBe(401)
    expect(answer).toMatchObject({ success: false })
    expect(latchedMailRuntime()).toBeNull()
  })

  it('ignores a nucleus that is not a mail service, a partial one included', async () => {
    await callScope({})
    await callScope({ sendEmail: () => undefined })
    expect(latchedMailRuntime()).toBeNull()
  })
})
