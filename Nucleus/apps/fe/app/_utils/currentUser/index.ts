/**
 * Who the signed-in user is, read the same way everywhere.
 *
 * Several screens decided "may this person do X" from role NAMES alone and
 * never looked at the install's root account. godmin's power comes from the
 * `is_god` flag on its own row (or a role literally named "godmin"); a gate
 * that only reads role names leaves it out. Measured: godmin could not open a
 * single finding while a Merkez Ekip account could (Notlar 07.10, satır 26).
 *
 * The definition matches the server's own (nucleus requireGodmin): the flag,
 * or a role named exactly "godmin". /auth/me arrives either flat or wrapped
 * in `data`, with the flag on the user and the roles beside it.
 */
type GodFlags = { is_god?: unknown; isGod?: unknown }

export function isGodminUser(user: unknown): boolean {
  if (!user || typeof user !== 'object') return false
  const envelope = user as { data?: unknown }
  const me = (envelope.data ?? user) as GodFlags & { user?: GodFlags; roles?: unknown }
  const flags = [me, me.user].filter(Boolean) as GodFlags[]
  if (flags.some((f) => f.is_god === true || f.isGod === true)) return true
  return (
    Array.isArray(me.roles) &&
    me.roles.some((role) => (role as { name?: unknown } | null)?.name === 'godmin')
  )
}

/** The signed-in user's id, wherever /auth/me put it. */
export function currentUserIdOf(user: unknown): string {
  if (!user || typeof user !== 'object') return ''
  const envelope = user as { data?: unknown }
  const me = (envelope.data ?? user) as { id?: unknown; user?: { id?: unknown } }
  return String(me.user?.id ?? me.id ?? '')
}
