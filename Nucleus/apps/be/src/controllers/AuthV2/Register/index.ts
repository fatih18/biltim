import { T_Roles } from '@monorepo/db-entities/schemas/default/role'
import { T_Users } from '@monorepo/db-entities/schemas/default/user'
import { T_UserRoles } from '@monorepo/db-entities/schemas/default/user_role'
import { getTenantDB } from '@monorepo/drizzle-manager'
import { AddAuditLog, GenericAction } from '@monorepo/generics'
import type { EntityName } from '@monorepo/generics/GenericAction/resolver'
import { eq } from 'drizzle-orm'
import { withChecks } from '@/controllers/utils'
import type { CompanyInfo } from '@/middlewares'
import type { ElysiaRequest } from '@/server'
import { HashPassword, ValidateFormat } from '@/services/Auth'
import { generateResponse, getClientOriginInfo } from '@/utils'
import { getCompanyInfoFromHeaders, issueSessionTokens } from '../helpers'

const USERS_TABLE = 'T_Users' as EntityName
const PROFILES_TABLE = 'T_Profiles' as EntityName

type RegisterBody = {
  email?: string
  password?: string
}

type RegisterErrors = {
  email?: string
  password?: string
}

type RegisterResponseData = {
  user: unknown
  accessToken: string
  sessionId: string
}

export async function RegisterV2(req: ElysiaRequest) {
  return await withChecks({
    operationName: 'AuthV2 Register',
    req,
    endpoint: async function endpoint(req: ElysiaRequest) {
      const body = (req.body ?? {}) as RegisterBody
      const email = body.email?.trim() ?? ''
      const password = body.password?.trim() ?? ''

      const validation = ValidateFormat(email, password)
      if (!validation.isValid) {
        return generateResponse<RegisterResponseData, RegisterErrors>({
          isSuccess: false,
          message: 'Invalid input',
          errors: validation.errors,
          status: 400,
          request: req,
        })
      }

      const companyInfo = getCompanyInfoFromHeaders(req)
      const tenantDB = await getTenantDB(companyInfo.schema_name || 'main')

      const existing = await tenantDB
        .select({ id: T_Users.id })
        .from(T_Users)
        .where(eq(T_Users.email, email))
        .limit(1)

      if (existing.length > 0) {
        return generateResponse<RegisterResponseData, RegisterErrors>({
          isSuccess: false,
          message: 'User with this email already exists',
          errors: { email: 'This email is already registered' },
          status: 409,
          request: req,
        })
      }

      const hashedPassword = await HashPassword(password)

      // Debug logging (remove in production)
      console.log('🔐 Password Hash:', {
        originalPasswordLength: password.length,
        hashedPasswordLength: hashedPassword.length,
        hashPrefix: hashedPassword.substring(0, 7),
      })

      const requestIp = req.server?.requestIP(req.request)?.address || 'unknown'
      const userAgent = req.request.headers.get('user-agent') || 'unknown'

      const insertedUser = await GenericAction({
        schema_name: companyInfo.schema_name || 'main',
        table_name: USERS_TABLE,
        action_type: 'INSERT',
        data: {
          email,
          password: hashedPassword,
        },
        ip_address: requestIp,
        user_agent: userAgent,
        skipPasswordHashing: true, // Password already hashed with bcrypt
      })

      const rawUser = Array.isArray(insertedUser) ? insertedUser[0] : undefined
      const createdUser = rawUser as typeof rawUser & {
        email?: string
        password?: string | null
      }
      if (!createdUser) {
        return generateResponse<RegisterResponseData, RegisterErrors>({
          isSuccess: false,
          message: 'Failed to create user',
          errors: { email: 'Unexpected error while creating user' },
          status: 500,
          request: req,
        })
      }

      await GenericAction({
        schema_name: companyInfo.schema_name || 'main',
        table_name: PROFILES_TABLE,
        action_type: 'INSERT',
        data: {
          user_id: createdUser.id,
          first_name: '',
          last_name: '',
        },
        ip_address: requestIp,
        user_agent: userAgent,
      })

      // Assign default "user" role to new user
      const userRole = await tenantDB
        .select()
        .from(T_Roles)
        .where(eq(T_Roles.name, 'user'))
        .limit(1)

      if (userRole.length > 0 && userRole[0]) {
        await tenantDB.insert(T_UserRoles).values({
          user_id: createdUser.id,
          role_id: userRole[0].id,
        })
      }

      await AddAuditLog({
        input: {
          entity_name: 'User',
          entity_id: createdUser.id,
          operation_type: 'INSERT',
          ip_address: requestIp,
          summary: `${email} registered via AuthV2`,
          user_agent: JSON.stringify(getClientOriginInfo(req)),
          user_id: createdUser.id,
        },
        schema_name: (companyInfo as CompanyInfo).schema_name,
      })

      const tokens = await issueSessionTokens({
        req,
        user: {
          id: createdUser.id,
          email: createdUser.email ?? email,
        },
      })

      const { password: _password, ...sanitizedUser } = createdUser

      return generateResponse<RegisterResponseData, RegisterErrors>({
        isSuccess: true,
        message: 'User registered successfully',
        data: {
          user: sanitizedUser,
          accessToken: tokens.accessToken,
          sessionId: tokens.sessionId,
        },
        status: 201,
        request: req,
      })
    },
  })
}
