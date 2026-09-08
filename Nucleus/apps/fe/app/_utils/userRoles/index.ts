type Dict = Record<string, unknown>

type Starter = (args: {
  // biome-ignore lint/suspicious/noExplicitAny: the generated actions are per-endpoint
  payload: any
  // biome-ignore lint/suspicious/noExplicitAny: the translated body is per-screen
  onAfterHandle?: (data: any) => void
  // biome-ignore lint/suspicious/noExplicitAny: refusals come through untranslated
  onErrorHandle?: (error: any) => void
}) => void

/**
 * Roles for a list of users.
 *
 * /users does not return them — not even with `with=roles`, which answers
 * null — and several screens decide what to show from `user.roles`. With it
 * absent they decide from nothing: the teams tab offered every user as an
 * auditor, and the board-decisions form showed "Manager rolü olan kullanıcı
 * yok" and could not be submitted at all, on an install where a Manager
 * account exists.
 *
 * The mapping lives in its own tables, so it is read from there: /userRoles
 * for user-to-role and /roles for the names.
 */
export async function attachRoles<T extends Dict>(
  users: T[],
  startRoles: Starter | undefined,
  startUserRoles: Starter | undefined,
  extract: (response: unknown) => Dict[]
): Promise<Array<T & { roles: Array<{ name: string }> }>> {
  const withNone = users.map((u) => ({ ...u, roles: [] as Array<{ name: string }> }))
  if (!startRoles || !startUserRoles || users.length === 0) return withNone

  const read = (start: Starter, payload: unknown) =>
    new Promise<Dict[]>((resolve) => {
      start({
        payload,
        onAfterHandle: (r: unknown) => resolve(extract(r)),
        onErrorHandle: () => resolve([]),
      })
    })

  const [roleRows, userRoleRows] = await Promise.all([
    read(startRoles, { page: 1, limit: 200 }),
    read(startUserRoles, { page: 1, limit: 2000 }),
  ])

  const nameById = new Map<string, string>()
  for (const r of roleRows) {
    const id = String(r.id ?? '')
    const name = String(r.name ?? '')
    if (id && name) nameById.set(id, name)
  }

  const byUser = new Map<string, string[]>()
  for (const ur of userRoleRows) {
    const uid = String(ur.userId ?? ur.user_id ?? '')
    const rid = String(ur.roleId ?? ur.role_id ?? '')
    const name = nameById.get(rid)
    if (!uid || !name) continue
    byUser.set(uid, [...(byUser.get(uid) ?? []), name])
  }

  return users.map((u) => ({
    ...u,
    roles: (byUser.get(String(u.id ?? '')) ?? []).map((name) => ({ name })),
  }))
}

/** The role ids whose name matches, case- and space-insensitively. */
export function roleIdsNamed(roleRows: Dict[], wanted: string): string[] {
  const want = wanted.toLocaleLowerCase('tr').trim()
  const out: string[] = []
  for (const r of roleRows) {
    const id = String(r.id ?? '')
    // A role carries both a name and an alias; either may be what the screen
    // knows it by ("Manager" vs "Müdür").
    const names = [r.name, r.alias].map((v) => String(v ?? '').toLocaleLowerCase('tr').trim())
    if (id && names.includes(want)) out.push(id)
  }
  return out
}

/** The user ids assigned to any of these roles. */
export function userIdsForRoles(userRoleRows: Dict[], roleIds: string[]): string[] {
  const wanted = new Set(roleIds)
  const out = new Set<string>()
  for (const ur of userRoleRows) {
    const rid = String(ur.roleId ?? ur.role_id ?? '')
    const uid = String(ur.userId ?? ur.user_id ?? '')
    if (uid && wanted.has(rid)) out.add(uid)
  }
  return [...out]
}

/**
 * The users who hold a role, asked for rather than filtered out.
 *
 * A screen that needs "the managers" used to pull every user and scan them in
 * the browser — which cannot work, because /users returns no roles at all: the
 * scan matched nothing on every install and the dropdown was permanently
 * empty. Reading the whole user table to keep six rows would also be wrong on
 * a plant with a thousand employees.
 *
 * Each of the three reads is narrowed by the server: the role by name, the
 * assignments by role id, the users by id.
 */
export async function usersWithRole<T extends Dict>(
  roleName: string,
  starts: {
    roles?: Starter
    userRoles?: Starter
    users?: Starter
  },
  extract: (response: unknown) => Dict[]
): Promise<T[]> {
  const { roles, userRoles, users } = starts
  if (!roles || !userRoles || !users) return []

  const read = (start: Starter, payload: unknown) =>
    new Promise<Dict[]>((resolve) => {
      start({
        payload,
        onAfterHandle: (r: unknown) => resolve(extract(r)),
        onErrorHandle: () => resolve([]),
      })
    })

  const roleRows = await read(roles, { page: 1, limit: 200 })
  const roleIds = roleIdsNamed(roleRows, roleName)
  if (roleIds.length === 0) return []

  const assignments = await read(userRoles, {
    page: 1,
    limit: 500,
    filters: { role_id: roleIds },
  })
  const userIds = userIdsForRoles(assignments, roleIds)
  if (userIds.length === 0) return []

  const rows = await read(users, { page: 1, limit: 500, filters: { id: userIds } })
  return rows as T[]
}
