import { describe, expect, it } from 'bun:test'
import { isAbortError, type ListRow, type PageRequest, type PageStarter } from '@/app/_utils/readAllPages'
import { attachRoles, roleNamesByUser, usersWithRole } from './index'
import { crowded, refuse, roles, serve } from './roleFixtures'

describe('attachRoles', () => {
  it('gives a user past the 200th user_roles row their roles, not an empty list', async () => {
    const users = [{ id: 'u-0' }, { id: 'u-449' }, { id: 'u-late' }]
    const out = await attachRoles(users, serve(roles), serve(crowded))
    expect(out.map((u) => u.roles.map((r) => r.name))).toEqual([['Auditor'], ['Auditor'], ['Manager']])
  })

  it('reads every page of both tables', async () => {
    const roleReads: PageRequest['payload'][] = []
    const assignmentReads: PageRequest['payload'][] = []
    await attachRoles([{ id: 'u-0' }], serve(roles, roleReads), serve(crowded, assignmentReads))
    expect(roleReads).toHaveLength(1)
    expect(assignmentReads.map((p) => p.page)).toEqual([1, 2, 3])
  })

  it('returns the users with no roles, and says so once, when a read fails', async () => {
    let said = 0
    const out = await attachRoles([{ id: 'u-0' }], serve(roles), refuse, () => {
      said += 1
    })
    expect(out).toEqual([{ id: 'u-0', roles: [] }])
    expect(said).toBe(1)
  })

  it('does not use half a table: a page that fails after the first gives nobody a role', async () => {
    let page = 0
    const second: PageStarter = (request) => {
      page += 1
      if (page === 1) serve(crowded)(request)
      else refuse(request)
    }
    let said = 0
    const out = await attachRoles([{ id: 'u-0' }], serve(roles), second, () => {
      said += 1
    })
    expect(out[0]?.roles).toEqual([])
    expect(said).toBe(1)
  })

  it('answers with no roles and no complaint when an action is missing or there is nobody to read for', async () => {
    let said = 0
    const onReadFailed = () => {
      said += 1
    }
    expect(await attachRoles([{ id: 'u-0' }], null, serve(crowded), onReadFailed)).toEqual([{ id: 'u-0', roles: [] }])
    expect(await attachRoles([], serve(roles), serve(crowded), onReadFailed)).toEqual([])
    expect(said).toBe(0)
  })
})

describe('roleNamesByUser', () => {
  it('maps each user to the names of their roles, accepting both spellings of the keys', async () => {
    const read = await roleNamesByUser(
      serve(roles),
      serve([
        { id: '1', user_id: 'u1', role_id: 'r-aud' },
        { id: '2', user_id: 'u1', role_id: 'r-mgr' },
        { id: '3', user_id: 'u2', role_id: 'r-gone' },
      ])
    )
    const byUser = read.ok ? read.byUser : null
    expect(byUser?.get('u1')).toEqual(['Auditor', 'Manager'])
    expect(byUser?.has('u2')).toBe(false)
  })

  it('is not ok when either table could not be read, with the error', async () => {
    const roleFailure = await roleNamesByUser(refuse, serve(crowded))
    const assignmentFailure = await roleNamesByUser(serve(roles), refuse)
    expect(roleFailure.ok).toBe(false)
    expect(assignmentFailure.ok).toBe(false)
    if (!roleFailure.ok) expect(isAbortError(roleFailure.error)).toBe(false)
  })
})

describe('usersWithRole', () => {
  it('finds every holder of the role, even when they are more than one page', async () => {
    const managers: ListRow[] = Array.from({ length: 230 }, (_, i) => ({
      id: `m-${String(i).padStart(4, '0')}`,
      user_id: `u-m${i}`,
      role_id: 'r-mgr',
    }))
    const people: ListRow[] = [
      ...managers.map((m) => ({ id: String(m.user_id), name: `Müdür ${m.user_id}` })),
      { id: 'u-late', name: 'Müdür Geç' },
      { id: 'u-other', name: 'Denetçi' },
    ]
    const found = await usersWithRole(
      'Manager',
      { roles: serve(roles), userRoles: serve([...crowded, ...managers]), users: serve(people) },
      (row) => row
    )
    expect(found).toHaveLength(231)
    expect(found.some((u) => u.id === 'u-m229')).toBe(true)
    expect(found.some((u) => u.id === 'u-other')).toBe(false)
  })

  it('is empty when the role is not there, and when any read fails', async () => {
    const users = serve([{ id: 'u-late', name: 'Müdür' }])
    const same = (row: ListRow) => row
    expect(await usersWithRole('Yok Böyle Bir Rol', { roles: serve(roles), userRoles: serve(crowded), users }, same)).toEqual([])
    expect(await usersWithRole('Manager', { roles: refuse, userRoles: serve(crowded), users }, same)).toEqual([])
    expect(await usersWithRole('Manager', { roles: serve(roles), userRoles: refuse, users }, same)).toEqual([])
    expect(await usersWithRole('Manager', { roles: serve(roles), userRoles: serve(crowded), users: refuse }, same)).toEqual([])
  })

  it('reads only the assignments of the role and then only those users', async () => {
    const assignmentReads: PageRequest['payload'][] = []
    const userReads: PageRequest['payload'][] = []
    const found = await usersWithRole(
      'Müdür',
      {
        roles: serve(roles),
        userRoles: serve(crowded, assignmentReads),
        users: serve([{ id: 'u-late', name: 'Müdür' }, { id: 'u-0', name: 'Denetçi' }], userReads),
      },
      (row) => row
    )
    expect(found.map((u) => u.id)).toEqual(['u-late'])
    expect(assignmentReads[0]?.filters).toEqual([{ field: 'role_id', operator: 'in', value: ['r-mgr'] }])
    expect(userReads[0]?.filters).toEqual([{ field: 'id', operator: 'in', value: ['u-late'] }])
  })

  it('hands every row to the parse function and returns what it makes', async () => {
    const found = await usersWithRole(
      'Müdür',
      { roles: serve(roles), userRoles: serve(crowded), users: serve([{ id: 'u-late', name: 'Müdür Geç' }]) },
      (row) => ({ id: String(row.id), label: `${row.name} (Manager)` })
    )
    expect(found).toEqual([{ id: 'u-late', label: 'Müdür Geç (Manager)' }])
  })
})
