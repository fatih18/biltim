import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { GRANTS } from './boot'
import { FINDING_READ_CLAIM, FINDING_READ_GRANTS, FINDING_READER_ROLES, claimCovers } from './findingReadGrants'

/** The grants contract of the old finding number (R61): every reader can read it, nobody can write it through a claim. */

const COLUMN = 'previous_finding_no'
const READ_COLUMN = `get.five_s_findings.${COLUMN}`

type Entity = { table_name: string; columns: Array<{ name: string }> }
const config: { entities: Entity[]; authorization: { autoSeedClaims: boolean } } = JSON.parse(
  readFileSync(new URL('../config.json', import.meta.url), 'utf8')
)

describe('the old finding number is a real column that nucleus makes a claim for', () => {
  it('is declared on five_s_findings in config.json, next to finding_no', () => {
    const findings = config.entities.find((entity) => entity.table_name === 'five_s_findings')
    const names = findings?.columns.map((column) => column.name) ?? []
    expect(names).toContain('finding_no')
    expect(names).toContain(COLUMN)
  })

  it('has its claims seeded at start-up, so there is a claim to cover it', () => {
    expect(config.authorization.autoSeedClaims).toBe(true)
  })
})

describe('boot grants every role that reads findings the claim that covers the old number', () => {
  it('names all five roles of the register, each with the table-level read claim', () => {
    const named: string[] = [...FINDING_READER_ROLES]
    expect(named.sort()).toEqual(['Auditor', 'Content Manager Core Team', 'Field Manager', 'Manager', 'Super Admin'])
    for (const role of FINDING_READER_ROLES) {
      expect(GRANTS).toContainEqual([role, FINDING_READ_CLAIM])
    }
    expect(FINDING_READ_GRANTS).toHaveLength(FINDING_READER_ROLES.length)
  })

  it('uses the table claim, which covers any column; a column claim alone would cut the others', () => {
    expect(FINDING_READ_CLAIM).toBe('get.five_s_findings')
    expect(claimCovers(FINDING_READ_CLAIM, READ_COLUMN)).toBe(true)
    expect(claimCovers(FINDING_READ_CLAIM, 'get.five_s_findings.finding_no')).toBe(true)
  })

  it('does not let the read claim of another table, or a write claim, cover the old number', () => {
    expect(claimCovers('get.five_s_audits', READ_COLUMN)).toBe(false)
    expect(claimCovers('get.five_s_findings_extra', READ_COLUMN)).toBe(false)
    expect(claimCovers('put.five_s_findings', READ_COLUMN)).toBe(false)
    expect(claimCovers('get.five_s_findings.finding_no', READ_COLUMN)).toBe(false)
    expect(claimCovers(READ_COLUMN, FINDING_READ_CLAIM)).toBe(false)
  })

  it('lets every role of GRANTS that holds a findings read claim read the old number', () => {
    const readers = GRANTS.filter(([, action]) => action.startsWith('get.five_s_findings'))
    expect(readers.length).toBeGreaterThanOrEqual(FINDING_READER_ROLES.length)
    for (const [, action] of readers) expect(claimCovers(action, READ_COLUMN)).toBe(true)
  })
})

describe('the old number stays written by the system alone', () => {
  it('has no write claim in boot: no post, put, patch or delete claim names the column', () => {
    const writes = GRANTS.filter(([, action]) => /^(post|put|patch|delete)\./.test(action))
    expect(writes.length).toBeGreaterThan(0)
    for (const [, action] of writes) expect(action).not.toContain(COLUMN)
  })

  it('gives no role a table-level post, put or patch claim on findings: that would switch the column cut off', () => {
    const findingWrites = GRANTS.filter(([, action]) => /^(post|put|patch)\.five_s_findings$/.test(action))
    expect(findingWrites).toEqual([])
  })
})
