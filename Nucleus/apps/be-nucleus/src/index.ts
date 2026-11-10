import { type CreateNucleusServerOptions, createNucleusServer } from 'nucleus-core-ts/server'
import { applyBootFixes } from './boot'
import { closePool } from './db'
import { enforceRequestRules } from './guards/requestGuard'
import { startMailWorker, stopMailWorker } from './mail/worker'
import { BiltimRoutes } from './routes/biltim'
import { ReportsRoutes } from './routes/reports'
import { azureNotice, loadServerOptions } from './serverOptions'

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
  // config.json, with the Azure mail on/off switch set from the environment (see serverOptions.ts).
  options: loadServerOptions('./config.json'),
  schema: './src/drizzle/schema.ts',
  relations: './src/drizzle/relations.ts',
  swagger: { path: '/docs' },
}

async function main() {
  const port = Number(process.env.PORT) || 1002
  const mailWarning = azureNotice(process.env)
  if (mailWarning) console.warn(mailWarning)

  await createNucleusServer({
    config,
    port,
    routes: [ReportsRoutes, BiltimRoutes],
    /*
     * The 5S rules that the screens enforce and the API did not.
     *
     * Measured before this existed: PUT /fiveSFindings/<id> {"status":"closed"}
     * answered 200 and closed a finding with no "after" photo, and five
     * consecutive date changes on one plan all answered 200 against a cap of
     * two. Nucleus chains this ahead of its own guard, so it reaches the
     * generated CRUD routes a host route could not.
     */
    onRequest: ({ request, body, query }) => enforceRequestRules({ request, body, query }),
    // Our own pg pool is separate from the framework's; without this it leaked
    // on every restart. `onStop` runs after nucleus's own teardown steps.
    onStop: [stopMailWorker, closePool],
  })

  // After the server is up, so the framework's schema push has run first.
  await applyBootFixes()

  // Plan mails (R70, R63): sent by this worker alone, never by the request that created or completed a plan.
  startMailWorker()

  console.log(`\n✅ Biltim API listening on http://localhost:${port}`)
  console.log(`📘 Docs: http://localhost:${port}/docs`)
  console.log(`💚 Health: http://localhost:${port}/health\n`)
}

main()
