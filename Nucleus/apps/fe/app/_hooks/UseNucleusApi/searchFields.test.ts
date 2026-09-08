import { describe, expect, it } from 'bun:test'
import { normalizeSearch, searchableColumns, tableOfEndpoint } from './searchFields'

describe('tableOfEndpoint', () => {
  it('reads the table out of a generated list key', () => {
    expect(tableOfEndpoint('GET_FIVE_S_FINDINGS')).toBe('five_s_findings')
    expect(tableOfEndpoint('GET_USERS')).toBe('users')
  })

  it('answers null for a key that is not a list read', () => {
    for (const key of ['ADD_USER', 'LOGIN_V2', 'GET_ME', '']) {
      expect(tableOfEndpoint(key)).not.toBe('users')
    }
  })
})

describe('searchableColumns', () => {
  it('picks the text columns of a real table', () => {
    const cols = searchableColumns('five_s_findings')
    expect(cols).toContain('description')
    expect(cols).toContain('location_name')
    expect(cols.length).toBeGreaterThan(0)
  })

  it('leaves identifiers out — nobody types a uuid into a search box', () => {
    const cols = searchableColumns('five_s_findings')
    expect(cols).not.toContain('id')
    expect(cols.some((c) => c.endsWith('_id'))).toBe(false)
  })

  it('answers empty for a table that is not in the config', () => {
    expect(searchableColumns('boyle_bir_tablo_yok')).toEqual([])
  })
})

describe('normalizeSearch', () => {
  it('attaches the columns a search needs', () => {
    // The server refuses a search with no searchFields, and every screen in
    // this app sent one — so every search box was inert.
    const out = normalizeSearch('GET_FIVE_S_FINDINGS', { search: 'depo' }) as Record<string, unknown>
    expect(typeof out.searchFields).toBe('string')
    expect(String(out.searchFields)).toContain('location_name')
    expect(out.search).toBe('depo')
  })

  it('leaves a caller that named its own fields alone', () => {
    const payload = { search: 'x', searchFields: 'email' }
    expect(normalizeSearch('GET_USERS', payload)).toBe(payload)
  })

  it('ignores a payload with no search, or an empty one', () => {
    for (const payload of [{ page: 1 }, { search: '' }, { search: '   ' }]) {
      expect(normalizeSearch('GET_USERS', payload)).toBe(payload)
    }
  })

  it('drops the term when the table has nothing searchable, rather than sending a request the server refuses', () => {
    const out = normalizeSearch('GET_BOYLE_BIR_TABLO_YOK', { search: 'x', page: 1 }) as Record<string, unknown>
    expect(out.search).toBeUndefined()
    expect(out.page).toBe(1)
  })

  it('does not touch a non-list endpoint', () => {
    const payload = { search: 'x' }
    expect(normalizeSearch('ADD_USER', payload)).toBe(payload)
  })
})

describe('nucleus system tables', () => {
  /*
   * users is not declared in this app's config.json — it is one of nucleus's
   * own tables — so its columns cannot be read from there and the search term
   * was being dropped, leaving the users search box just as inert as before.
   */
  it('knows what the users table can be searched on', () => {
    expect(searchableColumns('users')).toEqual(['email'])
  })

  it('scopes a users search rather than dropping it', () => {
    const out = normalizeSearch('GET_USERS', { search: 'auditor' }) as Record<string, unknown>
    expect(out.search).toBe('auditor')
    expect(out.searchFields).toBe('email')
  })
})

describe('secrets are never searchable', () => {
  /*
   * The users table's other text columns are `password` and
   * `email_verification_token`. A search box over either is an oracle for
   * guessing them a character at a time, so email is the only one offered and
   * the pattern guards every other table too.
   */
  it('offers only email on users', () => {
    expect(searchableColumns('users')).toEqual(['email'])
  })

  it('scopes the system tables to columns that actually exist on them', () => {
    // config.json declares only what THIS app adds — claims lists `mode`
    // alone, which is why searching /claims found nothing.
    expect(searchableColumns('claims')).toContain('action')
    expect(searchableColumns('roles')).toContain('name')
    expect(searchableColumns('audit_logs')).toContain('summary')
  })

  it('never names a secret-ish column for any table', () => {
    for (const table of ['users', 'claims', 'roles', 'audit_logs', 'five_s_findings']) {
      for (const col of searchableColumns(table)) {
        expect(col).not.toMatch(/pass|secret|token|hash|salt/i)
      }
    }
  })
})
