import { BY_ID, readAllPages, readByIds } from '@/app/_utils/readAllPages'

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
 *
 * Both tables are read page by page: a list read gives 200 rows at most
 * whatever `limit` says, so one read of `user_roles` left every user past the
 * 200th assignment with an empty list. When a read fails the users come back
 * with no roles and `onReadFailed` says so; half a table is never used.
 */
export async function attachRoles<T extends Dict>(
  users: T[],
  startRoles: Starter | null | undefined,
  startUserRoles: Starter | null | undefined,
  onReadFailed?: () => void
): Promise<Array<T & { roles: Array<{ name: string }> }>> {
  const withNone = users.map((u) => ({ ...u, roles: [] as Array<{ name: string }> }))
  if (!startRoles || !startUserRoles || users.length === 0) return withNone

  const byUser = await roleNamesByUser(startRoles, startUserRoles)
  if (!byUser) {
    onReadFailed?.()
    return withNone
  }

  return users.map((u) => ({
    ...u,
    roles: (byUser.get(String(u.id ?? '')) ?? []).map((name) => ({ name })),
  }))
}

/** Every row of a list, page by page; `null` when any page failed. */
function readEvery(start: Starter): Promise<Dict[] | null> {
  return new Promise((resolve) => {
    readAllPages({
      start,
      payload: { sort: BY_ID },
      onDone: (rows) => resolve(rows),
      onError: () => resolve(null),
    })
  })
}

/** Every row whose `field` is one of `ids`, page by page; `null` when any read failed. */
function readEveryByIds(start: Starter, field: string, ids: readonly string[]): Promise<Dict[] | null> {
  return new Promise((resolve) => {
    readByIds({ start, field, ids, onDone: (rows) => resolve(rows), onError: () => resolve(null) })
  })
}

/**
 * Each user id with the names of their roles, from `/userRoles` and `/roles`,
 * every page of both. `null` when either read failed.
 */
export async function roleNamesByUser(startRoles: Starter, startUserRoles: Starter): Promise<Map<string, string[]> | null> {
  const [roleRows, userRoleRows] = await Promise.all([readEvery(startRoles), readEvery(startUserRoles)])
  if (!roleRows || !userRoleRows) return null

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
  return byUser
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
 * assignments by role id, the users by id. Each is read page by page, since a
 * list read gives 200 rows at most whatever `limit` says; a failed read
 * answers nobody rather than a part of them.
 */
export async function usersWithRole<T extends Dict>(
  roleName: string,
  starts: {
    roles?: Starter
    userRoles?: Starter
    users?: Starter
  }
): Promise<T[]> {
  const { roles, userRoles, users } = starts
  if (!roles || !userRoles || !users) return []

  const roleRows = await readEvery(roles)
  if (!roleRows) return []
  const roleIds = roleIdsNamed(roleRows, roleName)
  if (roleIds.length === 0) return []

  const assignments = await readEveryByIds(userRoles, 'role_id', roleIds)
  if (!assignments) return []
  const userIds = userIdsForRoles(assignments, roleIds)
  if (userIds.length === 0) return []

  const rows = await readEveryByIds(users, 'id', userIds)
  return rows ? (rows as T[]) : []
}
