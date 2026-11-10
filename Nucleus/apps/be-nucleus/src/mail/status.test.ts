import { afterEach, describe, expect, it } from 'bun:test'
import { BiltimRoutes } from '../routes/biltim'
import { fakeRuntime, mailWorld, type RuntimeOptions } from './mailKit'
import { forgetMailRuntime, latchedMailRuntime } from './runtime'
import { createMailStatusRoute, mailStatus } from './status'

afterEach(() => forgetMailRuntime())

const CALLERS = {
  'u-ce': { roles: ['Content Manager Core Team'] },
  'u-sa': { roles: ['Super Admin'] },
  'u-god': { god: true, roles: [] },
  'u-mgr': { roles: ['Manager'] },
  'u-aud': { roles: ['Auditor'] },
  'u-fm': { roles: ['Field Manager'] },
}

const BACKLOG = { pending_invitations: '2', pending_completions: '1', failed_invitations: '1', failed_completions: '0' }

function status(userId: string | null, runtimeOptions: RuntimeOptions | null = { provider: 'smtp' }) {
  const w = mailWorld({ plans: [], callers: CALLERS, backlog: BACKLOG })
  const runtime = runtimeOptions ? fakeRuntime(runtimeOptions, w.events).runtime : null
  return mailStatus({ userId, runtime }, { read: w.deps.sql }).then((outcome) => ({ outcome, calls: w.calls }))
}

describe('who may read the mail status', () => {
  it('answers 401 for nobody and for an account that does not exist, before reading anything else', async () => {
    for (const userId of [null, '', 'u-nobody']) {
      const { outcome, calls } = await status(userId)
      expect(outcome.status).toBe(401)
      expect(outcome.body.success).toBe(false)
      expect(calls.every((c) => !c.text.includes('count(*)'))).toBe(true)
    }
  })

  it('refuses Müdür, an auditor and a field manager, saying who may, and counts nothing', async () => {
    for (const userId of ['u-mgr', 'u-aud', 'u-fm']) {
      const { outcome, calls } = await status(userId)
      expect(outcome.status).toBe(403)
      expect(outcome.body.message).toContain('yalnız Merkez Ekip, Super Admin ve godmin görebilir')
      expect(outcome.body.data).toBeUndefined()
      expect(calls.some((c) => c.text.includes('count(*)'))).toBe(false)
    }
  })

  it('lets Merkez Ekip, Super Admin and the godmin, the flag alone included', async () => {
    for (const userId of ['u-ce', 'u-sa', 'u-god']) {
      const { outcome } = await status(userId)
      expect(outcome.status).toBe(200)
      expect(outcome.body.success).toBe(true)
    }
  })
})

describe('what it reports', () => {
  it('says whether mail is available, through which provider and from which address, with the counts', async () => {
    const { outcome } = await status('u-ce', { provider: 'smtp', sender: 'denetim@firma.example' })
    expect(outcome.body.data).toEqual({
      available: true,
      provider: 'smtp',
      senderAddress: 'denetim@firma.example',
      windowHours: 48,
      maxAttempts: 5,
      pendingInvitations: 2,
      pendingCompletions: 1,
      failedInvitations: 1,
      failedCompletions: 0,
      pending: 3,
      failed: 1,
    })
  })

  it('reports no provider and no address when mail is not configured, still with the counts', async () => {
    const { outcome } = await status('u-ce', { available: false, provider: null, sender: '' })
    expect(outcome.body.data).toMatchObject({ available: false, provider: null, senderAddress: '', pending: 3 })
  })

  it('reports the same when the worker has not been handed the mail service at all', async () => {
    const { outcome } = await status('u-ce', null)
    expect(outcome.body.data).toMatchObject({ available: false, provider: null, senderAddress: '' })
  })
})

describe('the route', () => {
  it('is GET /biltim/mail/status, a read with nothing to send and nothing to declare', () => {
    const route = BiltimRoutes.routes.find((r) => r.path === '/mail/status')
    expect(BiltimRoutes.prefix).toBe('/biltim')
    expect(route?.method).toBe('GET')
    expect(route?.query).toBeUndefined()
    expect(route?.body).toBeUndefined()
    expect(route?.params).toBeUndefined()
  })

  it('sets the status on the response and keeps the mail service for the worker', async () => {
    const w = mailWorld({ plans: [], callers: CALLERS, backlog: BACKLOG })
    const route = createMailStatusRoute({ read: w.deps.sql })
    const nucleus = fakeRuntime({}, w.events).runtime
    const set: { status?: number; headers: Record<string, string> } = { headers: {} }
    const answer = await route.handler({
      request: new Request('http://localhost:1001/biltim/mail/status', { headers: { 'x-user-id': 'u-ce' } }),
      params: {},
      query: {},
      body: undefined,
      set,
      nucleus,
    })
    expect(set.status).toBe(200)
    expect(answer.data?.available).toBe(true)
    expect(latchedMailRuntime()).toBe(nucleus)
  })

  it('answers 403 to an auditor on the route too', async () => {
    const w = mailWorld({ plans: [], callers: CALLERS, backlog: BACKLOG })
    const route = createMailStatusRoute({ read: w.deps.sql })
    const set: { status?: number; headers: Record<string, string> } = { headers: {} }
    const answer = await route.handler({
      request: new Request('http://localhost:1001/biltim/mail/status', { headers: { 'x-user-id': 'u-aud' } }),
      params: {},
      query: {},
      body: undefined,
      set,
    })
    expect(set.status).toBe(403)
    expect(answer.success).toBe(false)
  })
})
