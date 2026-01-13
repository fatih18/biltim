import * as tables from '@monorepo/db-entities/schemas'
import { getTenantDB } from '@monorepo/drizzle-manager'
import fileManager from '@monorepo/file-manager'
import { AddAuditLog } from '@monorepo/generics'
import argon2 from 'argon2'
import { pushSchema } from 'drizzle-kit/api'
import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { pgSchema } from 'drizzle-orm/pg-core'
import { nanoid } from 'nanoid'
import { withChecks } from '@/controllers/utils'
import type { TokenPayload } from '@/middlewares/Identity/types'
import type { ElysiaRequest } from '@/server'
import { generateResponse } from '@/utils'

export async function CreateSchemas(req: ElysiaRequest) {
  return await withChecks({
    operationName: 'Create schemas',
    req,
    endpoint: async function endpoint(req: ElysiaRequest) {
      const { schema_name, godmin_email, godmin_password, company_name, subdomain, tax_id, w9 } =
        req.body as {
          schema_name: string
          godmin_email: string
          godmin_password: string
          company_name: string
          subdomain: string
          tax_id: string
          w9: File
        }

      let user_id: string | undefined
      try {
        const profile = JSON.parse(req.request.headers.get('profile') || '{}') as TokenPayload
        user_id = profile.sub.toString()
      } catch (_) {
        user_id = undefined
      }

      const targetSchema = schema_name || 'main'
      const schema = pgSchema(targetSchema)

      // Build schema-aware tables using createTableForSchema
      // biome-ignore lint/suspicious/noExplicitAny: <too complex without need to define>
      const schemaTables: Record<string, any> = {}
      for (const [key, value] of Object.entries(tables)) {
        // Only include tables that should exist in this schema
        const availableSchemas = value.available_schemas as string[]
        if (availableSchemas.includes('*') || availableSchemas.includes(targetSchema)) {
          schemaTables[key] = value.createTableForSchema(schema)
        }
      }

      // Push schema to create tables
      const tenantDb = drizzle(process.env.DATABASE_URL)
      const push = await pushSchema({ schema, ...schemaTables }, tenantDb)
      await push.apply()

      // Get tenant DB connection with proper search_path
      const tenantDB = await getTenantDB(targetSchema)

      const result = await tenantDB.transaction(async (tx) => {
        const now = new Date()
        const ipAddress = req.server?.requestIP(req.request)?.address || 'unknown'
        const userAgent = req.request.headers.get('user-agent') || 'unknown'

        // Get schema-aware table references
        const UsersTable = schemaTables.T_Users
        const ProfilesTable = schemaTables.T_Profiles
        const CompaniesTable = schemaTables.T_Companies
        const FilesTable = schemaTables.T_Files

        // 1. Create godmin user with hashed password
        const hashedPassword = await argon2.hash(godmin_password.trim())
        const [godminUser] = await tx
          .insert(UsersTable)
          .values({
            email: godmin_email,
            password: hashedPassword,
            is_god: true,
            is_active: true,
            created_at: now,
            updated_at: now,
          })
          .returning()

        if (!godminUser) {
          throw new Error('Failed to create godmin user')
        }

        // Audit log for user creation
        await AddAuditLog({
          input: {
            entity_id: godminUser.id,
            entity_name: 'Users',
            operation_type: 'INSERT',
            new_values: [{ ...godminUser, password: undefined }],
            user_id: user_id || undefined,
            ip_address: ipAddress,
            user_agent: userAgent,
            summary: `Created godmin user for tenant ${targetSchema}`,
          },
          schema_name: targetSchema,
        })

        // 2. Create profile for godmin
        const [profile] = await tx
          .insert(ProfilesTable)
          .values({
            user_id: godminUser.id,
            first_name: '',
            last_name: '',
            is_active: true,
            created_at: now,
            updated_at: now,
          })
          .returning()

        // 3. Create company (without w9 initially)
        const [company] = await tx
          .insert(CompaniesTable)
          .values({
            name: company_name,
            tax_id: tax_id || null,
            owner_id: godminUser.id,
            is_active: true,
            created_at: now,
            updated_at: now,
          })
          .returning()

        if (!company) {
          throw new Error('Failed to create company')
        }

        // 4. Upload and create W9 file record
        let w9File = null
        if (w9) {
          try {
            const filename = `${nanoid()}_${w9.name}`
            const arrayBuffer = await w9.arrayBuffer()
            const extension = w9.name.split('.').pop()?.toLowerCase() ?? ''
            const dir = `./storage/documents/${godminUser.id}`

            const bytesWritten = await fileManager.createFile({
              dir,
              name: filename,
              data: new Uint8Array(arrayBuffer),
              options: {
                type: w9.type,
                createDir: true,
              },
            })

            const [fileRecord] = await tx
              .insert(FilesTable)
              .values({
                name: filename,
                original_name: w9.name,
                type: 'W9',
                path: dir,
                size: bytesWritten,
                mime_type: w9.type,
                extension,
                uploaded_by: godminUser.id,
                is_active: true,
                created_at: now,
                updated_at: now,
              })
              .returning()

            w9File = fileRecord

            // 5. Update company with w9 file reference
            if (w9File) {
              await tx
                .update(CompaniesTable)
                .set({
                  w9: w9File.id,
                  updated_at: now,
                })
                .where(eq(CompaniesTable.id, company.id))
            }
          } catch (fileError) {
            console.error('Failed to upload W9 file:', fileError)
            // Continue without W9 - it's not critical for tenant creation
          }
        }

        // Audit log for company creation
        await AddAuditLog({
          input: {
            entity_id: company.id,
            entity_name: 'Companies',
            operation_type: 'INSERT',
            new_values: [company],
            user_id: user_id || undefined,
            ip_address: ipAddress,
            user_agent: userAgent,
            summary: `Created company ${company_name} for tenant ${targetSchema}`,
          },
          schema_name: targetSchema,
        })

        return {
          isSuccess: true,
          data: {
            godminUser: { ...godminUser, password: undefined },
            profile,
            company,
            w9File,
          },
        }
      })

      if (!result.isSuccess || !result.data) {
        return generateResponse({
          isSuccess: false,
          message: 'Failed to create tenant data',
          errors: 'Transaction failed',
          status: 500,
          request: req,
        })
      }

      // 6. Create tenant record in main schema
      // Note: main.tenants stores metadata about tenants, company_id references the company in the tenant's own schema
      // T_Tenants is defined with mainSchema.table() so it points to main.tenants
      const mainDB = await getTenantDB('main')

      // Drop legacy FK constraint if it exists (company_id now references tenant's own schema, not main.companies)
      try {
        await mainDB.execute(
          sql`ALTER TABLE "main"."tenants" DROP CONSTRAINT IF EXISTS "tenants_company_id_companies_id_fk"`
        )
      } catch (constraintError) {
        console.warn('Could not drop FK constraint (may not exist):', constraintError)
      }

      const TenantsTable = tables.T_Tenants.T_Tenants
      const [tenant] = await mainDB
        .insert(TenantsTable)
        .values({
          subdomain,
          company_id: result.data.company.id,
          schema_name: targetSchema,
          company_name: company_name, // Denormalized for listing
          god_admin_email: godmin_email, // Denormalized for listing
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning()

      if (!tenant) {
        return generateResponse({
          isSuccess: false,
          message: 'Failed to create tenant record',
          errors: 'Tenant insertion failed',
          status: 500,
          request: req,
        })
      }

      // Audit log for tenant creation
      await AddAuditLog({
        input: {
          entity_id: tenant.id,
          entity_name: 'Tenants',
          operation_type: 'INSERT',
          new_values: [tenant],
          user_id: user_id || undefined,
          ip_address: req.server?.requestIP(req.request)?.address || 'unknown',
          user_agent: req.request.headers.get('user-agent') || 'unknown',
          summary: `Created tenant ${subdomain} with schema ${targetSchema}`,
        },
        schema_name: 'main',
      })

      return generateResponse({
        isSuccess: true,
        message: 'Tenant created successfully',
        data: {
          tenant,
          company: result.data.company,
          godminUser: result.data.godminUser,
        },
        request: req,
      })
    },
  })
}
