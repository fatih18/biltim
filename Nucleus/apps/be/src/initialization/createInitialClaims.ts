import * as AllSchemas from '@monorepo/db-entities/schemas'
import { GenericMethods } from '@monorepo/db-entities/types/shared'
import { GenericAction } from '@monorepo/generics'

type ClaimData = {
  action: string
  method: string
  path: string
  mode: 'exact' | 'startsWith'
  description?: string
}

const INITIAL_CLAIMS: ClaimData[] = [
  // Core System Claims
  {
    action: 'users.read',
    method: 'GET',
    path: '/api/users',
    mode: 'startsWith',
    description: 'View users list and details',
  },
  {
    action: 'users.write',
    method: 'POST',
    path: '/api/users',
    mode: 'exact',
    description: 'Create new users',
  },
  {
    action: 'users.update',
    method: 'PATCH',
    path: '/api/users',
    mode: 'exact',
    description: 'Update user information',
  },
  {
    action: 'users.delete',
    method: 'DELETE',
    path: '/api/users',
    mode: 'exact',
    description: 'Delete users',
  },
  {
    action: 'users.verify',
    method: 'POST',
    path: '/api/users/verify',
    mode: 'exact',
    description: 'Verify user email',
  },
  {
    action: 'users.lock',
    method: 'PATCH',
    path: '/api/users/lock',
    mode: 'exact',
    description: 'Lock/unlock user accounts',
  },
  {
    action: 'users.activate',
    method: 'PATCH',
    path: '/api/users/activate',
    mode: 'exact',
    description: 'Activate/deactivate users',
  },

  {
    action: 'profiles.read',
    method: 'GET',
    path: '/api/profiles',
    mode: 'startsWith',
    description: 'View user profiles',
  },
  {
    action: 'profiles.update',
    method: 'PATCH',
    path: '/api/profiles',
    mode: 'exact',
    description: 'Update user profiles',
  },

  {
    action: 'claims.read',
    method: 'GET',
    path: '/api/claims',
    mode: 'startsWith',
    description: 'View claims list',
  },
  {
    action: 'claims.write',
    method: 'POST',
    path: '/api/claims',
    mode: 'exact',
    description: 'Create new claims',
  },
  {
    action: 'claims.update',
    method: 'PATCH',
    path: '/api/claims',
    mode: 'exact',
    description: 'Update claims',
  },
  {
    action: 'claims.delete',
    method: 'DELETE',
    path: '/api/claims',
    mode: 'exact',
    description: 'Delete claims',
  },

  {
    action: 'roles.read',
    method: 'GET',
    path: '/api/roles',
    mode: 'startsWith',
    description: 'View roles list',
  },
  {
    action: 'roles.write',
    method: 'POST',
    path: '/api/roles',
    mode: 'exact',
    description: 'Create new roles',
  },
  {
    action: 'roles.update',
    method: 'PATCH',
    path: '/api/roles',
    mode: 'exact',
    description: 'Update roles',
  },
  {
    action: 'roles.delete',
    method: 'DELETE',
    path: '/api/roles',
    mode: 'exact',
    description: 'Delete roles',
  },

  {
    action: 'companies.read',
    method: 'GET',
    path: '/api/companies',
    mode: 'startsWith',
    description: 'View companies',
  },
  {
    action: 'companies.write',
    method: 'POST',
    path: '/api/companies',
    mode: 'exact',
    description: 'Create companies',
  },
  {
    action: 'companies.update',
    method: 'PATCH',
    path: '/api/companies',
    mode: 'exact',
    description: 'Update companies',
  },
  {
    action: 'companies.delete',
    method: 'DELETE',
    path: '/api/companies',
    mode: 'exact',
    description: 'Delete companies',
  },

  // five_s_findings special: status update is restricted (Auditor-only users must NOT have this)
  {
    action: 'five_s_findings.update_status',
    method: 'PATCH',
    path: '/api/five_s_findings/',
    mode: 'startsWith',
    description: 'Update status of five_s_findings (not available to Auditor-only users)',
  },

  // User-role assignments (only Super Admin should normally get these via roles)
  {
    action: 'user_roles.read',
    method: 'GET',
    path: '/api/user_roles',
    mode: 'startsWith',
    description: 'View user-role assignments',
  },
  {
    action: 'user_roles.write',
    method: 'POST',
    path: '/api/user_roles',
    mode: 'exact',
    description: 'Assign roles to users',
  },
  {
    action: 'user_roles.delete',
    method: 'DELETE',
    path: '/api/user_roles',
    mode: 'exact',
    description: 'Remove roles from users',
  },
]

