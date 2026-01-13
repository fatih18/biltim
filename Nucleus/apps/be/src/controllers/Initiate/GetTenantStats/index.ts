import { DB, getTenantDB } from '@monorepo/drizzle-manager'
import { sql } from 'drizzle-orm'
import { withChecks } from '@/controllers/utils'
import type { ElysiaRequest } from '@/server'
import { generateResponse } from '@/utils'

export async function GetTenantStats(req: ElysiaRequest<{ params: { schemaName: string } }>) {
  return await withChecks({
    operationName: 'Get tenant stats',
    req,
    endpoint: async function endpoint(req: ElysiaRequest<{ params: { schemaName: string } }>) {
      const schemaName = req.params.schemaName?.toLowerCase().replace(/[^a-z0-9_]/g, '_')

      if (!schemaName) {
        return generateResponse({
          isSuccess: false,
          message: 'Schema name is required',
          data: null,
          request: req,
        })
      }

      // Check schema exists
      const schemaExists = await DB.execute(sql`
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name = ${schemaName}
      `)

      if (schemaExists.rows.length === 0) {
        return generateResponse({
          isSuccess: false,
          message: 'Schema not found',
          data: { schemaName },
          request: req,
        })
      }

      // Get table stats
      const tableStats = await DB.execute(sql`
        SELECT 
          t.table_name,
          (SELECT COUNT(*) FROM information_schema.columns c 
           WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) as column_count
        FROM information_schema.tables t
        WHERE t.table_schema = ${schemaName}
        AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name
      `)

      // Get row counts for each table
      const entityCounts: Record<string, number> = {}
      for (const row of tableStats.rows as Array<{ table_name: string; column_count: number }>) {
        try {
          const countResult = await DB.execute(
            sql.raw(`SELECT COUNT(*) as count FROM "${schemaName}"."${row.table_name}"`)
          )
          entityCounts[row.table_name] = Number(
            (countResult.rows[0] as { count: number })?.count || 0
          )
        } catch {
          entityCounts[row.table_name] = 0
        }
      }

      // Get database size for this schema
      const sizeResult = await DB.execute(sql`
        SELECT 
          COALESCE(SUM(pg_total_relation_size(quote_ident(table_schema) || '.' || quote_ident(table_name))), 0) as total_size
        FROM information_schema.tables
        WHERE table_schema = ${schemaName}
        AND table_type = 'BASE TABLE'
      `)

      const totalSizeBytes = Number((sizeResult.rows[0] as { total_size: number })?.total_size || 0)
      const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2)

      // Get index count
      const indexCount = await DB.execute(sql`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE schemaname = ${schemaName}
      `)

      // Get FK count
      const fkCount = await DB.execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.table_constraints
        WHERE table_schema = ${schemaName}
        AND constraint_type = 'FOREIGN KEY'
      `)

      // Get admin profile (first_name, last_name, email) from tenant schema
      let adminProfile: {
        firstName: string | null
        lastName: string | null
        email: string | null
      } | null = null

      try {
        const tenantDB = await getTenantDB(schemaName)
        const adminResult = await tenantDB.execute(
          sql`SELECT p.first_name, p.last_name, u.email
              FROM profiles p
              JOIN users u ON u.id = p.user_id
              WHERE u.is_god = true
              ORDER BY p.updated_at DESC
              LIMIT 1`
        )

        console.log('📊 Admin Profile Query Result:', JSON.stringify(adminResult, null, 2))

        // Handle different result formats
        const resultRows = Array.isArray(adminResult)
          ? adminResult
          : (adminResult as { rows?: unknown[] }).rows
        console.log('📊 Extracted rows:', JSON.stringify(resultRows, null, 2))

        const row = resultRows?.[0] as
          | {
              first_name: string | null
              last_name: string | null
              email: string | null
            }
          | undefined

        if (row) {
          adminProfile = {
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email,
          }
          console.log('📊 Admin Profile:', adminProfile)
        }
      } catch (profileError) {
        console.error('Failed to load tenant admin profile:', profileError)
      }

      return generateResponse({
        isSuccess: true,
        message: 'Stats retrieved successfully',
        data: {
          schemaName,
          tables: {
            count: tableStats.rows.length,
            details: tableStats.rows,
          },
          entityCounts,
          indexes: {
            count: Number((indexCount.rows[0] as { count: number })?.count || 0),
          },
          foreignKeys: {
            count: Number((fkCount.rows[0] as { count: number })?.count || 0),
          },
          storage: {
            totalBytes: totalSizeBytes,
            totalMB: totalSizeMB,
          },
          summary: {
            totalTables: tableStats.rows.length,
            totalRecords: Object.values(entityCounts).reduce((a, b) => a + b, 0),
            totalIndexes: Number((indexCount.rows[0] as { count: number })?.count || 0),
            totalForeignKeys: Number((fkCount.rows[0] as { count: number })?.count || 0),
          },
          adminProfile,
        },
        request: req,
      })
    },
  })
}
