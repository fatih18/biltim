#!/usr/bin/env bun
/// <reference types="bun-types" />

import { join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import postgres from 'postgres'
import * as allTables from '../utilities/DbEntities/schemas/index'
import { pushSchema } from 'drizzle-kit/api'
import { drizzle } from 'drizzle-orm/node-postgres'
import { pgSchema } from 'drizzle-orm/pg-core'

const ROOT = join(import.meta.dir, '..')
const BE_DIR = join(ROOT, 'apps/be')
const BE_ENV = join(BE_DIR, '.env')

function readEnvValue(filePath: string, key: string): string | undefined {
    if (!existsSync(filePath)) return undefined
    const raw = readFileSync(filePath, 'utf8')
    const lines = raw.split(/\r?\n/)
    for (const line of lines) {
        const t = line.trim()
        if (!t || t.startsWith('#')) continue
        const i = t.indexOf('=')
        if (i < 0) continue
        const k = t.slice(0, i).trim()
        if (k !== key) continue
        let v = t.slice(i + 1).trim()
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1)
        }
        return v
    }
    return undefined
}

function maskUrl(url: string) {
    try {
        const u = new URL(url)
        if (u.password) u.password = '***'
        return u.toString()
    } catch {
        return '(invalid DATABASE_URL)'
    }
}


const yes = Bun.argv.includes('--yes')
if (!yes) {
    console.log('This will DROP SCHEMA main CASCADE. Re-run with --yes')
    process.exit(1)
}

const dbUrl =
    process.env.DATABASE_URL ||
    readEnvValue(BE_ENV, 'DATABASE_URL') ||
    'postgresql://postgres:password@localhost:5432/biltim' // fallback

if (!dbUrl) {
    console.error('❌ DATABASE_URL not found')
    process.exit(1)
}

async function run() {
    console.log(`🎯 Target DB: ${maskUrl(dbUrl)}`)
    console.log(`📁 backend dir: ${BE_DIR}`)
    console.log('🧨 Resetting schema main...')

    const sql = postgres(dbUrl, {
        max: 1,
        idle_timeout: 5,
        connect_timeout: 10,
        prepare: false,
    })

    try {
        await sql`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid()
    `

        await sql`DROP SCHEMA IF EXISTS main CASCADE`

        console.log('✅ Schema reset complete')
    } finally {
        await sql.end({ timeout: 5 })
    }

    console.log('📚 Applying schema with programmatic pushSchema...')

    const appId = readEnvValue(BE_ENV, 'NUCLEUS_APP_ID') || 'default_be'
    const schema = pgSchema('main')
    // biome-ignore lint/suspicious/noExplicitAny: <too complex without need to define>
    const schemaTables: Record<string, any> = {}

    for (const [key, value] of Object.entries(allTables)) {
        const isTableForApp = value.available_app_ids.includes(appId)
        const isTableForMainTenant =
            value.available_schemas.includes('*') ||
            value.available_schemas.includes('main')
        const isTableExcludedOnMain =
            value.excluded_schemas?.length > 0
                ? (value.excluded_schemas as string[]).includes('main')
                : false

        if (!isTableForMainTenant || isTableExcludedOnMain || !isTableForApp)
            continue
        schemaTables[key] = value.createTableForSchema(schema)
    }

    console.log(`📋 Tables to push (${Object.keys(schemaTables).length}):`, Object.keys(schemaTables))

    const tenantDb = drizzle(dbUrl)
    const push = await pushSchema({ schema, ...schemaTables }, tenantDb)
    await push.apply()

    console.log('✅ pushSchema finished')

    console.log('🎉 DB reset flow finished')
}

run().catch((err) => {
    console.error('❌ reset-db failed:', err)
    process.exit(1)
})
