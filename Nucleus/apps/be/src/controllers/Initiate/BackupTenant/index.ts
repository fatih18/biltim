import { DB } from '@monorepo/drizzle-manager'
import { sql } from 'drizzle-orm'
import { withChecks } from '@/controllers/utils'
import type { ElysiaRequest } from '@/server'
import { generateResponse } from '@/utils'

interface BackupTable {
  tableName: string
  rowCount: number
  data: Record<string, unknown>[]
}

interface BackupResult {
  schemaName: string
  tables: BackupTable[]
  metadata: {
    createdAt: string
    version: string
    totalTables: number
    totalRows: number
  }
}

export async function BackupTenant(req: ElysiaRequest<{ params: { schemaName: string } }>) {
  return await withChecks({
    operationName: 'Backup tenant',
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
          message: `Schema '${schemaName}' not found`,
          data: null,
          request: req,
        })
      }

      // Get all tables in the schema
      const tablesResult = await DB.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = ${schemaName}
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `)

      const tables: BackupTable[] = []
      let totalRows = 0

      // Backup each table
      for (const row of tablesResult.rows as { table_name: string }[]) {
        const tableName = row.table_name

        // Get table data using raw SQL
        const tableData = await DB.execute(sql.raw(`SELECT * FROM "${schemaName}"."${tableName}"`))

        const rowCount = tableData.rows?.length || 0
        totalRows += rowCount

        tables.push({
          tableName,
          rowCount,
          data: tableData.rows as Record<string, unknown>[],
        })
      }

      const backup: BackupResult = {
        schemaName,
        tables,
        metadata: {
          createdAt: new Date().toISOString(),
          version: '1.0.0',
          totalTables: tables.length,
          totalRows,
        },
      }

      return generateResponse({
        isSuccess: true,
        message: 'Backup created successfully',
        data: backup,
        request: req,
      })
    },
  })
}
