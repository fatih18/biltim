import { Elysia } from 'elysia'
import { NucleusElysiaPlugin } from 'nucleus-core-ts'
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
 * The plugin is mounted BEFORE the custom routes so its onRequest chain
 * (header stripping, tenant resolution, auth) also guards /reports — those
 * paths are deliberately absent from the public-route list.
 */
async function main() {
  const app = new Elysia()
    .use(
      await NucleusElysiaPlugin({
        options: './config.json',
        schema: './src/drizzle/schema.ts',
        relations: './src/drizzle/relations.ts',
        swagger: { path: '/docs' },
      })
    )
    .use(ReportsRoutes)

  app.onStop(async () => {
    await closePool()
  })

  const port = Number(process.env.PORT) || 1002
  app.listen(port)
  console.log(`\n✅ Biltim API listening on http://localhost:${port}`)
  console.log(`📘 Docs: http://localhost:${port}/docs`)
  console.log(`💚 Health: http://localhost:${port}/health\n`)
}

main()
