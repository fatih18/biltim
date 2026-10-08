import { describe, expect, it } from 'bun:test'
import { createHmac } from 'node:crypto'
import { verifiedSubject } from './caller'

const SECRET = 'test-secret'
const NOW = 1_800_000_000

function token(payload: Record<string, unknown>, secret = SECRET, header = { alg: 'HS256', typ: 'JWT' }) {
  const h = Buffer.from(JSON.stringify(header)).toString('base64url')
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const s = createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url')
  return `${h}.${p}.${s}`
}

const withHeaders = (headers: Record<string, string>) =>
  new Request('http://localhost/fiveSAuditPlans/p1', { method: 'PUT', headers })

describe('verifiedSubject', () => {
  it('reads the subject of a token nucleus would accept', () => {
    const t = token({ sub: 'u1', exp: NOW + 60 })
    expect(verifiedSubject(withHeaders({ authorization: `Bearer ${t}` }), SECRET, NOW)).toBe('u1')
    expect(verifiedSubject(withHeaders({ cookie: `a=b; nucleus_access_token=${t}` }), SECRET, NOW)).toBe('u1')
  })

  it('refuses a token signed with anything but the install secret', () => {
    // The whole reason for checking: an unsigned "I am the godmin" token.
    const forged = token({ sub: 'god', exp: NOW + 60 }, 'guess')
    expect(verifiedSubject(withHeaders({ authorization: `Bearer ${forged}` }), SECRET, NOW)).toBeNull()
  })

  it('refuses an expired token', () => {
    const old = token({ sub: 'u1', exp: NOW - 1 })
    expect(verifiedSubject(withHeaders({ authorization: `Bearer ${old}` }), SECRET, NOW)).toBeNull()
  })

  it('reads the cookie before the header, as nucleus does', () => {
    const mine = token({ sub: 'me', exp: NOW + 60 })
    const other = token({ sub: 'other', exp: NOW + 60 })
    const req = withHeaders({ cookie: `nucleus_access_token=${mine}`, authorization: `Bearer ${other}` })
    expect(verifiedSubject(req, SECRET, NOW)).toBe('me')
  })

  it('treats an API-key caller as nobody in particular', () => {
    const t = token({ sub: 'god', exp: NOW + 60 })
    const key = `nk_live_${'a'.repeat(64)}`
    expect(
      verifiedSubject(withHeaders({ 'x-api-key': key, cookie: `nucleus_access_token=${t}` }), SECRET, NOW)
    ).toBeNull()
  })

  it('answers null without a secret rather than trusting the token', () => {
    const t = token({ sub: 'u1', exp: NOW + 60 })
    expect(verifiedSubject(withHeaders({ authorization: `Bearer ${t}` }), '', NOW)).toBeNull()
  })
})
