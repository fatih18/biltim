import { describe, expect, it } from 'bun:test'
import { createHmac } from 'node:crypto'
import {
  type Caller,
  carriesCredentials,
  cookieValue,
  isAdmin,
  isAuditorOnly,
  isCentral,
  resolveCaller,
  sessionUserFromDb,
  verifiedSubject,
} from './caller'

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

  it('takes the LAST of two cookies with the same name, as nucleus’s cookie map does', () => {
    const first = token({ sub: 'first', exp: NOW + 60 })
    const last = token({ sub: 'last', exp: NOW + 60 })
    const req = withHeaders({ cookie: `nucleus_access_token=${first}; x=1; nucleus_access_token=${last}` })
    expect(verifiedSubject(req, SECRET, NOW)).toBe('last')
  })

  it('treats an API-key caller as nobody in particular — when the install reads API keys', () => {
    const t = token({ sub: 'god', exp: NOW + 60 })
    const key = `nk_live_${'a'.repeat(64)}`
    const req = withHeaders({ 'x-api-key': key, cookie: `nucleus_access_token=${t}` })
    expect(verifiedSubject(req, SECRET, NOW, true)).toBeNull()
  })

  it('ignores x-api-key when API keys are off, because nucleus ignores it too', () => {
    // Biltim's config.json has no authentication.apiKeys: nucleus authenticates
    // this request by its token, so the guard must see the same person.
    const t = token({ sub: 'u1', exp: NOW + 60 })
    const key = `nk_live_${'a'.repeat(64)}`
    const req = withHeaders({ 'x-api-key': key, cookie: `nucleus_access_token=${t}` })
    expect(verifiedSubject(req, SECRET, NOW, false)).toBe('u1')
  })

  it('answers null without a secret rather than trusting the token', () => {
    const t = token({ sub: 'u1', exp: NOW + 60 })
    expect(verifiedSubject(withHeaders({ authorization: `Bearer ${t}` }), '', NOW)).toBeNull()
  })
})

describe('cookieValue', () => {
  it('returns the last occurrence and nothing for an absent name', () => {
    expect(cookieValue('a=1; b=2; a=3', 'a')).toBe('3')
    expect(cookieValue('a=1', 'b')).toBeUndefined()
    expect(cookieValue(null, 'a')).toBeUndefined()
  })
})

/** Answers callerById's two queries. */
const userReader =
  (users: Record<string, { god?: boolean; roles: string[] }>) =>
  async (text: string, params: unknown[]) => {
    const u = users[String(params[0])]
    if (!u) return []
    if (text.includes('from main.users')) return [{ is_god: u.god === true }]
    if (text.includes('from main.user_roles')) return u.roles.map((name) => ({ name }))
    return []
  }

describe('resolveCaller', () => {
  const read = userReader({
    'u-ce': { roles: ['Content Manager Core Team'] },
    'u-aud': { roles: ['auditor'] },
  })
  const sessions: Record<string, string> = { 's-ce': 'u-ce', 's-aud': 'u-aud' }
  const sessionUser = async (id: string) => sessions[id] ?? null
  const base = { secret: SECRET, nowSeconds: NOW, apiKeysEnabled: false, sessionRequired: true, sessionUser }

  it('finds Merkez Ekip from the session alone once the access token has expired', async () => {
    // The 30-minute token is gone; the browser still sends the session cookie
    // and nucleus still authenticates it. This is what refused "Onayla".
    const expired = token({ sub: 'u-ce', exp: NOW - 1 })
    const req = withHeaders({ cookie: `nucleus_session_token=s-ce; nucleus_access_token=${expired}` })
    expect(await resolveCaller(req, read, base)).toEqual({
      userId: 'u-ce',
      isGod: false,
      roles: ['content manager core team'],
    })
  })

  it('uses a valid access token when it names the session’s own user', async () => {
    const t = token({ sub: 'u-aud', exp: NOW + 60 })
    const req = withHeaders({ cookie: `nucleus_session_token=s-aud; nucleus_access_token=${t}` })
    expect((await resolveCaller(req, read, base))?.userId).toBe('u-aud')
  })

  it('refuses a token for one person riding on another person’s session', async () => {
    // nucleus answers 401 "Access token subject does not match session".
    const t = token({ sub: 'u-ce', exp: NOW + 60 })
    const req = withHeaders({ cookie: `nucleus_session_token=s-aud; nucleus_access_token=${t}` })
    expect(await resolveCaller(req, read, base)).toBeNull()
  })

  it('answers unknown for a session nucleus would refuse, whatever the token says', async () => {
    const t = token({ sub: 'u-ce', exp: NOW + 60 })
    const req = withHeaders({ cookie: `nucleus_session_token=revoked; nucleus_access_token=${t}` })
    expect(await resolveCaller(req, read, base)).toBeNull()
  })

  it('answers unknown without a session cookie in full mode, where nucleus refuses outright', async () => {
    const t = token({ sub: 'u-ce', exp: NOW + 60 })
    const req = withHeaders({ authorization: `Bearer ${t}` })
    expect(await resolveCaller(req, read, base)).toBeNull()
    // Outside full mode the token alone is the credential.
    expect((await resolveCaller(req, read, { ...base, sessionRequired: false }))?.userId).toBe('u-ce')
  })

  it('reads the last session cookie of two', async () => {
    const req = withHeaders({ cookie: 'nucleus_session_token=s-aud; nucleus_session_token=s-ce' })
    expect((await resolveCaller(req, read, base))?.userId).toBe('u-ce')
  })

  it('treats an API key as nobody only when API keys are on', async () => {
    const key = `nk_live_${'a'.repeat(64)}`
    const req = withHeaders({ 'x-api-key': key, cookie: 'nucleus_session_token=s-ce' })
    expect(await resolveCaller(req, read, { ...base, apiKeysEnabled: true })).toBeNull()
    expect((await resolveCaller(req, read, base))?.userId).toBe('u-ce')
  })
})

