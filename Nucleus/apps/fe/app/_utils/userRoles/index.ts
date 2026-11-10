import {
  BY_ID,
  isAbortError,
  readAllPages,
  readByIds,
  type ListRow,
  type PageStarter,
} from '@/app/_utils/readAllPages'

/** What a user row needs for roles to be attached to it. */
type Identified = { id?: string | number | null }

type RoleName = { name: string }

type WithRoles<T> = T & { roles: RoleName[] }

/** A whole list read: every row, or the error of the page that failed. */
type Read = { ok: true; rows: ListRow[] } | { ok: false; error: object }

type Failure = Extract<Read, { ok: false }>

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
 * with no roles and `onReadFailed` says so; half a table is never used. A read
 * the browser cancelled (navigating away) is not a failure and says nothing.
 */
export async function attachRoles<T extends Identified>(
  users: T[],
  startRoles: PageStarter | null | undefined,
  startUserRoles: PageStarter | null | undefined,
  onReadFailed?: () => void
): Promise<WithRoles<T>[]> {
  const withNone = users.map((u): WithRoles<T> => ({ ...u, roles: [] }))
  if (!startRoles || !startUserRoles || users.length === 0) return withNone

  const read = await roleNamesByUser(startRoles, startUserRoles)
  if (!read.ok) {
    if (!isAbortError(read.error)) onReadFailed?.()
    return withNone
  }

  return users.map((u): WithRoles<T> => ({
    ...u,
    roles: (read.byUser.get(String(u.id ?? '')) ?? []).map((name) => ({ name })),
  }))
}

/** Every row of a list, page by page; the error when any page failed. */
function readEvery(start: PageStarter): Promise<Read> {
  return new Promise((resolve) => {
    readAllPages({
      start,
      payload: { sort: BY_ID },
      onDone: (rows) => resolve({ ok: true, rows }),
      onError: (error) => resolve({ ok: false, error }),
    })
  })
}

/** Every row whose `field` is one of `ids`, page by page; the error when any read failed. */
function readEveryByIds(start: PageStarter, field: string, ids: readonly string[]): Promise<Read> {
  return new Promise((resolve) => {
    readByIds({
      start,
      field,
      ids,
      onDone: (rows) => resolve({ ok: true, rows }),
      onError: (error) => resolve({ ok: false, error }),
    })
  })
}

/** Of two reads, one already failed: report the other's failure instead when this one was only cancelled. */
function reported(failed: Failure, other: Read): Failure {
  return isAbortError(failed.error) && !other.ok ? other : failed
}

export type RoleNamesRead = { ok: true; byUser: Map<string, string[]> } | Failure

/**
 * Each user id with the names of their roles, from `/userRoles` and `/roles`,
 * every page of both. Not `ok` when either read failed, with the error, so the
 * caller can tell a cancelled request from a broken one.
 */
export async function roleNamesByUser(startRoles: PageStarter, startUserRoles: PageStarter): Promise<RoleNamesRead> {
  const [roleRead, userRoleRead] = await Promise.all([readEvery(startRoles), readEvery(startUserRoles)])
  if (!roleRead.ok) return reported(roleRead, userRoleRead)
  if (!userRoleRead.ok) return userRoleRead

  const nameById = new Map<string, string>()
  for (const r of roleRead.rows) {
    const id = String(r.id ?? '')
    const name = String(r.name ?? '')
    if (id && name) nameById.set(id, name)
  }

  const byUser = new Map<string, string[]>()
  for (const ur of userRoleRead.rows) {
    const uid = String(ur.userId ?? ur.user_id ?? '')
    const rid = String(ur.roleId ?? ur.role_id ?? '')
    const name = nameById.get(rid)
    if (!uid || !name) continue
    byUser.set(uid, [...(byUser.get(uid) ?? []), name])
  }
  return { ok: true, byUser }
}

/** The role ids whose name matches, case- and space-insensitively. */
export function roleIdsNamed(roleRows: ListRow[], wanted: string): string[] {
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
export function userIdsForRoles(userRoleRows: ListRow[], roleIds: string[]): string[] {
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
 *
 * The rows are untyped lists; `parse` turns each user row into the shape the
 * screen holds, so the caller states its type instead of casting it.
 */
export async function usersWithRole<T>(
  roleName: string,
  starts: {
    roles?: PageStarter
    userRoles?: PageStarter
    users?: PageStarter
  },
  parse: (row: ListRow) => T
): Promise<T[]> {
  const { roles, userRoles, users } = starts
  if (!roles || !userRoles || !users) return []

  const roleRead = await readEvery(roles)
  if (!roleRead.ok) return []
  const roleIds = roleIdsNamed(roleRead.rows, roleName)
  if (roleIds.length === 0) return []

  const assignments = await readEveryByIds(userRoles, 'role_id', roleIds)
  if (!assignments.ok) return []
  const userIds = userIdsForRoles(assignments.rows, roleIds)
  if (userIds.length === 0) return []

  const userRead = await readEveryByIds(users, 'id', userIds)
  return userRead.ok ? userRead.rows.map(parse) : []
}
