import { Type as t } from '@sinclair/typebox'
import { type AnyRoute, defineRoute, type RouteGroup } from 'nucleus-core-ts/server'
import config from '../../config.json'
import { query } from '../db'
import { type Caller, callerById, isAdmin } from '../guards/caller'

/**
 * Biltim's own endpoints that are not reports.
 *
 * These run AFTER nucleus's auth middleware, so `x-user-id` here is the
 * authenticated caller (the inbound guard strips any copy a client sent).
 * nucleus checks who is logged in; what that person may do on these routes is
 * decided here, from their roles.
 */

type Ctx = { request: Request; set: { status?: number | string } }

function fail(ctx: Ctx, status: number, message: string) {
  ctx.set.status = status
  return { success: false, isSuccess: false, message, errors: [{ message }] }
}

async function callerOf(ctx: Ctx): Promise<Caller | null> {
  const id = ctx.request.headers.get('x-user-id')
  return id ? callerById(id) : null
}

/* ───────────────────────── scope ───────────────────────── */

/**
 * Where this person stands in the 5S programme: their teams and the locations
 * they answer for.
 *
 * The home page and the findings register showed a field manager everything
 * and filtered in the browser, so the counts on the tabs were the plant's and
 * the rows were theirs (#23), and the findings register showed every
 * location's findings (#7/#24). The screens now ask the server for exactly
 * these rows, and this is where they learn which.
 *
 * `field_manager_user_ids` is jsonb, which the generic list filters cannot
 * search; that is why this is one query here rather than a filter there.
 */
const myScope = defineRoute({
  method: 'GET',
  path: '/me/scope',
  detail: { tags: ['Biltim'], summary: "The caller's teams and locations" },
  handler: async (ctx) => {
    const caller = await callerOf(ctx)
    if (!caller) return fail(ctx, 401, 'Oturum bulunamadı.')

    const [teams, locations] = await Promise.all([
      query(
        `select t.id from main.five_s_audit_teams t
          where t.leader_user_id = $1
         union
         select m.team_id from main.five_s_audit_team_members m
          where m.user_id = $1 and coalesce(m.is_active, true)`,
        [caller.userId]
      ),
      query(
        `select l.id, l.name,
                (l.manager_user_id = $1) as is_manager,
                coalesce(l.field_manager_user_ids, '[]'::jsonb) ? $1::text as is_field_manager
           from main.five_s_locations l
          where l.manager_user_id = $1
             or coalesce(l.field_manager_user_ids, '[]'::jsonb) ? $1::text`,
        [caller.userId]
      ),
    ])

    const fieldManaged = locations.filter((l) => l.is_field_manager === true)
    return {
      success: true,
      data: {
        userId: caller.userId,
        isGod: caller.isGod,
        roles: caller.roles,
        teamIds: teams.map((r) => String(r.id)),
        locationIds: locations.map((l) => String(l.id)),
        locationNames: locations.map((l) => String(l.name ?? '')),
        fieldManagerLocationIds: fieldManaged.map((l) => String(l.id)),
        fieldManagerLocationNames: fieldManaged.map((l) => String(l.name ?? '')),
      },
    }
  },
})

/* ───────────────────────── users ───────────────────────── */

/*
 * Account administration for Merkez Ekip (#20/#21).
 *
 * nucleus 0.10.115 serves create / hard-delete / lock / unlock / set-password,
 * and puts every one of them behind the godmin — create-user also refuses to
 * hand out a role the caller does not hold. So Merkez Ekip, whose job this is,
 * could open the users screen and do nothing on it, and every new auditor had
 * to wait for the godmin account.
 *
 * These do what those do, with the same effects, for Merkez Ekip, Super Admin
 * and the godmin. What they will not do: touch a godmin account, or hand out
 * the godmin role — and, below the godmin, nobody acts above their own rank
 * (see `roleRank`).
 */

