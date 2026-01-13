import { T_Claims as claims } from '@monorepo/db-entities/schemas/default/claim'
import { T_Roles as roles } from '@monorepo/db-entities/schemas/default/role'
import { T_RoleClaims as roleClaims } from '@monorepo/db-entities/schemas/default/role_claim'
import { T_Users as users } from '@monorepo/db-entities/schemas/default/user'
import { T_UserClaims as userClaims } from '@monorepo/db-entities/schemas/default/user_claim'
import { T_UserRoles as userRoles } from '@monorepo/db-entities/schemas/default/user_role'
import { getTenantDB } from '@monorepo/drizzle-manager'
import { and, eq } from 'drizzle-orm'

export type EffectiveClaim = {
  action: string
  path: string
  method: string
  mode: 'exact' | 'startsWith'
  source: 'direct' | 'role'
}

/**
 * Get all effective claims for a user (direct + role-based)
 */
export async function getUserEffectiveClaims(params: {
  userId: string
  schemaName: string
}): Promise<EffectiveClaim[]> {
  const { userId, schemaName } = params
  const db = await getTenantDB(schemaName)

  // 1. Get direct user claims
  const directClaims = await db
    .select({
      action: claims.action,
      path: claims.path,
      method: claims.method,
      mode: claims.mode,
    })
    .from(userClaims)
    .innerJoin(claims, eq(userClaims.claim_id, claims.id))
    .where(
      and(
        eq(userClaims.user_id, userId),
        eq(userClaims.is_active, true),
        eq(claims.is_active, true)
      )
    )

  // 2. Get role-based claims
  const roleBasedClaims = await db
    .select({
      action: claims.action,
      path: claims.path,
      method: claims.method,
      mode: claims.mode,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.role_id, roles.id))
    .innerJoin(roleClaims, eq(roles.id, roleClaims.role_id))
    .innerJoin(claims, eq(roleClaims.claim_id, claims.id))
    .where(
      and(
        eq(userRoles.user_id, userId),
        eq(userRoles.is_active, true),
        eq(roleClaims.is_active, true),
        eq(claims.is_active, true)
      )
    )

  // 3. Merge and deduplicate
  const effectiveClaimsMap = new Map<string, EffectiveClaim>()

  for (const claim of directClaims) {
    const key = `${claim.action}:${claim.path}:${claim.method}`
    effectiveClaimsMap.set(key, {
      action: claim.action,
      path: claim.path,
      method: claim.method,
      mode: claim.mode,
      source: 'direct',
    })
  }

  for (const claim of roleBasedClaims) {
    const key = `${claim.action}:${claim.path}:${claim.method}`
    if (!effectiveClaimsMap.has(key)) {
      effectiveClaimsMap.set(key, {
        action: claim.action,
        path: claim.path,
        method: claim.method,
        mode: claim.mode,
        source: 'role',
      })
    }
  }

  return Array.from(effectiveClaimsMap.values())
}

/**
 * Check if user has claim for a specific endpoint
 */
export function hasClaimForEndpoint(params: {
  effectiveClaims: EffectiveClaim[]
  path: string
  method: string
}): boolean {
  const { effectiveClaims, path, method } = params

  return effectiveClaims.some((claim) => {
    if (claim.method !== method) return false

    if (claim.mode === 'exact') {
      return claim.path === path
    }

    if (claim.mode === 'startsWith') {
      return path.startsWith(claim.path)
    }

    return false
  })
}

/**
 * Check if user is god admin
 */
export async function isGodAdmin(params: { userId: string; schemaName: string }): Promise<boolean> {
  const { userId, schemaName } = params
  const db = await getTenantDB(schemaName)

  const user = await db
    .select({ is_god: users.is_god })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  return user[0]?.is_god ?? false
}
