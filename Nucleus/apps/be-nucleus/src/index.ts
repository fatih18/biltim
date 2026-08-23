import { createNucleusServer } from 'nucleus-core-ts/server'
import { closePool } from './db'
import { ReportsRoutes } from './routes/reports'

/**
 * Biltim 5S backend.
 *
 * Everything that used to be hand-written here — generic CRUD, AuthV2, the
 * identity/authorization middlewares, claim and role seeding — now comes from
 * nucleus-core-ts and is described in config.json. What stays is what the
 * framework genuinely cannot express: the dashboard aggregates and the Excel
 * export, both raw SQL over the 5S tables.
 *
 * The reports are handed to the server as a route GROUP rather than mounted
 * after a plugin, and the guarantee is the same one the old comment claimed:
 * nucleus's onRequest chain — header stripping, tenant resolution, auth — runs
 * before every route it serves, a host's included, so /reports is still behind
 * it. Those paths are deliberately absent from the public-route list.
 */
async function main() {
  const port = Number(process.env.PORT) || 1002

  await createNucleusServer({
    config: {
      options: './config.json',
      schema: './src/drizzle/schema.ts',
      relations: './src/drizzle/relations.ts',
      swagger: { path: '/docs' },
    } as never,
    port,
    routes: [ReportsRoutes],
    onStop: [async () => { await closePool() }],
  })
  console.log(`\n✅ Biltim API listening on http://localhost:${port}`)
  console.log(`📘 Docs: http://localhost:${port}/docs`)
  console.log(`💚 Health: http://localhost:${port}/health\n`)
}

main()
