import { tenants } from '@monorepo/db-entities/schemas/default/tenants'
import { DB } from '@monorepo/drizzle-manager'
import { eq, sql } from 'drizzle-orm'
import { withChecks } from '@/controllers/utils'
import type { ElysiaRequest } from '@/server'
import { generateResponse } from '@/utils'

export async function dropSchema(req: ElysiaRequest) {
  return await withChecks({
    operationName: 'Drop schema',
    req,
    endpoint: async function endpoint(req: ElysiaRequest) {
      const schemaName = (req.params as { schemaName: string }).schemaName
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')

      // Safety check - prevent dropping critical schemas
      const protectedSchemas = ['public', 'information_schema', 'pg_catalog', 'pg_toast']
      if (protectedSchemas.includes(schemaName)) {
        return generateResponse({
          isSuccess: false,
          message: 'Korumalı schema silinemez',
          data: null,
        })
      }

      // Check if schema exists
      const schemaExists = await DB.execute(sql`
          SELECT schema_name 
          FROM information_schema.schemata 
          WHERE schema_name = ${schemaName}
        `)

      if (schemaExists.rows.length === 0) {
        return generateResponse({
          isSuccess: false,
          message: 'Schema bulunamadı',
          data: null,
        })
      }

      // Get table count before dropping
      const tableCount = await DB.execute(sql`
          SELECT COUNT(*) as count
          FROM information_schema.tables 
          WHERE table_schema = ${schemaName}
        `)

      // Drop schema with CASCADE
      await DB.execute(sql`DROP SCHEMA ${sql.identifier(schemaName)} CASCADE`)

      const tenantTableCheck = await DB.execute(sql`
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'main'
            AND table_name = 'tenants'
          LIMIT 1
        `)

      if (tenantTableCheck.rows.length > 0) {
        await DB.delete(tenants).where(eq(tenants.schema_name, schemaName))
      }

      return generateResponse({
        isSuccess: true,
        message: 'Schema başarıyla silindi',
        data: {
          schemaName,
          tablesDropped: tableCount.rows[0]?.count || 0,
        },
      })
    },
  })
}
