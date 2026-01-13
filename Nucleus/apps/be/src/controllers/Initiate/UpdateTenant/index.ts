import * as tables from '@monorepo/db-entities/schemas'
import { getTenantDB } from '@monorepo/drizzle-manager'
import { AddAuditLog } from '@monorepo/generics'
import { eq, sql } from 'drizzle-orm'
import { withChecks } from '@/controllers/utils'
import type { TokenPayload } from '@/middlewares/Identity/types'
import type { ElysiaRequest } from '@/server'
import { generateResponse } from '@/utils'

type UpdateTenantPayload = {
  subdomain?: string
  is_active?: boolean
  company_name?: string
  god_admin_email?: string
  god_admin_password?: string
  god_admin_first_name?: string
  god_admin_last_name?: string
}

export async function UpdateTenant(req: ElysiaRequest<{ params: { tenantId: string } }>) {
  return await withChecks({
    operationName: 'Update tenant',
    req,
    endpoint: async function endpoint(req: ElysiaRequest<{ params: { tenantId: string } }>) {
      const tenantId = req.params.tenantId
      const body = req.body as UpdateTenantPayload

      if (!tenantId) {
        return generateResponse({
          isSuccess: false,
          message: 'Tenant ID is required',
          data: null,
          request: req,
        })
      }

      let user_id: string | undefined
      try {
        const profile = JSON.parse(req.request.headers.get('profile') || '{}') as TokenPayload
        user_id = profile.sub?.toString()
      } catch {
        user_id = undefined
      }

      const mainDB = await getTenantDB('main')
      const TenantsTable = tables.T_Tenants.T_Tenants

      // Get current tenant
      const [currentTenant] = await mainDB
        .select()
        .from(TenantsTable)
        .where(eq(TenantsTable.id, tenantId))
        .limit(1)

      if (!currentTenant) {
        return generateResponse({
          isSuccess: false,
          message: 'Tenant not found',
          data: null,
          request: req,
        })
      }

      const now = new Date()
      const updateData: Record<string, unknown> = {
        updated_at: now,
      }

      if (body.subdomain !== undefined) {
        updateData.subdomain = body.subdomain
      }

      if (body.is_active !== undefined) {
        updateData.is_active = body.is_active
      }

      if (body.god_admin_email !== undefined) {
        updateData.god_admin_email = body.god_admin_email
      }

      if (body.god_admin_password !== undefined) {
        updateData.god_admin_password = body.god_admin_password
      }

      // Update tenant record
      const [updatedTenant] = await mainDB
        .update(TenantsTable)
        .set(updateData)
        .where(eq(TenantsTable.id, tenantId))
        .returning()

      if (!updatedTenant) {
        return generateResponse({
          isSuccess: false,
          message: 'Failed to update tenant',
          data: null,
          request: req,
        })
      }

      // If company_name is provided, update company in tenant's schema
      if (body.company_name && currentTenant.schema_name) {
        try {
          const tenantDB = await getTenantDB(currentTenant.schema_name)
          await tenantDB.execute(
            sql`UPDATE companies SET name = ${body.company_name}, updated_at = ${now} WHERE id = ${currentTenant.company_id}`
          )
        } catch (companyError) {
          console.error('Failed to update company name:', companyError)
        }
      }

      // If admin credentials are provided, update users table in tenant's schema
      if ((body.god_admin_email || body.god_admin_password) && currentTenant.schema_name) {
        try {
          const tenantDB = await getTenantDB(currentTenant.schema_name)
          const oldEmail = currentTenant.god_admin_email

          if (body.god_admin_email && body.god_admin_password) {
            // Update both email and password
            await tenantDB.execute(
              sql`UPDATE users SET email = ${body.god_admin_email}, password = ${body.god_admin_password}, updated_at = ${now} WHERE email = ${oldEmail}`
            )
          } else if (body.god_admin_email) {
            // Update only email
            await tenantDB.execute(
              sql`UPDATE users SET email = ${body.god_admin_email}, updated_at = ${now} WHERE email = ${oldEmail}`
            )
          } else if (body.god_admin_password) {
            // Update only password
            await tenantDB.execute(
              sql`UPDATE users SET password = ${body.god_admin_password}, updated_at = ${now} WHERE email = ${oldEmail}`
            )
          }
        } catch (adminError) {
          console.error('Failed to update admin credentials:', adminError)
        }
      }

      // If admin profile info is provided, update profiles table in tenant's schema
      if ((body.god_admin_first_name || body.god_admin_last_name) && currentTenant.schema_name) {
        try {
          const tenantDB = await getTenantDB(currentTenant.schema_name)
          const adminEmail = body.god_admin_email || currentTenant.god_admin_email

          // Get user_id from users table
          const userResult = await tenantDB.execute(
            sql`SELECT id FROM users WHERE email = ${adminEmail} LIMIT 1`
          )
          // tenantDB.execute returns array directly, not { rows: [...] }
          const userRows = userResult as unknown as { id: string }[]
          const userId = userRows?.[0]?.id

          console.log('📝 Update Admin Profile:', {
            adminEmail,
            userId,
            firstName: body.god_admin_first_name,
            lastName: body.god_admin_last_name,
          })

          if (userId) {
            const nowISO = now.toISOString()
            if (body.god_admin_first_name && body.god_admin_last_name) {
              await tenantDB.execute(
                sql`UPDATE profiles SET first_name = ${body.god_admin_first_name}, last_name = ${body.god_admin_last_name}, updated_at = ${nowISO} WHERE user_id = ${userId}`
              )
            } else if (body.god_admin_first_name) {
              await tenantDB.execute(
                sql`UPDATE profiles SET first_name = ${body.god_admin_first_name}, updated_at = ${nowISO} WHERE user_id = ${userId}`
              )
            } else if (body.god_admin_last_name) {
              await tenantDB.execute(
                sql`UPDATE profiles SET last_name = ${body.god_admin_last_name}, updated_at = ${nowISO} WHERE user_id = ${userId}`
              )
            }
            console.log('✅ Admin profile updated successfully')
          } else {
            console.log('⚠️ User not found for email:', adminEmail)
          }
        } catch (profileError) {
          console.error('Failed to update admin profile:', profileError)
        }
      }

      // Audit log
      await AddAuditLog({
        input: {
          entity_id: tenantId,
          entity_name: 'Tenants',
          operation_type: 'UPDATE',
          old_values: [currentTenant],
          new_values: [updatedTenant],
          user_id: user_id || undefined,
          ip_address: req.server?.requestIP(req.request)?.address || 'unknown',
          user_agent: req.request.headers.get('user-agent') || 'unknown',
          summary: `Updated tenant ${updatedTenant.subdomain}`,
        },
        schema_name: 'main',
      })

      return generateResponse({
        isSuccess: true,
        message: 'Tenant updated successfully',
        data: updatedTenant,
        request: req,
      })
    },
  })
}
