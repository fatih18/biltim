import { describe, expect, it } from 'bun:test'
import {
  FINDING_NO_UNIQUE_INDEX,
  FINDING_NO_UNIQUE_INDEX_SQL,
  type NumberLog,
  RENUMBER_FINDING_SQL,
  SHARED_FINDING_NUMBERS_SQL,
  ensureUniqueFindingNumbers,
} from './findingNumbers'

/** The statements the renumbering sends and the unique index step, checked as text and with a scripted database. */

function fakeLog() {
  const lines: string[] = []
  const errors: string[] = []
  const log: NumberLog = { log: (line) => lines.push(line), error: (line) => errors.push(line) }
  return { log, lines, errors }
}

describe('the statements', () => {
  it('read every row, active or not, oldest first by created_at then id', () => {
    expect(SHARED_FINDING_NUMBERS_SQL).toContain('main.five_s_findings')
    expect(SHARED_FINDING_NUMBERS_SQL).toContain('having count(*) > 1')
    expect(SHARED_FINDING_NUMBERS_SQL).toContain('order by created_at, id')
    expect(SHARED_FINDING_NUMBERS_SQL).not.toContain('is_active')
  })

  it('take the next number from the identity sequence, keep the first old number, and guard on the row and its number', () => {
    expect(RENUMBER_FINDING_SQL).toContain("nextval(pg_get_serial_sequence('main.five_s_findings', 'finding_no')::regclass)")
    expect(RENUMBER_FINDING_SQL).toContain('previous_finding_no = coalesce(previous_finding_no, finding_no)')
    expect(RENUMBER_FINDING_SQL).toContain('where id = $1 and finding_no = $2')
    expect(RENUMBER_FINDING_SQL).not.toContain('updated_at')
  })

  it('build the unique index idempotently, under the name config.json declares', () => {
    expect(FINDING_NO_UNIQUE_INDEX).toBe('five_s_findings_finding_no_uq')
    expect(FINDING_NO_UNIQUE_INDEX_SQL).toContain('create unique index if not exists five_s_findings_finding_no_uq')
    expect(FINDING_NO_UNIQUE_INDEX_SQL).toContain('on main.five_s_findings (finding_no)')
  })
})

describe('ensureUniqueFindingNumbers', () => {
  it('creates the index with one statement and says nothing', async () => {
    const calls: string[] = []
    const { log, lines, errors } = fakeLog()
    const ok = await ensureUniqueFindingNumbers(async (text) => {
      calls.push(text)
      return []
    }, log)
    expect(ok).toBe(true)
    expect(calls).toEqual([FINDING_NO_UNIQUE_INDEX_SQL])
    expect(lines).toEqual([])
    expect(errors).toEqual([])
  })

  it('logs a clear line and returns false when a duplicate is still stored', async () => {
    const { log, errors } = fakeLog()
    const ok = await ensureUniqueFindingNumbers(async () => {
      throw new Error('could not create unique index: key (finding_no)=(1) is duplicated')
    }, log)
    expect(ok).toBe(false)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('finding_no tekillik indeksi kurulamadı')
    expect(errors[0]).toContain('is duplicated')
  })
})