/* ───────────────────────── rank ───────────────────────── */

/**
 * Who outranks whom on the users screen: godmin > Super Admin > Merkez Ekip
 * (Content Manager Core Team) > everyone else.
 *
 * Without it, "is an admin" was the whole check, so a Merkez Ekip account
 * could set a Super Admin's password, lock or delete them, and create a new
 * account WITH the Super Admin role — every step a way up. A role this list
 * does not name ranks with the plant roles (Manager, Field Manager, Auditor):
 * below Merkez Ekip.
 */
const RANK: Record<string, number> = {
  godmin: 3,
  'super admin': 2,
  'content manager core team': 1,
}
const GODMIN_RANK = RANK.godmin as number

type Ranked = { isGod: boolean; roles: string[] }

export function roleRank(name: unknown): number {
  return RANK[String(name ?? '').trim().toLowerCase()] ?? 0
}

/** The highest rank among someone's roles; the godmin flag alone is enough. */
export function highestRank(who: Ranked): number {
  if (who.isGod) return GODMIN_RANK
  return who.roles.reduce((max, r) => Math.max(max, roleRank(r)), 0)
}

/**
 * May this caller hand out this role? The godmin may hand out anything. Anyone
 * else: never the godmin role; otherwise a role they hold themselves, or one
 * ranked below their highest — so Super Admin only comes from a Super Admin.
 */
export function mayAssignRole(caller: Ranked, roleName: unknown): boolean {
  if (caller.isGod) return true
  const name = String(roleName ?? '').trim().toLowerCase()
  if (name === 'godmin') return false
  if (caller.roles.some((r) => r.trim().toLowerCase() === name)) return true
  return roleRank(name) < highestRank(caller)
}

/**
 * May this caller change this account? Only when the account's highest role
 * does not outrank the caller's — a peer yes, a superior no.
 */
export function mayTarget(caller: Ranked, target: Ranked): boolean {
  if (caller.isGod) return true
  return highestRank(target) <= highestRank(caller)
}

type Policy = {
  minLength?: number
  requireUppercase?: boolean
  requireLowercase?: boolean
  requireNumber?: boolean
  requireSpecialChar?: boolean
}
const POLICY: Policy =
  (config as { authentication?: { passwordPolicy?: Policy } }).authentication?.passwordPolicy ?? {}

/** The install's own rule (config.json), in the words the screen uses. */
export function passwordProblems(password: string, policy: Policy = POLICY): string[] {
  const problems: string[] = []
  const min = Math.max(8, policy.minLength ?? 8)
  if (password.length < min) problems.push(`Şifre en az ${min} karakter olmalı.`)
  if (password.length > 128) problems.push('Şifre en fazla 128 karakter olabilir.')
  if (policy.requireUppercase && !/[A-ZÇĞİÖŞÜ]/.test(password))
    problems.push('Şifrede en az bir büyük harf olmalı.')
  if (policy.requireLowercase && !/[a-zçğıöşü]/.test(password))
    problems.push('Şifrede en az bir küçük harf olmalı.')
  if (policy.requireNumber && !/[0-9]/.test(password)) problems.push('Şifrede en az bir rakam olmalı.')
  if (policy.requireSpecialChar && !/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]/.test(password))
    problems.push('Şifrede en az bir özel karakter olmalı.')
  return problems
}

const hash = (password: string) => Bun.password.hash(password, { algorithm: 'bcrypt', cost: 10 })

/**
 * A user id in the one spelling Postgres prints a uuid in: trimmed,
 * lower-case, hyphenated (braces and missing hyphens are accepted the way
 * uuid_in accepts them). Anything that is not a uuid comes back trimmed and
 * lower-cased.
 */
