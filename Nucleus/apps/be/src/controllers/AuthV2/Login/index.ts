import { T_Users } from '@monorepo/db-entities/schemas/default/user'
import { getTenantDB } from '@monorepo/drizzle-manager'
import { AddAuditLog } from '@monorepo/generics'
import { eq } from 'drizzle-orm'
import { withChecks } from '@/controllers/utils'
import type { CompanyInfo } from '@/middlewares'
import type { ElysiaRequest } from '@/server'
import { ComparePassword } from '@/services/Auth'
import { generateResponse, getClientOriginInfo } from '@/utils'
import { getCompanyInfoFromHeaders, issueSessionTokens } from '../helpers'

type LoginBody = {
  email?: string
  password?: string
}

export async function LoginV2(req: ElysiaRequest) {
  return await withChecks({
    operationName: 'AuthV2 Login',
    req,
    endpoint: async function endpoint(req: ElysiaRequest) {
      const body = (req.body ?? {}) as LoginBody
      const email = body.email?.trim() ?? ''
      const password = body.password?.trim() ?? ''

      if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return generateResponse({
          isSuccess: false,
          message: 'Email is required.',
          errors: 'Missing or invalid email parameter',
          status: 400,
          request: req,
        })
      }

      if (!password || !password.trim()) {
        return generateResponse({
          isSuccess: false,
          message: 'Password is required.',
          errors: 'Missing or invalid password parameter',
          status: 400,
          request: req,
        })
      }

      const companyInfo = getCompanyInfoFromHeaders(req)
      const tenantDB = await getTenantDB(companyInfo.schema_name || 'main')

      const user = await tenantDB
        .select({
          id: T_Users.id,
          email: T_Users.email,
          password: T_Users.password,
          is_active: T_Users.is_active,
          is_locked: T_Users.is_locked,
          locked_until: T_Users.locked_until,
          failed_login_attempts: T_Users.failed_login_attempts,
          login_count: T_Users.login_count,
        })
        .from(T_Users)
        .where(eq(T_Users.email, email))
        .limit(1)

      if (!user[0]) {
        return generateResponse({
          isSuccess: false,
          message: 'User not found',
          errors: 'User not found',
          status: 404,
          request: req,
        })
      }

      const record = user[0]
      const userId = record.id as string

      if (!record.is_active) {
        return generateResponse({
          isSuccess: false,
          message: 'User account is deactivated',
          errors: 'User account is deactivated',
          status: 403,
          request: req,
        })
      }

      if (record.is_locked) {
        if (record.locked_until && new Date() >= record.locked_until) {
          await tenantDB
            .update(T_Users)
            .set({
              is_locked: false,
              locked_until: null,
              failed_login_attempts: 0,
              updated_at: new Date(),
            })
            .where(eq(T_Users.id, userId))
        } else {
          return generateResponse({
            isSuccess: false,
            message: 'Account is temporarily locked',
            errors: 'Account is temporarily locked',
            status: 403,
            request: req,
          })
        }
      }

      if (!record.password) {
        return generateResponse({
          isSuccess: false,
          message: 'Password is not set for this account. Please contact your administrator.',
          errors: 'Password is not set for this account',
          status: 401,
          request: req,
        })
      }

      const isPasswordValid = await ComparePassword(password, record.password as string)

      // Debug logging (remove in production)
      console.log('🔐 Password Check:', {
        providedPasswordLength: password.length,
        storedHashLength: (record.password as string)?.length,
        hashPrefix: (record.password as string)?.substring(0, 7),
        isValid: isPasswordValid,
      })

      if (!isPasswordValid) {
        const newFailedAttempts = (record.failed_login_attempts || 0) + 1
        const shouldLock = newFailedAttempts >= 5

        await tenantDB
          .update(T_Users)
          .set({
            failed_login_attempts: newFailedAttempts,
            is_locked: shouldLock,
            locked_until: shouldLock ? new Date(Date.now() + 30 * 60 * 1000) : null,
            updated_at: new Date(),
          })
          .where(eq(T_Users.id, userId))

        return generateResponse({
          isSuccess: false,
          message: shouldLock
            ? 'Too many failed attempts. Account locked for 30 minutes.'
            : 'Invalid password',
          status: 401,
          request: req,
        })
      }

      await tenantDB
        .update(T_Users)
        .set({
          last_login_at: new Date(),
          login_count: (record.login_count || 0) + 1,
          failed_login_attempts: 0,
          is_locked: false,
          locked_until: null,
          updated_at: new Date(),
        })
        .where(eq(T_Users.id, userId))

      const deviceInfo = getClientOriginInfo(req)

      await AddAuditLog({
        input: {
          entity_name: 'User',
          entity_id: userId,
          operation_type: 'LOGIN',
          ip_address: deviceInfo.ip,
          summary: `${email} logged in via AuthV2.`,
          user_agent: JSON.stringify(deviceInfo),
          user_id: userId,
        },
        schema_name: (companyInfo as CompanyInfo).schema_name,
      })

      const tokens = await issueSessionTokens({
        req,
        user: {
          id: userId,
          email: record.email || email,
        },
      })

      const { password: _password, ...sanitizedUser } = record

      return generateResponse({
        isSuccess: true,
        message: 'Login successful',
        data: {
          user: sanitizedUser,
          accessToken: tokens.accessToken,
          sessionId: tokens.sessionId,
        },
        request: req,
      })
    },
  })
}