type SchemaModule = {
  tablename: string
  available_app_ids: string[]
  available_schemas: string[]
  excluded_schemas?: string[]
  excluded_methods?: GenericMethods[]
  is_formdata?: boolean
}

function buildGenericClaimsFromSchemas(existingActions: Set<string>): ClaimData[] {
  const claims: ClaimData[] = []

  const backendId = process.env.NUCLEUS_APP_ID
  const tableObjects = Object.values(AllSchemas) as SchemaModule[]

  for (const schema of tableObjects) {
    const { tablename, available_app_ids, available_schemas, excluded_schemas, excluded_methods } =
      schema

    if (!backendId || !available_app_ids.includes(backendId)) {
      continue
    }

    const isTableForMainTenant =
      available_schemas.includes('*') || available_schemas.includes('main')
    const isTableExcludedOnMain =
      Array.isArray(excluded_schemas) && excluded_schemas.includes('main')

    if (!isTableForMainTenant || isTableExcludedOnMain) {
      continue
    }

    const excludedMethods = excluded_methods ?? []
    const basePath = `/api/${tablename}`
    const actionPrefix = tablename

    // READ
    if (!excludedMethods.includes(GenericMethods.GET)) {
      const action = `${actionPrefix}.read`
      if (!existingActions.has(action)) {
        claims.push({
          action,
          method: 'GET',
          path: basePath,
          mode: 'startsWith',
          description: `View ${tablename}`,
        })
      }
    }

    // WRITE (CREATE)
    if (!excludedMethods.includes(GenericMethods.CREATE)) {
      const action = `${actionPrefix}.write`
      if (!existingActions.has(action)) {
        claims.push({
          action,
          method: 'POST',
          path: basePath,
          mode: 'exact',
          description: `Create ${tablename}`,
        })
      }
    }

    // UPDATE
    if (!excludedMethods.includes(GenericMethods.UPDATE)) {
      const action = `${actionPrefix}.update`
      if (!existingActions.has(action)) {
        claims.push({
          action,
          method: 'PATCH',
          path: `${basePath}/`,
          mode: 'startsWith',
          description: `Update ${tablename}`,
        })
      }
    }

    // DELETE
    if (!excludedMethods.includes(GenericMethods.DELETE)) {
      const action = `${actionPrefix}.delete`
      if (!existingActions.has(action)) {
        claims.push({
          action,
          method: 'DELETE',
          path: `${basePath}/`,
          mode: 'startsWith',
          description: `Delete ${tablename}`,
        })
      }
    }
  }

  return claims
}

export async function createInitialClaims() {
  console.log('📝 Creating initial claims...')

  let created = 0
  let existing = 0
  let failed = 0

  const manualActions = new Set(INITIAL_CLAIMS.map((claim) => claim.action))
  const generatedClaims = buildGenericClaimsFromSchemas(manualActions)
  const allClaims: ClaimData[] = [...INITIAL_CLAIMS, ...generatedClaims]

  for (const claim of allClaims) {
    try {
      await GenericAction({
        ip_address: '127.0.0.1',
        user_agent: 'system',
        schema_name: 'main',
        table_name: 'T_Claims',
        action_type: 'INSERT',
        data: claim,
      })
      created++
    } catch (error) {
      const err = error as { cause?: { code?: string }; message?: string }
      const code = err?.cause?.code

      if (code === '23505') {
        // Duplicate - already exists
        existing++
      } else {
        failed++
        console.error(`❌ Failed to create claim: ${claim.action}`, {
          code,
          message: err?.message,
        })
      }
    }
  }

  console.log(`✅ Claims initialization complete:`)
  console.log(`   - Created: ${created}`)
  console.log(`   - Already exists: ${existing}`)
  if (failed > 0) {
    console.log(`   - Failed: ${failed}`)
  }
}
