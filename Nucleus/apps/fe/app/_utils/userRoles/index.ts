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