export function canonicalUserId(value: unknown): string {
  const text = String(value ?? '').trim().toLowerCase()
  const hex = text.replace(/^\{(.*)\}$/, '$1').replace(/-/g, '')
  if (!/^[0-9a-f]{32}$/.test(hex)) return text
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * "Is this the caller's own account?" The body's userId used to be compared
 * raw, while targetOf trims it before looking the account up, so " <own id>"
 * passed the check and then resolved to the caller's own row. The checks now
 * compare the id targetOf resolved, through this, in one spelling.
 */
export function isSameUser(a: unknown, b: unknown): boolean {
  const left = canonicalUserId(a)
  return left !== '' && left === canonicalUserId(b)
}

type Target = {
  id: string
  email: string
  isLocked: boolean
  firstName: string
  lastName: string
  /** Lower-cased role names, as `Caller.roles`. */
  roles: string[]
}

/**
 * The target account, refused when it does not exist, is the godmin's, or
 * outranks the caller. Also carries what the audit row records about it.
 */
async function targetOf(
  ctx: Ctx,
  caller: Caller,
  userId: string
): Promise<Target | { error: ReturnType<typeof fail> }> {
  const id = String(userId ?? '').trim()
  if (!id) return { error: fail(ctx, 400, 'Kullanıcı seçilmedi.') }
  // Role names read the way callerById reads the caller's, so both sides of
  // the rank comparison come from the same rows.
  const rows = await query(
    `select u.id, u.email, u.is_god, u.is_locked, p.first_name, p.last_name,
            coalesce((select array_agg(lower(trim(r.name)))
                        from main.user_roles ur join main.roles r on r.id = ur.role_id
                       where ur.user_id = u.id and ur.is_active is not false), '{}'::text[]) as role_names
       from main.users u
       left join main.profiles p on p.user_id = u.id
      where u.id::text = $1`,
    [id]
  )
  const row = rows[0]
  if (!row) return { error: fail(ctx, 404, 'Kullanıcı bulunamadı.') }
  const roles = (Array.isArray(row.role_names) ? row.role_names : []).map((r) => String(r ?? '')).filter(Boolean)
  const isGod = row.is_god === true || roles.includes('godmin')
  if (isGod && !caller.isGod) {
    return { error: fail(ctx, 403, 'Godmin hesabı bu ekrandan değiştirilemez.') }
  }
  if (!mayTarget(caller, { isGod, roles })) {
    return { error: fail(ctx, 403, 'Sizden üst yetkideki bir hesap (ör. Super Admin) bu ekrandan değiştirilemez.') }
  }
  return {
    id: String(row.id),
    email: String(row.email ?? ''),
    isLocked: row.is_locked === true,
    firstName: String(row.first_name ?? ''),
    lastName: String(row.last_name ?? ''),
    roles,
  }
}

/* ───────────────────────── audit ───────────────────────── */

type AdminOperation =
  | 'ADMIN_CREATE_USER'
  | 'ADMIN_HARD_DELETE_USER'
  | 'ADMIN_LOCK_USER'
  | 'ADMIN_UNLOCK_USER'
  | 'ADMIN_SET_USER_PASSWORD'
  | 'ADMIN_ASSIGN_ROLE'
  | 'ADMIN_REVOKE_ROLE'

/**
 * One row in main.audit_logs per account change, the row nucleus's own admin
 * routes write (createUser.ts / hardDeleteUser.ts: entity 'users', the actor
 * in user_id, the account in entity_id, ip and user agent from the request;
 * ADMIN_* is severity high, category admin in nucleus's taxonomy).
 *
 * Doing these here instead of through nucleus took that trail with it: the
 * audit screen showed nothing when an account was created, locked or deleted
 * from the users page. A delete keeps what was removed in old_values — the
 * account itself is gone, so this row is the only record of who it was.
 * Never a password, in any form.
 *
 * The change has already happened when this runs; a row that fails to write
 * is logged, not turned into a failed answer for a change that stands.
 */
async function auditAdmin(
  ctx: Ctx,
  caller: Caller,
  operation: AdminOperation,
  entry: { targetId: string; summary: string; oldValues?: unknown; newValues?: unknown }
): Promise<void> {
  try {
    const headers = ctx.request.headers
    const url = new URL(ctx.request.url)
    await query(
      `insert into main.audit_logs
         (user_id, entity_name, entity_id, operation_type, summary, old_values, new_values,
          ip_address, user_agent, severity, category, occurrence_count, path, query)
       values ($1::uuid, 'users', $2::uuid, $3, $4, $5::jsonb, $6::jsonb, $7, $8, 'high', 'admin', 1, $9, $10)`,
      [
        caller.userId,
        entry.targetId || null,
        operation,
        entry.summary,
        entry.oldValues === undefined ? null : JSON.stringify(entry.oldValues),
        entry.newValues === undefined ? null : JSON.stringify(entry.newValues),
        headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip')?.trim() || 'unknown',
        headers.get('user-agent') || 'unknown',
        url.pathname,
        url.search,
      ]
    )
  } catch (error) {
    console.error(`[biltim/users] audit row for ${operation} on ${entry.targetId} not written:`, error)
  }
}

async function adminOnly(ctx: Ctx): Promise<Caller | ReturnType<typeof fail>> {
  const caller = await callerOf(ctx)
  if (!caller) return fail(ctx, 401, 'Oturum bulunamadı.')
  if (!isAdmin(caller)) {
    return fail(ctx, 403, 'Kullanıcı yönetimi yalnız Merkez Ekip, Super Admin ve godmin içindir.')
  }
  return caller
}

const isCaller = (v: unknown): v is Caller => !!v && typeof v === 'object' && 'userId' in v

/** Sessions end with the password, or with the lock — nucleus does the same. */
const signOut = (userId: string) =>
  query('delete from main.user_sessions where user_id = $1', [userId]).then(
    () => true,
    () => false
  )

/*
 * What the users screen needs to know about rank, from one place Merkez Ekip
 * can read. The screen used to ask GET /roles and GET /user_roles itself —
 * Merkez Ekip holds neither claim, so the role list never loaded (no role
 * could be picked when creating a user) and the account buttons stayed on
 * Super Admin rows that the server would then refuse.
 *
 *   roles       the roles this caller may hand out (mayAssignRole)
 *   protected   accounts this caller may not change (mayTarget)
 */
const userRanks = defineRoute({
  method: 'GET',
  path: '/users/ranks',
  detail: { tags: ['Biltim'], summary: 'Roles the caller may assign and accounts they may not change' },
  handler: async (ctx) => {
    const caller = await adminOnly(ctx)
    if (!isCaller(caller)) return caller
    const [roles, holders] = await Promise.all([
      query(
        'select id, name, alias, description, is_system from main.roles where coalesce(is_active, true) order by name'
      ),
      query(
        `select u.id::text as id, u.is_god,
                coalesce(array_agg(lower(trim(r.name))) filter (where r.name is not null), '{}'::text[]) as role_names
           from main.users u
           left join main.user_roles ur on ur.user_id = u.id and ur.is_active is not false
           left join main.roles r on r.id = ur.role_id
          group by u.id, u.is_god`
      ),
    ])
    return {
      success: true,
      data: {
        roles: roles
          .filter((r) => mayAssignRole(caller, r.name))
          // alias too: the create form's role-pair rule (Saha Sorumlusu +
          // Denetçi, Merkez Ekip + Denetçi) reads it.
          .map((r) => ({
            id: String(r.id),
            name: String(r.name ?? ''),
            alias: r.alias == null ? null : String(r.alias),
            description: r.description == null ? null : String(r.description),
            is_system: r.is_system === true,
          })),
        protected: holders
          .filter(
            (h) =>
              !mayTarget(caller, {
                isGod: h.is_god === true,
                roles: Array.isArray(h.role_names) ? (h.role_names as string[]) : [],
              })
          )
          .map((h) => String(h.id)),
      },
    }
  },
})

const createUser = defineRoute({
  method: 'POST',
  path: '/users',
  body: t.Object({
    email: t.String(),
    password: t.String(),
    firstName: t.Optional(t.String()),
    lastName: t.Optional(t.String()),
    roleIds: t.Optional(t.Array(t.String())),
  }),
  detail: { tags: ['Biltim'], summary: 'Create a user (Merkez Ekip)' },
  handler: async (ctx) => {
    const caller = await adminOnly(ctx)
    if (!isCaller(caller)) return caller

    const email = String(ctx.body.email ?? '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(ctx, 400, 'Geçerli bir e-posta girin.')
    const firstName = String(ctx.body.firstName ?? '').trim()
    const lastName = String(ctx.body.lastName ?? '').trim()
    if (!firstName || !lastName) return fail(ctx, 400, 'Ad ve soyad zorunludur.')

    const problems = passwordProblems(String(ctx.body.password ?? ''))
    if (problems.length > 0) return fail(ctx, 400, problems.join(' '))

    const existing = await query('select 1 from main.users where lower(email) = $1', [email])
    if (existing.length > 0) return fail(ctx, 409, 'Aynı mail adresiyle iki kere kayıt yapılamaz.')

    const roleIds = [...new Set((ctx.body.roleIds ?? []).map(String).filter(Boolean))]
    if (roleIds.length > 0) {
      const roles = await query('select id, name from main.roles where id::text = any($1::text[])', [roleIds])
      if (roles.length !== roleIds.length) return fail(ctx, 400, 'Seçilen rollerden biri bulunamadı.')
      if (roles.some((r) => String(r.name ?? '').trim().toLowerCase() === 'godmin') && !caller.isGod) {
        return fail(ctx, 403, 'Godmin rolü bu ekrandan verilemez.')
      }
      // A new account cannot start above the person creating it (see roleRank).
      const above = roles.filter((r) => !mayAssignRole(caller, r.name)).map((r) => String(r.name ?? ''))
      if (above.length > 0) {
        return fail(ctx, 403, `Bu rolü verme yetkiniz yok: ${above.join(', ')}.`)
      }
    }

    const password = await hash(String(ctx.body.password))
    const created = await query(
      `with u as (
         insert into main.users (email, password, verified_at, email_verified, created_by)
         values ($1, $2, now(), true, $3::uuid)
         returning id
       ), p as (
         insert into main.profiles (user_id, first_name, last_name, created_by)
         select id, $4, $5, $3::uuid from u
       ), r as (
         insert into main.user_roles (user_id, role_id, created_by)
         select u.id, role_id::uuid, $3::uuid from u, unnest($6::text[]) as role_id
       )
       select id from u`,
      [email, password, caller.userId, firstName, lastName, roleIds]
    )
    const id = String(created[0]?.id ?? '')
    await auditAdmin(ctx, caller, 'ADMIN_CREATE_USER', {
      targetId: id,
      summary: `Admin ${caller.userId} created user ${email}`,
      newValues: { email, firstName, lastName, roleIds },
    })
    return { success: true, message: 'Kullanıcı oluşturuldu.', data: { id } }
  },
})

const deleteUser = defineRoute({
  method: 'POST',
  path: '/users/delete',
  body: t.Object({ userId: t.String() }),
  detail: { tags: ['Biltim'], summary: 'Delete a user and their own records (Merkez Ekip)' },
  handler: async (ctx) => {
    const caller = await adminOnly(ctx)
    if (!isCaller(caller)) return caller
    const target = await targetOf(ctx, caller, ctx.body.userId)
    if ('error' in target) return target.error
    // The account the id resolved to, not the raw body string (see isSameUser).
    if (isSameUser(target.id, caller.userId)) return fail(ctx, 400, 'Kendi hesabınızı silemezsiniz.')

    /*
     * The same cascade as nucleus's hard-delete — roles, sessions, profile;
     * files kept and dissociated — in one statement, so it all goes or none
     * of it does. Someone who took part in an approval flow is still
     * referenced by those records and cannot be deleted; the answer says to
     * lock the account instead, which is what the screen offers.
     */
    try {
      await query(
        `with f as (update main.files set uploaded_by = null where uploaded_by = $1::uuid),
              r as (delete from main.user_roles where user_id = $1::uuid),
              s as (delete from main.user_sessions where user_id = $1::uuid),
              p as (delete from main.profiles where user_id = $1::uuid)
         delete from main.users where id = $1::uuid`,
        [target.id]
      )
    } catch (error) {
      const code = (error as { code?: string }).code
      if (code === '23503') {
        return fail(
          ctx,
          409,
          'Bu kullanıcı geçmiş kayıtlarda (onay akışı vb.) yer aldığı için silinemiyor. Hesabı kilitleyin: giriş kapanır, kayıtlar yerinde kalır.'
        )
      }
      throw error
    }
    await auditAdmin(ctx, caller, 'ADMIN_HARD_DELETE_USER', {
      targetId: target.id,
      summary: `Admin ${caller.userId} hard-deleted user ${target.email} (${target.id})`,
      oldValues: {
        email: target.email,
        firstName: target.firstName,
        lastName: target.lastName,
        roles: target.roles,
        isLocked: target.isLocked,
      },
    })
    return { success: true, message: 'Kullanıcı silindi.' }
  },
})

const lockUser = defineRoute({
  method: 'POST',
  path: '/users/lock',
  body: t.Object({ userId: t.String() }),
  detail: { tags: ['Biltim'], summary: 'Lock an account and end its sessions (Merkez Ekip)' },
  handler: async (ctx) => {
    const caller = await adminOnly(ctx)
    if (!isCaller(caller)) return caller
    const target = await targetOf(ctx, caller, ctx.body.userId)
    if ('error' in target) return target.error
    // The account the id resolved to, not the raw body string (see isSameUser).
    if (isSameUser(target.id, caller.userId)) return fail(ctx, 400, 'Kendi hesabınızı kilitleyemezsiniz.')
    await query(
      'update main.users set is_locked = true, locked_until = null, updated_at = now() where id = $1::uuid',
      [target.id]
    )
    const signedOut = await signOut(target.id)
    await auditAdmin(ctx, caller, 'ADMIN_LOCK_USER', {
      targetId: target.id,
      summary: `Admin ${caller.userId} locked user ${target.email}`,
      oldValues: { isLocked: target.isLocked },
      newValues: { isLocked: true, signedOut },
    })
    return { success: true, data: { isLocked: true, signedOut } }
  },
})

const unlockUser = defineRoute({
  method: 'POST',
  path: '/users/unlock',
  body: t.Object({ userId: t.String() }),
  detail: { tags: ['Biltim'], summary: 'Unlock an account (Merkez Ekip)' },
  handler: async (ctx) => {
    const caller = await adminOnly(ctx)
    if (!isCaller(caller)) return caller
    const target = await targetOf(ctx, caller, ctx.body.userId)
    if ('error' in target) return target.error
    // All three together, as nucleus's unlock does: the login route reads the
    // failed-attempt counter before it checks the password.
    await query(
      `update main.users set is_locked = false, locked_until = null, failed_login_attempts = 0,
              updated_at = now() where id = $1::uuid`,
      [target.id]
    )
    await auditAdmin(ctx, caller, 'ADMIN_UNLOCK_USER', {
      targetId: target.id,
      summary: `Admin ${caller.userId} unlocked user ${target.email}`,
      oldValues: { isLocked: target.isLocked },
      newValues: { isLocked: false },
    })
    return { success: true, data: { isLocked: false } }
  },
})

const setPassword = defineRoute({
  method: 'POST',
  path: '/users/password',
  body: t.Object({ userId: t.String(), password: t.String() }),
  detail: { tags: ['Biltim'], summary: "Set a user's password (Merkez Ekip)" },
  handler: async (ctx) => {
    const caller = await adminOnly(ctx)
    if (!isCaller(caller)) return caller
    const target = await targetOf(ctx, caller, ctx.body.userId)
    if ('error' in target) return target.error
    const problems = passwordProblems(String(ctx.body.password ?? ''))
    if (problems.length > 0) return fail(ctx, 400, problems.join(' '))
    await query(
      `update main.users set password = $2, is_locked = false, locked_until = null,
              failed_login_attempts = 0, updated_at = now() where id = $1::uuid`,
      [target.id, await hash(String(ctx.body.password))]
    )
    const signedOut = await signOut(target.id)
    // What changed, never what it changed to.
    await auditAdmin(ctx, caller, 'ADMIN_SET_USER_PASSWORD', {
      targetId: target.id,
      summary: `Admin ${caller.userId} set the password of user ${target.email}`,
      newValues: { passwordChanged: true, lockoutCleared: true, signedOut },
    })
    return { success: true, data: { signedOut, lockoutCleared: true } }
  },
})

/*
 * One account's roles, for the users screen (#21).
 *
 * The role modal read GET /user_roles and GET /roles and wrote through the
 * generic /user_roles routes. nucleus lets only the godmin write user_roles
 * (decideRoleAssign: this install names no allowRoles), and Merkez Ekip
 * holds neither read claim — so for Merkez Ekip the modal opened empty and
 * an existing user's roles could not be changed at all.
 *
 * Reading is open to every admin for every account, so a Super Admin's roles
 * can be seen. Changing follows the same rank rules as everything else here:
 * not your own account, not an account above you, and only a role you could
 * hand out — taking one away needs the same right as giving it.
 */
const userRoles = defineRoute({
  method: 'GET',
  path: '/users/roles',
  query: t.Object({ userId: t.String() }),
  detail: { tags: ['Biltim'], summary: "One account's roles, and which of them the caller may change" },
  handler: async (ctx) => {
    const caller = await adminOnly(ctx)
    if (!isCaller(caller)) return caller
    const userId = String(ctx.query.userId ?? '').trim()
    if (!userId) return fail(ctx, 400, 'Kullanıcı seçilmedi.')

    const [users, roles, claims] = await Promise.all([
      query('select id::text as id, is_god from main.users where id::text = $1', [userId]),
      query(
        `select r.id::text as id, r.name, r.description, r.is_system,
                exists (select 1 from main.user_roles ur
                         where ur.role_id = r.id and ur.user_id::text = $1 and ur.is_active is not false) as assigned
           from main.roles r
          where coalesce(r.is_active, true)
          order by r.name`,
        [userId]
      ),
      query(
        `select rc.role_id::text as role_id, c.id::text as id, c.action, c.method, c.path
           from main.user_roles ur
           join main.role_claims rc on rc.role_id = ur.role_id and rc.is_active is not false
           join main.claims c on c.id = rc.claim_id
          where ur.user_id::text = $1 and ur.is_active is not false
          order by c.path, c.method`,
        [userId]
      ),
    ])
    const user = users[0]
    if (!user) return fail(ctx, 404, 'Kullanıcı bulunamadı.')

    const held = roles.filter((r) => r.assigned === true).map((r) => String(r.name ?? '').trim().toLowerCase())
    const isGod = user.is_god === true || held.includes('godmin')
    const editable = !isSameUser(user.id, caller.userId) && mayTarget(caller, { isGod, roles: held })

    return {
      success: true,
      data: {
        editable,
        roles: roles.map((r) => ({
          id: String(r.id),
          name: String(r.name ?? ''),
          description: r.description == null ? null : String(r.description),
          is_system: r.is_system === true,
          assigned: r.assigned === true,
          assignable: editable && mayAssignRole(caller, r.name),
          claims: claims
            .filter((c) => c.role_id === r.id)
            .map((c) => ({
              id: String(c.id),
              action: String(c.action ?? ''),
              method: String(c.method ?? ''),
              path: String(c.path ?? ''),
            })),
        })),
      },
    }
  },
})

const setUserRole = defineRoute({
  method: 'POST',
  path: '/users/roles',
  body: t.Object({ userId: t.String(), roleId: t.String(), assigned: t.Boolean() }),
  detail: { tags: ['Biltim'], summary: 'Give an account a role or take it away (Merkez Ekip)' },
  handler: async (ctx) => {
    const caller = await adminOnly(ctx)
    if (!isCaller(caller)) return caller
    const target = await targetOf(ctx, caller, ctx.body.userId)
    if ('error' in target) return target.error
    // The account the id resolved to, not the raw body string (see isSameUser).
    if (isSameUser(target.id, caller.userId)) return fail(ctx, 400, 'Kendi rollerinizi değiştiremezsiniz.')

    const roleRows = await query('select id::text as id, name from main.roles where id::text = $1', [
      String(ctx.body.roleId ?? '').trim(),
    ])
    const role = roleRows[0]
    if (!role) return fail(ctx, 400, 'Rol bulunamadı.')
    const roleName = String(role.name ?? '')
    if (roleName.trim().toLowerCase() === 'godmin' && !caller.isGod) {
      return fail(ctx, 403, 'Godmin rolü bu ekrandan verilemez veya alınamaz.')
    }
    if (!mayAssignRole(caller, roleName)) {
      return fail(ctx, 403, `Bu rolü verme veya alma yetkiniz yok: ${roleName}.`)
    }

    const had = target.roles.includes(roleName.trim().toLowerCase())
    if (ctx.body.assigned === had) {
      return { success: true, data: { assigned: had, changed: false, signedOut: false } }
    }

    if (ctx.body.assigned) {
      // An inactive row for the same role would sit beside the new one; it goes.
      await query(
        `with d as (delete from main.user_roles where user_id = $1::uuid and role_id = $2::uuid)
         insert into main.user_roles (user_id, role_id, created_by) values ($1::uuid, $2::uuid, $3::uuid)`,
        [target.id, role.id, caller.userId]
      )
    } else {
      await query('delete from main.user_roles where user_id = $1::uuid and role_id = $2::uuid', [
        target.id,
        role.id,
      ])
    }

    /*
     * The server stops honouring a removed role at once: nucleus's table
     * routes read roles from user_roles on every request, and so does the
     * guard. The person's open screens do not — they keep the menus they
     * built at sign-in. Taking a role away therefore ends their sessions, so
     * what they see matches what they may do. Nobody is signed out for
     * gaining a role; the new screens appear on their next page load.
     */
    const signedOut = ctx.body.assigned ? false : await signOut(target.id)
    await auditAdmin(ctx, caller, ctx.body.assigned ? 'ADMIN_ASSIGN_ROLE' : 'ADMIN_REVOKE_ROLE', {
      targetId: target.id,
      summary: `Admin ${caller.userId} ${ctx.body.assigned ? 'assigned' : 'revoked'} role ${roleName} ${ctx.body.assigned ? 'to' : 'from'} user ${target.email}`,
      oldValues: { roles: target.roles },
      newValues: { role: roleName, assigned: ctx.body.assigned, signedOut },
    })
    return { success: true, data: { assigned: ctx.body.assigned, changed: true, signedOut } }
  },
})

const routes: AnyRoute[] = [
  myScope,
  userRanks,
  userRoles,
  setUserRole,
  createUser,
  deleteUser,
  lockUser,
  unlockUser,
  setPassword,
]
export const BiltimRoutes: RouteGroup = { prefix: '/biltim', routes }
