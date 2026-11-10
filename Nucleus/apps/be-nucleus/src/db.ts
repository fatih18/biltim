import { Pool } from 'pg'

/**
 * Custom (non-CRUD) routes run raw aggregate SQL that the generated entity
 * routes cannot express, so they need their own handle. Kept small and shared:
 * one pool for the whole process, sized well under the framework's own so the
 * two together stay below Postgres' max_connections.
 *
 * timezone=UTC is deliberate: biltim's timestamp columns carry no zone, and a
 * session on Europe/Istanbul would make now() write local time into them —
 * three hours off from every row already stored.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  options: '-c timezone=UTC -c search_path=main,public',
})

export type Row = Record<string, unknown>

export async function query(text: string, params: unknown[] = []): Promise<Row[]> {
  const res = await pool.query(text, params)
  return res.rows as Row[]
}

export type Sql = (text: string, params?: unknown[]) => Promise<Row[]>

/**
 * One transaction on one connection: everything `work` runs through the `sql`
 * it is handed commits together or not at all. A throw rolls back and is
 * rethrown. A connection whose rollback failed is dropped, not returned.
 */
export async function transaction<T>(work: (sql: Sql) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  let broken: Error | undefined
  try {
    await client.query('begin')
    const result = await work(async (text, params = []) => (await client.query(text, params)).rows as Row[])
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback').catch((rollbackError: Error) => {
      broken = rollbackError
    })
    throw error
  } finally {
    client.release(broken)
  }
}

export async function closePool(): Promise<void> {
  await pool.end().catch(() => undefined)
}
