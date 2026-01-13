import * as tables from '@monorepo/db-entities/schemas'
import { DB } from '@monorepo/drizzle-manager'
import { pushSchema } from 'drizzle-kit/api'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { pgSchema } from 'drizzle-orm/pg-core'
import { Client } from 'pg'
import { withChecks } from '@/controllers/utils'
import type { ElysiaRequest } from '@/server'
import { generateResponse } from '@/utils'

type TableModule = {
  tablename: string
  columns: Record<string, object>
  available_schemas: string[]
  createTableForSchema: (schema: ReturnType<typeof pgSchema>) => object
}

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

  if (ctor.includes('Varchar')) return typeof len === 'number' ? `varchar(${len})` : 'varchar(255)'
  if (ctor.includes('Text')) return 'text'
  if (ctor.includes('Boolean')) return 'boolean'
  if (ctor.includes('Timestamp')) return 'timestamp'
  if (ctor.includes('Uuid')) return 'uuid'
  if (ctor.includes('Integer')) return 'integer'
  if (ctor.includes('Decimal')) {
    if (typeof prec === 'number' && typeof scale === 'number') return `decimal(${prec}, ${scale})`
    return 'decimal(10, 2)'
  }
  return 'text'
}

export async function ExpandTenantSchema(req: ElysiaRequest<{ params: { schemaName: string } }>) {
  return await withChecks({
    operationName: 'Expand tenant schema',
    req,
    endpoint: async function endpoint(req: ElysiaRequest<{ params: { schemaName: string } }>) {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not defined')
      }

      const schemaName = req.params.schemaName?.toLowerCase().replace(/[^a-z0-9_]/g, '_')

      if (!schemaName) {
        return generateResponse({
          isSuccess: false,
          message: 'Schema name is required',
          data: null,
          request: req,
        })
      }

      const protectedSchemas = ['public', 'information_schema', 'pg_catalog', 'pg_toast']
      if (protectedSchemas.includes(schemaName)) {
        return generateResponse({
          isSuccess: false,
          message: 'Cannot modify protected schema',
          data: null,
          request: req,
        })
      }

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

      const connUrl = new URL(process.env.DATABASE_URL)
      connUrl.searchParams.set('options', `-c search_path=${schemaName}`)
      const client = new Client({ connectionString: connUrl.toString() })
      await client.connect()
      const tenantDb = drizzle(client)

      const changes = {
        tablesCreated: [] as string[],
        columnsAdded: [] as string[],
        columnsDropped: [] as string[],
      }

      try {
        const schema = pgSchema(schemaName)
        const tenantTables: Record<string, object> = {}

        for (const [key, value] of Object.entries(tables as Record<string, TableModule>)) {
          const mod = value as TableModule
          if (typeof mod.createTableForSchema !== 'function') continue

          // Check if this table should exist in this schema
          const availableSchemas = mod.available_schemas || []
          if (!availableSchemas.includes('*') && !availableSchemas.includes(schemaName)) {
            continue
          }

          const fqName = `${schemaName}.${mod.tablename}`
          const existsRes = await tenantDb.execute(sql`
            SELECT to_regclass(${fqName}) as reg
          `)
          const exists =
            ((existsRes.rows as Array<{ reg: string | null }>)[0]?.reg ?? null) !== null

          if (!exists) {
            tenantTables[key] = mod.createTableForSchema(schema)
            changes.tablesCreated.push(mod.tablename)
          }
        }

        if (Object.keys(tenantTables).length > 0) {
          const plan = await pushSchema({ ...tenantTables }, tenantDb)
          await plan.apply()
        }

        // Sync columns for existing tables
        for (const value of Object.values(tables)) {
          const mod = value as TableModule
          if (!mod || typeof mod.tablename !== 'string' || typeof mod.columns !== 'object') {
            continue
          }

          // Check if this table should exist in this schema
          const availableSchemas = mod.available_schemas || []
          if (!availableSchemas.includes('*') && !availableSchemas.includes(schemaName)) {
            continue
          }

          const existingColsRes = await tenantDb.execute(sql`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = ${schemaName} AND table_name = ${mod.tablename}
          `)
          const existingCols = (existingColsRes.rows as Array<{ column_name: string }>).map(
            (r) => r.column_name
          )

          if (existingCols.length === 0) continue // Table doesn't exist

          const expectedCols = Object.keys(mod.columns)

          // Drop removed columns
          const toDrop = existingCols.filter((c) => !expectedCols.includes(c))
          for (const col of toDrop) {
            const dropSql = `ALTER TABLE "${schemaName}"."${mod.tablename}" DROP COLUMN IF EXISTS "${col}" CASCADE;`
            await tenantDb.execute(sql.raw(dropSql))
            changes.columnsDropped.push(`${mod.tablename}.${col}`)
          }

          // Add missing columns
          const toAdd = expectedCols.filter((c) => !existingCols.includes(c))
          for (const col of toAdd) {
            const colObj = (mod.columns as Record<string, object>)[col]
            if (!colObj) continue
            const typeSql = getSqlTypeForColumn(colObj)
            if (typeSql === null) continue
            const addSql = `ALTER TABLE "${schemaName}"."${mod.tablename}" ADD COLUMN IF NOT EXISTS "${col}" ${typeSql};`
            await tenantDb.execute(sql.raw(addSql))
            changes.columnsAdded.push(`${mod.tablename}.${col}`)
          }
        }
      } finally {
        await client.end()
      }

      return generateResponse({
        isSuccess: true,
        message: 'Schema expanded successfully',
        data: {
          schemaName,
          changes,
        },
        request: req,
      })
    },
  })
}
