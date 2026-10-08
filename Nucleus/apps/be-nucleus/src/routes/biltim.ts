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
 * the godmin role.
 */

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

/** The target account, refused when it is the godmin's or does not exist. */
async function targetOf(
  ctx: Ctx,
  caller: Caller,
  userId: string
): Promise<{ id: string; email: string } | { error: ReturnType<typeof fail> }> {
  const id = String(userId ?? '').trim()
  if (!id) return { error: fail(ctx, 400, 'Kullanıcı seçilmedi.') }
  const rows = await query(
    `select u.id, u.email, u.is_god,
            exists (select 1 from main.user_roles ur join main.roles r on r.id = ur.role_id
                     where ur.user_id = u.id and lower(r.name) = 'godmin') as has_godmin_role
       from main.users u where u.id::text = $1`,
    [id]
  )
  const row = rows[0]
  if (!row) return { error: fail(ctx, 404, 'Kullanıcı bulunamadı.') }
  if ((row.is_god === true || row.has_godmin_role === true) && !caller.isGod) {
    return { error: fail(ctx, 403, 'Godmin hesabı bu ekrandan değiştirilemez.') }
  }
  return { id: String(row.id), email: String(row.email ?? '') }
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
      if (roles.some((r) => String(r.name ?? '').toLowerCase() === 'godmin') && !caller.isGod) {
        return fail(ctx, 403, 'Godmin rolü bu ekrandan verilemez.')
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
    return { success: true, message: 'Kullanıcı oluşturuldu.', data: { id: String(created[0]?.id ?? '') } }
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
    if (ctx.body.userId === caller.userId) return fail(ctx, 400, 'Kendi hesabınızı silemezsiniz.')
    const target = await targetOf(ctx, caller, ctx.body.userId)
    if ('error' in target) return target.error

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
    if (ctx.body.userId === caller.userId) return fail(ctx, 400, 'Kendi hesabınızı kilitleyemezsiniz.')
    const target = await targetOf(ctx, caller, ctx.body.userId)
    if ('error' in target) return target.error
    await query(
      'update main.users set is_locked = true, locked_until = null, updated_at = now() where id = $1::uuid',
      [target.id]
    )
    const signedOut = await signOut(target.id)
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
    return { success: true, data: { signedOut, lockoutCleared: true } }
  },
})

const routes: AnyRoute[] = [myScope, createUser, deleteUser, lockUser, unlockUser, setPassword]
export const BiltimRoutes: RouteGroup = { prefix: '/biltim', routes }
