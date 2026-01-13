import * as tables from '@monorepo/db-entities/schemas'
import { DB } from '@monorepo/drizzle-manager'
import { pushSchema } from 'drizzle-kit/api'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { pgSchema } from 'drizzle-orm/pg-core'
import { Client } from 'pg'
import { withChecks } from '@/controllers/utils'
import type { ElysiaRequestWOBody } from '@/server'
import { generateResponse } from '@/utils'

// Type alias for schema modules we iterate through
type TableModule = {
  tablename: string
  columns: Record<string, object>
  createTableForSchema: (schema: ReturnType<typeof pgSchema>) => object
}

// Best-effort runtime metadata for drizzle columns (avoid any/unknown)
type ColumnIntrospectable = {
  constructor?: { name?: string }
  config?: { length?: number; precision?: number; scale?: number }
}

function getSqlTypeForColumn(col: object): string | null {
  const c = col as ColumnIntrospectable
  const ctor = c.constructor?.name ?? ''
  const len = c.config?.length
  const prec = c.config?.precision
  const scale = c.config?.scale

  if (ctor.includes('Varchar')) {
    return typeof len === 'number' ? `varchar(${len})` : 'varchar(255)'
  }
  if (ctor.includes('Text')) return 'text'
  if (ctor.includes('Boolean')) return 'boolean'
  if (ctor.includes('Timestamp')) return 'timestamp'
  if (ctor.includes('Uuid')) return 'uuid'
  if (ctor.includes('Integer')) return 'integer'
  if (ctor.includes('Decimal')) {
    if (typeof prec === 'number' && typeof scale === 'number') {
      return `decimal(${prec}, ${scale})`
    }
    return 'decimal(10, 2)'
  }
  // Fallback to a safe type to ensure the column gets added
  return 'text'
}

export async function ExpandSchema(req: ElysiaRequestWOBody) {
  return await withChecks({
    operationName: 'Expand schema (push latest table changes)',
    req,
    endpoint: async function endpoint() {
      if (!process.env.DATABASE_URL) {
        console.error('❗❗❗ DATABASE_URL is not defined')
        throw new Error('DATABASE_URL is not defined')
      }

      const schemaName = 'main'

      // Safety: do not allow pushing into system schemas
      const protectedSchemas = ['public', 'information_schema', 'pg_catalog', 'pg_toast']
      if (protectedSchemas.includes(schemaName)) {
        return generateResponse({
          isSuccess: false,
          message: 'Korumalı schema üzerinde işlem yapılamaz',
          data: null,
        })
      }

      // Ensure schema exists before attempting to push changes
      const schemaExists = await DB.execute(sql`
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name = ${schemaName}
      `)

      if (schemaExists.rows.length === 0) {
        return generateResponse({
          isSuccess: false,
          message: 'Schema bulunamadı',
          data: { schemaName },
        })
      }

      // Use a dedicated client with search_path set to the tenant schema
      const connUrl = new URL(process.env.DATABASE_URL)
      connUrl.searchParams.set('options', `-c search_path=${schemaName}`)
      const client = new Client({ connectionString: connUrl.toString() })
      await client.connect()
      const tenantDb = drizzle(client)
      try {
        const schema = pgSchema(schemaName)
        const tenantTables: Record<string, object> = {}
        for (const [key, value] of Object.entries(tables as Record<string, TableModule>)) {
          const mod = value as TableModule
          if (typeof mod.createTableForSchema !== 'function') continue
          // Only include tables missing in DB; avoid CREATE TABLE on existing ones
          const fqName = `${schemaName}.${mod.tablename}`
          const existsRes = await tenantDb.execute(sql`
            SELECT to_regclass(${fqName}) as reg
          `)
          const exists =
            ((existsRes.rows as Array<{ reg: string | null }>)[0]?.reg ?? null) !== null
          if (!exists) tenantTables[key] = mod.createTableForSchema(schema)
        }

        // Full-sync: rely on connection search_path for schema scoping; avoid passing `schema` to prevent CREATE SCHEMA
        if (Object.keys(tenantTables).length > 0) {
          const plan = await pushSchema({ ...tenantTables }, tenantDb)
          await plan.apply()
        }

        // Post-sync: drop removed columns and add missing columns
        for (const value of Object.values(tables)) {
          const mod = value as TableModule
          if (!mod || typeof mod.tablename !== 'string' || typeof mod.columns !== 'object') {
            continue
          }

          // Fetch existing columns in the tenant DB for this table
          const existingColsRes = await tenantDb.execute(sql`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = ${schemaName} AND table_name = ${mod.tablename}
          `)
          const existingCols = (existingColsRes.rows as Array<{ column_name: string }>).map(
            (r) => r.column_name
          )

          // Expected columns from code
          const expectedCols = Object.keys(mod.columns)

          // Columns to drop = present in DB but not defined in code
          const toDrop = existingCols.filter((c) => !expectedCols.includes(c))
          for (const col of toDrop) {
            // Use quoted identifiers to avoid SQL injection; schemaName was sanitized earlier
            const dropSql = `ALTER TABLE "${schemaName}"."${mod.tablename}" DROP COLUMN IF EXISTS "${col}" CASCADE;`
            await tenantDb.execute(sql.raw(dropSql))
          }

          // Columns to add = defined in code but missing in DB
          const toAdd = expectedCols.filter((c) => !existingCols.includes(c))
          for (const col of toAdd) {
            const colObj = (mod.columns as Record<string, object>)[col]
            if (!colObj) continue
            const typeSql = getSqlTypeForColumn(colObj)
            if (typeSql === null) {
              // Skip if type cannot be inferred safely
              continue
            }
            const addSql = `ALTER TABLE "${schemaName}"."${mod.tablename}" ADD COLUMN IF NOT EXISTS "${col}" ${typeSql};`
            await tenantDb.execute(sql.raw(addSql))
          }
        }
      } finally {
        await client.end()
      }

      return generateResponse({
        isSuccess: true,
        message: 'Schema değişiklikleri başarıyla push edildi',
        data: { schemaName },
      })
    },
  })
}
