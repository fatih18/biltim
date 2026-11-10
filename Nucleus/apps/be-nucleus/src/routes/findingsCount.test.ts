import { describe, expect, it } from 'bun:test'
import type { Row } from '../db'
import type { QueryParam } from '../guards/caller'
import { countFindings, FINDINGS_FROM_WHERE, findingsCountSql } from './findingsCount'
import { findingsFilter } from './reports'

describe('findingsCountSql', () => {
  it('counts the rows of the findings register, active findings only', () => {
    const sql = findingsCountSql('')
    expect(sql).toContain('count(*)::int AS total')
    expect(sql).toContain(FINDINGS_FROM_WHERE)
    expect(sql).toContain('LEFT JOIN five_s_audits a ON a.id = f.audit_id')
    expect(sql).toContain('f.is_active = true')
  })

  it('appends the filter exactly as the workbook does, so both name the same findings', () => {
    const f = findingsFilter({
      spellings: null,
      status: 'open,in_progress',
      source: 'audit',
      from: '2026-10-01',
      to: null,
      scopeSpellings: ['Pres'],
    })
    const sql = findingsCountSql(f.sql)
    expect(sql.endsWith(`f.is_active = true${f.sql}`)).toBe(true)
    // Every placeholder in the statement has its value.
    const used = new Set([...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1])))
    expect([...used].sort()).toEqual(f.params.map((_, n) => n + 1))
  })
})

describe('countFindings', () => {
  const answering = (rows: Row[]) => {
    const calls: { text: string; params: QueryParam[] }[] = []
    const read = async (text: string, params: QueryParam[]) => {
      calls.push({ text, params })
      return rows
    }
    return { read, calls }
  }

  it('reads the count with the filter and its parameters', async () => {
    const { read, calls } = answering([{ total: 12 }])
    const where = ' AND f.status = ANY($1::text[])'
    expect(await countFindings(where, [['open', 'in_progress']], read)).toBe(12)
    expect(calls).toEqual([{ text: findingsCountSql(where), params: [['open', 'in_progress']] }])
  })

  it('reads the count of a driver that answers a number as text', async () => {
    expect(await countFindings('', [], answering([{ total: '7' }]).read)).toBe(7)
  })

  it('is 0 when the answer has no row or no number', async () => {
    expect(await countFindings('', [], answering([]).read)).toBe(0)
    expect(await countFindings('', [], answering([{ total: null }]).read)).toBe(0)
    expect(await countFindings('', [], answering([{ total: 'many' }]).read)).toBe(0)
  })
})
