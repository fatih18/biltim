import { GenericAction } from '@monorepo/generics'

type RoleData = {
  name: string
  description: string
  is_system: boolean
}

type RoleClaimMapping = {
  roleName: string
  claimActions: string[]
}

const INITIAL_ROLES: RoleData[] = [
  {
    name: 'Super Admin',
    description: 'Full system access - God mode equivalent for non-god users',
    is_system: true,
  },

  {
    name: 'Manager',
    description: 'Kullanıcı rol ataması ve bulguların status değişimi.',
    is_system: true,
  },

  {
    name: 'Content Manager Core Team',
    description: 'Ana veri yönetimi ve bulgu onay.',
    is_system: false,
  },
  {
    name: 'Field Manager',
    description: 'Açık bulgu kapatabilir ve sonrası fotoğraf yükleyebilir.',
    is_system: false,
  },
  {
    name: 'Auditor',
    description: 'Denetim kaydı açabilir. Termin tarihi girebilir.',
    is_system: false,
  },
]
const SUPER_ADMIN_CLAIMS = [
  'users.read',
  'users.write',
  'users.update',
  'users.delete',
  'users.verify',
  'users.lock',
  'users.activate',
  'profiles.read',
  'profiles.update',
  'claims.read',
  'claims.write',
  'claims.update',
  'claims.delete',
  'roles.read',
  'roles.write',
  'roles.update',
  'roles.delete',
  'companies.read',
  'companies.write',
  'companies.update',
  'companies.delete',
  'user_roles.read',
  'user_roles.write',
  'user_roles.delete',

  'five_s_answers.read',
  'five_s_answers.write',
  'five_s_answers.update',
  'five_s_answers.delete',

  'five_s_steps.read',
  'five_s_steps.write',
  'five_s_steps.update',
  'five_s_steps.delete',

  'five_s_questions.read',
  'five_s_questions.write',
  'five_s_questions.update',
  'five_s_questions.delete',

  'five_s_audits.read',
  'five_s_audits.write',
  'five_s_audits.update',
  'five_s_audits.delete',

  'five_s_findings.read',
  'five_s_findings.write',
  'five_s_findings.update',
  'five_s_findings.delete',

  'board_meeting_decisions.read',
  'board_meeting_decisions.write',
  'board_meeting_decisions.update',
  'board_meeting_decisions.delete',

  'five_s_actions.read',
  'five_s_actions.write',
  'five_s_actions.update',
  'five_s_actions.delete',

  'five_s_locations.read',
  'five_s_locations.write',
  'five_s_locations.update',
  'five_s_locations.delete',

  'five_s_finding_types.read',
  'five_s_finding_types.write',
  'five_s_finding_types.update',
  'five_s_finding_types.delete',

  'five_s_audit_plans.read',
  'five_s_audit_plans.write',
  'five_s_audit_plans.update',
  'five_s_audit_plans.delete',

  'five_s_audit_team_members.read',
  'five_s_audit_team_members.write',
  'five_s_audit_team_members.update',
  'five_s_audit_team_members.delete',

  'five_s_audit_teams.read',
  'five_s_audit_teams.write',
  'five_s_audit_teams.update',
  'five_s_audit_teams.delete',
] as const

const ROLE_CLAIM_MAPPINGS: RoleClaimMapping[] = [
  {
    roleName: 'Super Admin',
    claimActions: [...SUPER_ADMIN_CLAIMS],
  },

  {
    roleName: 'Manager',
    claimActions: [...SUPER_ADMIN_CLAIMS],
  },

  {
    roleName: 'Content Manager Core Team',
    claimActions: [...SUPER_ADMIN_CLAIMS],
  },
  {
    roleName: 'Field Manager',
    claimActions: [...SUPER_ADMIN_CLAIMS],
  },
  {
    roleName: 'Auditor',
    claimActions: [...SUPER_ADMIN_CLAIMS],
  },


]

