import { describe, expect, it } from 'bun:test'
import { LIST_PAGE_SIZE } from '@/app/_utils/readAllPages'
import { attachRoles, roleNamesByUser, usersWithRole } from './index'

type Row = Record<string, string | boolean>
type Condition = { field: string; operator: string; value: readonly string[] }
type Request = {
  payload: { page: number; limit: number; filters?: readonly Condition[] }
  onAfterHandle?: (data: object) => void
  onErrorHandle?: (error: object) => void
}

/** A table the way nucleus serves it: filtered, sorted by id, 200 rows a page at most. */
function serve(table: Row[], asked: Request['payload'][] = []) {
  return (request: Request): void => {
    const { payload } = request
    asked.push(payload)
    const matching = table
      .filter((row) => (payload.filters ?? []).every((c) => c.value.includes(String(row[c.field]))))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    const size = Math.min(payload.limit, LIST_PAGE_SIZE)
    const items = matching.slice((payload.page - 1) * size, payload.page * size)
    request.onAfterHandle?.({ data: { data: items, pagination: { hasNext: payload.page * size < matching.length } } })
  }
}

const refuse = (request: Request): void => request.onErrorHandle?.(new Error('refused'))

const roles: Row[] = [
  { id: 'r-aud', name: 'Auditor', alias: 'Denetçi' },
  { id: 'r-mgr', name: 'Manager', alias: 'Müdür' },
]

/** 450 auditors, then the one whose assignment is the last row of the table. */
const crowded: Row[] = [
  ...Array.from({ length: 450 }, (_, i) => ({ id: `a-${String(i).padStart(4, '0')}`, user_id: `u-${i}`, role_id: 'r-aud' })),
  { id: 'z-last', user_id: 'u-late', role_id: 'r-mgr' },
]

describe('attachRoles', () => {
  it('gives a user past the 200th user_roles row their roles, not an empty list', async () => {
    const users = [{ id: 'u-0' }, { id: 'u-449' }, { id: 'u-late' }]
    const out = await attachRoles(users, serve(roles), serve(crowded))
    expect(out.map((u) => u.roles.map((r) => r.name))).toEqual([['Auditor'], ['Auditor'], ['Manager']])
  })

  it('reads every page of both tables', async () => {
    const roleReads: Request['payload'][] = []
    const assignmentReads: Request['payload'][] = []
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
    const second = (request: Request): void => {
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
    const byUser = await roleNamesByUser(
      serve(roles),
      serve([
        { id: '1', user_id: 'u1', role_id: 'r-aud' },
        { id: '2', user_id: 'u1', role_id: 'r-mgr' },
        { id: '3', user_id: 'u2', role_id: 'r-gone' },
      ])
    )
    expect(byUser?.get('u1')).toEqual(['Auditor', 'Manager'])
    expect(byUser?.has('u2')).toBe(false)
  })

  it('is null when either table could not be read', async () => {
    expect(await roleNamesByUser(refuse, serve(crowded))).toBeNull()
    expect(await roleNamesByUser(serve(roles), refuse)).toBeNull()
  })
})

describe('usersWithRole', () => {
  it('finds every holder of the role, even when they are more than one page', async () => {
    const managers: Row[] = Array.from({ length: 230 }, (_, i) => ({
      id: `m-${String(i).padStart(4, '0')}`,
      user_id: `u-m${i}`,
      role_id: 'r-mgr',
    }))
    const people: Row[] = [
      ...managers.map((m) => ({ id: String(m.user_id), name: `Müdür ${m.user_id}` })),
      { id: 'u-late', name: 'Müdür Geç' },
      { id: 'u-other', name: 'Denetçi' },
    ]
    const found = await usersWithRole('Manager', {
      roles: serve(roles),
      userRoles: serve([...crowded, ...managers]),
      users: serve(people),
    })
    expect(found).toHaveLength(231)
    expect(found.some((u) => u.id === 'u-m229')).toBe(true)
    expect(found.some((u) => u.id === 'u-other')).toBe(false)
  })

  it('is empty when the role is not there, and when any read fails', async () => {
    const users = serve([{ id: 'u-late', name: 'Müdür' }])
    expect(await usersWithRole('Yok Böyle Bir Rol', { roles: serve(roles), userRoles: serve(crowded), users })).toEqual([])
    expect(await usersWithRole('Manager', { roles: refuse, userRoles: serve(crowded), users })).toEqual([])
    expect(await usersWithRole('Manager', { roles: serve(roles), userRoles: refuse, users })).toEqual([])
    expect(await usersWithRole('Manager', { roles: serve(roles), userRoles: serve(crowded), users: refuse })).toEqual([])
  })

  it('reads only the assignments of the role and then only those users', async () => {
    const assignmentReads: Request['payload'][] = []
    const userReads: Request['payload'][] = []
    const found = await usersWithRole('Müdür', {
      roles: serve(roles),
      userRoles: serve(crowded, assignmentReads),
      users: serve([{ id: 'u-late', name: 'Müdür' }, { id: 'u-0', name: 'Denetçi' }], userReads),
    })
    expect(found.map((u) => u.id)).toEqual(['u-late'])
    expect(assignmentReads[0]?.filters).toEqual([{ field: 'role_id', operator: 'in', value: ['r-mgr'] }])
    expect(userReads[0]?.filters).toEqual([{ field: 'id', operator: 'in', value: ['u-late'] }])
  })
})
