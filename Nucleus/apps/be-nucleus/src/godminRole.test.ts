import { describe, expect, it } from 'bun:test'
import { GODMIN_ROLE_GRANT_SQL, grantGodminRole } from './godminRole'

describe('the godmin role for every is_god account (R27)', () => {
  it('reports how many accounts were given the role', async () => {
    expect(await grantGodminRole(async () => [{ id: 'a' }, { id: 'b' }])).toBe(2)
    expect(await grantGodminRole(async () => [])).toBe(0)
  })

  it('runs one statement and no parameters, so a second boot repeats it harmlessly', async () => {
    const seen: Array<{ text: string; params: unknown[] | undefined }> = []
    await grantGodminRole(async (text, params) => {
      seen.push({ text, params })
      return []
    })
    expect(seen).toHaveLength(1)
    expect(seen[0]?.text).toBe(GODMIN_ROLE_GRANT_SQL)
    expect(seen[0]?.params).toBeUndefined()
  })

  it('only reaches flagged accounts, only the godmin role, and never one that has a row already', () => {
    const sql = GODMIN_ROLE_GRANT_SQL.replace(/\s+/g, ' ')
    expect(sql).toContain("r.name = 'godmin'")
    expect(sql).toContain('u.is_god = true')
    expect(sql).toContain('not exists (select 1 from main.user_roles ur where ur.user_id = u.id and ur.role_id = r.id)')
    expect(sql).toContain('insert into main.user_roles (user_id, role_id)')
  })

  it('does not swallow a failure: boot logs it and goes on', async () => {
    await expect(
      grantGodminRole(async () => {
        throw new Error('relation does not exist')
      })
    ).rejects.toThrow('relation does not exist')
  })
})
