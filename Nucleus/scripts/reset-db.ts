#!/usr/bin/env bun
/// <reference types="bun-types" />

import { join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import postgres from 'postgres'

const ROOT = join(import.meta.dir, '..')
const BE_DIR = join(ROOT, 'apps/be')
const BE_ENV = join(BE_DIR, '.env')
const DRIZZLE_BIN = join(BE_DIR, 'node_modules', 'drizzle-kit', 'bin.cjs')

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

function runCmd(cmd: string[], cwd: string) {
    const p = Bun.spawnSync(cmd, {
        cwd,
        stdout: 'inherit',
        stderr: 'inherit',
        stdin: 'inherit',
    })
    if (p.exitCode !== 0) {
        throw new Error(`Command failed (${p.exitCode}): ${cmd.join(' ')}`)
    }
}

const yes = Bun.argv.includes('--yes')
if (!yes) {
    console.log('This will DROP SCHEMA public CASCADE. Re-run with --yes')
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
    console.log('🧨 Resetting schema public...')

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

        await sql`DROP SCHEMA IF EXISTS public CASCADE`
        await sql`CREATE SCHEMA public`
        await sql`GRANT ALL ON SCHEMA public TO public`

        console.log('✅ Schema reset complete')
    } finally {
        await sql.end({ timeout: 5 })
    }

    console.log('📚 Applying schema with drizzle push...')
    runCmd(['bun', DRIZZLE_BIN, 'push'], BE_DIR)
    console.log('✅ drizzle push finished')

    const sql2 = postgres(dbUrl, {
        max: 1,
        idle_timeout: 5,
        connect_timeout: 10,
        prepare: false,
    })

    try {
        const rows = await sql2<{ c: number }[]>`
      select count(*)::int as c
      from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
    `
        const count = rows?.[0]?.c ?? 0
        console.log(`🔎 Tables in public schema: ${count}`)

        if (count === 0) {
            throw new Error(
                'public schema is still empty after drizzle push. drizzle.config.ts likely points to a different schema/db.'
            )
        }
    } finally {
        await sql2.end({ timeout: 5 })
    }

    console.log('🎉 DB reset flow finished')
}

run().catch((err) => {
    console.error('❌ reset-db failed:', err)
    process.exit(1)
})