describe('sessionUserFromDb', () => {
  const NOW_DATE = new Date('2026-10-13T10:00:00Z')
  const live = {
    user_id: 'u1',
    is_active: true,
    revoked_at: null,
    expires_at: new Date('2026-11-01T00:00:00Z'),
    account_active: true,
  }
  const one = (row: Record<string, unknown> | null) => async () => (row ? [row] : [])

  it('names the owner of a live session', async () => {
    expect(await sessionUserFromDb('s1', one(live), NOW_DATE)).toBe('u1')
    expect(await sessionUserFromDb('s1', one({ ...live, expires_at: null }), NOW_DATE)).toBe('u1')
  })

  it('refuses every session nucleus refuses', async () => {
    for (const row of [
      null,
      { ...live, is_active: false },
      { ...live, revoked_at: new Date('2026-10-01T00:00:00Z') },
      { ...live, expires_at: new Date('2026-10-13T09:59:59Z') },
      { ...live, account_active: false },
    ]) {
      expect(await sessionUserFromDb('s1', one(row), NOW_DATE)).toBeNull()
    }
  })

  it('asks by text, so a cookie that is not a uuid cannot make it throw', async () => {
    let seen = ''
    await sessionUserFromDb('not-a-uuid', async (text) => {
      seen = text
      return []
    })
    expect(seen).toContain('s.id::text = $1')
  })
})

describe('carriesCredentials', () => {
  it('sees each thing nucleus authenticates by', () => {
    for (const headers of <Array<Record<string, string>>>[
      { cookie: 'a=1; nucleus_session_token=s1' },
      { cookie: 'nucleus_access_token=t' },
      { authorization: 'Bearer x.y.z' },
      { 'x-api-key': 'nk_live_x' },
    ]) {
      expect(carriesCredentials(withHeaders(headers))).toBe(true)
    }
  })

  it('answers no for a request carrying none of them', () => {
    const none: Array<Record<string, string>> = [
      {},
      { cookie: 'theme=dark' },
      { cookie: 'nucleus_session_token=' },
      { authorization: '  ' },
    ]
    for (const headers of none) {
      expect(carriesCredentials(withHeaders(headers))).toBe(false)
    }
  })
})

describe('who plans, who finishes', () => {
  const as = (roles: string[], isGod = false): Caller => ({ userId: 'u', isGod, roles })

  it('lets Müdür plan but not finish (rows 12, 17, 29)', () => {
    expect(isCentral(as(['manager']))).toBe(true)
    expect(isAdmin(as(['manager']))).toBe(false)
  })

  it('lets Merkez Ekip, Super Admin and the godmin do both', () => {
    for (const caller of [as(['content manager core team']), as(['super admin']), as([], true)]) {
      expect(isCentral(caller)).toBe(true)
      expect(isAdmin(caller)).toBe(true)
    }
    expect(isAdmin(null)).toBe(false)
  })

  it('knows an account whose only 5S role is Auditor', () => {
    expect(isAuditorOnly(as(['auditor']))).toBe(true)
    expect(isAuditorOnly(as(['auditor', 'basic']))).toBe(true)
    for (const caller of [
      as(['auditor', 'field manager']),
      as(['auditor', 'manager']),
      as(['auditor', 'content manager core team']),
      as(['auditor'], true),
      as(['field manager']),
      as([]),
      null,
    ]) {
      expect(isAuditorOnly(caller)).toBe(false)
    }
  })
})
