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

interface BackupData {
  schemaName: string
  tables: BackupTable[]
  metadata: {
    createdAt: string
    version: string
    totalTables: number
    totalRows: number
  }
}

interface RestoreResult {
  schemaName: string
  tablesRestored: number
  rowsRestored: number
  skippedTables: string[]
}

export async function RestoreTenant(
  req: ElysiaRequest<{
    params: { schemaName: string }
    body: { backup: BackupData; mode: 'merge' | 'replace' }
  }>
) {
  return await withChecks({
    operationName: 'Restore tenant',
    req,
    endpoint: async function endpoint(
      req: ElysiaRequest<{
        params: { schemaName: string }
        body: { backup: BackupData; mode: 'merge' | 'replace' }
      }>
    ) {
      const schemaName = req.params.schemaName?.toLowerCase().replace(/[^a-z0-9_]/g, '_')
      const { backup, mode = 'merge' } = req.body || {}

      if (!schemaName) {
        return generateResponse({
          isSuccess: false,
          message: 'Schema name is required',
          data: null,
          request: req,
        })
      }

      if (!backup || !backup.tables) {
        return generateResponse({
          isSuccess: false,
          message: 'Backup data is required',
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

      // Get existing tables
      const existingTables = await DB.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = ${schemaName}
        AND table_type = 'BASE TABLE'
      `)

      const existingTableNames = new Set(
        (existingTables.rows as { table_name: string }[]).map((r) => r.table_name)
      )

      let tablesRestored = 0
      let rowsRestored = 0
      const skippedTables: string[] = []
      const errors: string[] = []

      // Check backup size for warnings
      const totalRows = backup.metadata?.totalRows || 0
      if (totalRows > 50000) {
        console.warn(`Large restore operation: ${totalRows} rows`)
      }

      // Disable triggers temporarily for faster restore
      try {
        await DB.execute(sql.raw(`SET session_replication_role = 'replica'`))
      } catch {
        // Ignore if not supported
      }

      try {
        for (const tableBackup of backup.tables) {
          const { tableName, data } = tableBackup

          // Skip if table doesn't exist in current schema
          if (!existingTableNames.has(tableName)) {
            skippedTables.push(tableName)
            continue
          }

          if (!data || data.length === 0) {
            continue
          }

          try {
            // If replace mode, clear table first
            if (mode === 'replace') {
              await DB.execute(sql.raw(`TRUNCATE TABLE "${schemaName}"."${tableName}" CASCADE`))
            }

            // Get column names from first row
            const firstRow = data[0]
            if (!firstRow) continue
            const columns = Object.keys(firstRow)
            const columnList = columns.map((c) => `"${c}"`).join(', ')

            // Insert data in larger batches for performance
            const batchSize = 500
            for (let i = 0; i < data.length; i += batchSize) {
              const batch = data.slice(i, i + batchSize)

              const values = batch
                .map((row) => {
                  const vals = columns.map((col) => {
                    const val = row[col]
                    if (val === null || val === undefined) return 'NULL'
                    if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
                    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
                    if (val instanceof Date) return `'${val.toISOString()}'`
                    if (typeof val === 'object')
                      return `'${JSON.stringify(val).replace(/'/g, "''")}'`
                    return String(val)
                  })
                  return `(${vals.join(', ')})`
                })
                .join(', ')

              // Use ON CONFLICT DO NOTHING for merge mode
              const conflictClause = mode === 'merge' ? ' ON CONFLICT DO NOTHING' : ''

              await DB.execute(
                sql.raw(
                  `INSERT INTO "${schemaName}"."${tableName}" (${columnList}) VALUES ${values}${conflictClause}`
                )
              )

              rowsRestored += batch.length
            }

            tablesRestored++
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error'
            console.error(`Error restoring table ${tableName}:`, error)
            errors.push(`${tableName}: ${errMsg}`)
            skippedTables.push(`${tableName} (error)`)
          }
        }
      } finally {
        // Re-enable triggers
        try {
          await DB.execute(sql.raw(`SET session_replication_role = 'origin'`))
        } catch {
          // Ignore
        }
      }

      const result: RestoreResult = {
        schemaName,
        tablesRestored,
        rowsRestored,
        skippedTables,
      }

      return generateResponse({
        isSuccess: true,
        message: `Restore completed: ${tablesRestored} tables, ${rowsRestored} rows`,
        data: result,
        request: req,
      })
    },
  })
}
