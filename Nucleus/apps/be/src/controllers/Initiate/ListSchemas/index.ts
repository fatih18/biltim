import { DB } from '@monorepo/drizzle-manager'
import { sql } from 'drizzle-orm'
import { withChecks } from '@/controllers/utils'
import type { ElysiaRequest } from '@/server'
import { generateResponse } from '@/utils'

export async function ListSchemas(req: ElysiaRequest<{ params: { schemaName: string } }>) {
  return await withChecks({
    operationName: 'List schemas',
    req,
    endpoint: async function endpoint(
      req: ElysiaRequest<{
        params: { schemaName: string }
      }>
    ) {
      const schemaName = req.params.schemaName

      console.log(`Getting info for schema: ${schemaName}`)

      // Get schema basic info
      const schemaInfo = await DB.execute(sql`
          SELECT 
            schema_name,
            schema_owner
          FROM information_schema.schemata 
          WHERE schema_name = ${schemaName}
        `)

      if (schemaInfo.rows.length === 0) {
        return generateResponse({
          isSuccess: false,
          message: 'Schema bulunamadı',
          data: null,
        })
      }

      // Get tables in schema
      const tables = await DB.execute(sql`
          SELECT 
            table_name,
            table_type,
            (SELECT COUNT(*) 
             FROM information_schema.columns c 
             WHERE c.table_schema = t.table_schema 
             AND c.table_name = t.table_name) as column_count
          FROM information_schema.tables t
          WHERE table_schema = ${schemaName}
          ORDER BY table_name
        `)

      // Get indexes in schema
      const indexes = await DB.execute(sql`
          SELECT 
            schemaname,
            tablename,
            indexname,
            indexdef
          FROM pg_indexes 
          WHERE schemaname = ${schemaName}
          ORDER BY tablename, indexname
        `)

      // Get foreign keys
      const foreignKeys = await DB.execute(sql`
          SELECT 
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            tc.constraint_name
          FROM information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_schema = ${schemaName}
          ORDER BY tc.table_name
        `)

      return generateResponse({
        isSuccess: true,
        message: 'Schema bilgileri başarıyla alındı',
        data: {
          schema: schemaInfo.rows[0],
          tables: tables.rows,
          indexes: indexes.rows,
          foreignKeys: foreignKeys.rows,
          summary: {
            tableCount: tables.rows.length,
            indexCount: indexes.rows.length,
            foreignKeyCount: foreignKeys.rows.length,
          },
        },
      })
    },
  })
}