export async function createInitialRoles() {
  console.log('👥 Creating initial roles...')

  const createdRoles = new Map<string, string>() // roleName -> roleId
  let created = 0
  let existing = 0
  let failed = 0

  // Step 1: Create roles
  for (const role of INITIAL_ROLES) {
    try {
      const result = await GenericAction({
        ip_address: '127.0.0.1',
        user_agent: 'system',
        schema_name: 'main',
        table_name: 'T_Roles',
        action_type: 'INSERT',
        data: role,
      })
      const createdRole = result?.[0]
      if (createdRole?.id) {
        createdRoles.set(role.name, createdRole.id)
        created++
      }
    } catch (error) {
      const err = error as { cause?: { code?: string }; message?: string }
      const code = err?.cause?.code

      if (code === '23505') {
        // Role already exists - try to fetch its ID
        try {
          const existingResult = await GenericAction({
            ip_address: '127.0.0.1',
            user_agent: 'system',
            schema_name: 'main',
            table_name: 'T_Roles',
            action_type: 'GET',
            filters: [
              {
                column: 'name',
                value: role.name,
              },
            ],
            limit: 1,
          })
          const existingList = (existingResult ?? []) as Array<{ id: string; name: string }>
          const existingRole = existingList[0]
          if (existingRole?.id) {
            createdRoles.set(role.name, existingRole.id)
          }
        } catch {
          console.error(`❌ Failed to fetch existing role: ${role.name}`)
        }
        existing++
      } else {
        failed++
        console.error(`❌ Failed to create role: ${role.name}`, {
          code,
          message: err?.message,
        })
      }
    }
  }

  console.log(`✅ Roles creation complete:`)
  console.log(`   - Created: ${created}`)
  console.log(`   - Already exists: ${existing}`)
  if (failed > 0) {
    console.log(`   - Failed: ${failed}`)
  }

  // Step 2: Fetch all claims first
  console.log('🔍 Fetching all claims...')
  let allClaims: Array<{ id: string; action: string }> = []
  try {
    const claimsResult = await GenericAction({
      ip_address: '127.0.0.1',
      user_agent: 'system',
      schema_name: 'main',
      table_name: 'T_Claims',
      action_type: 'GET',
      limit: 100,
    })
    allClaims = (claimsResult ?? []) as Array<{ id: string; action: string }>
    console.log(`✅ Fetched ${allClaims.length} claims`)
  } catch (error) {
    console.error('❌ Failed to fetch claims:', error)
    return
  }

  // Step 3: Assign claims to roles
  console.log('🔗 Assigning claims to roles...')
  let assignedCount = 0
  let assignExistingCount = 0
  let assignFailedCount = 0

  for (const mapping of ROLE_CLAIM_MAPPINGS) {
    const roleId = createdRoles.get(mapping.roleName)
    if (!roleId) {
      console.warn(`⚠️  Role not found: ${mapping.roleName}`)
      continue
    }

    // Find claim IDs by action
    for (const claimAction of mapping.claimActions) {
      const claim = allClaims.find((c) => c.action === claimAction)
      if (!claim?.id) {
        console.warn(`⚠️  Claim not found: ${claimAction}`)
        continue
      }

      try {
        // Assign claim to role
        await GenericAction({
          ip_address: '127.0.0.1',
          user_agent: 'system',
          schema_name: 'main',
          table_name: 'T_RoleClaims',
          action_type: 'INSERT',
          data: {
            role_id: roleId,
            claim_id: claim.id,
          },
        })
        assignedCount++
      } catch (error) {
        const err = error as { cause?: { code?: string }; message?: string }
        const code = err?.cause?.code

        if (code === '23505') {
          assignExistingCount++
        } else {
          assignFailedCount++
          console.error(`❌ Failed to assign claim ${claimAction} to role ${mapping.roleName}`)
        }
      }
    }
  }

  // Extra step: ensure Super Admin has all claims (including newly generated ones)
  const superAdminRoleId = createdRoles.get('Super Admin')
  if (superAdminRoleId) {
    console.log('🔗 Ensuring Super Admin has all claims...')

    for (const claim of allClaims) {
      try {
        await GenericAction({
          ip_address: '127.0.0.1',
          user_agent: 'system',
          schema_name: 'main',
          table_name: 'T_RoleClaims',
          action_type: 'INSERT',
          data: {
            role_id: superAdminRoleId,
            claim_id: claim.id,
          },
        })
        assignedCount++
      } catch (error) {
        const err = error as { cause?: { code?: string }; message?: string }
        const code = err?.cause?.code

        if (code === '23505') {
          assignExistingCount++
        } else {
          assignFailedCount++
          console.error(`❌ Failed to assign claim ${claim.action} to role Super Admin`)
        }
      }
    }
  }

  console.log(`✅ Role-claim assignments complete:`)
  console.log(`   - Assigned: ${assignedCount}`)
  console.log(`   - Already assigned: ${assignExistingCount}`)
  if (assignFailedCount > 0) {
    console.log(`   - Failed: ${assignFailedCount}`)
  }
}
