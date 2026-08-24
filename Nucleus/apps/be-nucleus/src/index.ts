import { type CreateNucleusServerOptions, createNucleusServer } from 'nucleus-core-ts/server'
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
 * Since 0.10 the framework serves itself on Bun.serve and there is no Elysia to
 * mount a plugin into. The guarantee the old wiring claimed still holds and is
 * now structural rather than positional: `createNucleusServer` chains the
 * inbound guard (internal-header stripping, body ceiling) and the auth
 * middleware ahead of EVERY route it serves, a host's own included, and mounts
 * host groups AFTER its own so a colliding path fails at boot instead of
 * silently shadowing. /reports is deliberately absent from the public-route
 * list, so it stays behind that chain.
 */
const config: CreateNucleusServerOptions['config'] = {
  options: './config.json',
  schema: './src/drizzle/schema.ts',
  relations: './src/drizzle/relations.ts',
  swagger: { path: '/docs' },
}

async function main() {
  const port = Number(process.env.PORT) || 1002

  await createNucleusServer({
    config,
    port,
    routes: [ReportsRoutes],
    // Our own pg pool is separate from the framework's; without this it leaked
    // on every restart. `onStop` runs after nucleus's own teardown steps.
    onStop: [closePool],
  })

  console.log(`\n✅ Biltim API listening on http://localhost:${port}`)
  console.log(`📘 Docs: http://localhost:${port}/docs`)
  console.log(`💚 Health: http://localhost:${port}/health\n`)
}

main()
