import { describe, expect, it } from 'bun:test'
import {
  type NumberLog,
  RENUMBER_FINDING_SQL,
  SHARED_FINDING_NUMBERS_SQL,
  renumberDuplicateFindings,
} from './findingNumbers'
import type { Row } from './db'
import type { QueryParam } from './guards/caller'

/** The renumbering against a scripted database: no SQL runs, the statements and their order are what is proven. */

type Call = { text: string; params: QueryParam[] | undefined }

function fakeDb(options: { shared: Row[]; nextNumber?: number; failFor?: string[]; unmatched?: string[] }) {
  const calls: Call[] = []
  let next = options.nextNumber ?? 100
  const run = async (text: string, params?: QueryParam[]): Promise<Row[]> => {
    calls.push({ text, params })
    if (text === SHARED_FINDING_NUMBERS_SQL) return options.shared
    if (text === RENUMBER_FINDING_SQL) {
      const id = String(params?.[0])
      if (options.failFor?.includes(id)) throw new Error(`update of ${id} failed`)
      if (options.unmatched?.includes(id)) return []
      next += 1
      return [{ finding_no: next }]
    }
    return []
  }
  const updates = () => calls.filter((c) => c.text === RENUMBER_FINDING_SQL)
  return { run, calls, updates }
}

function fakeLog() {
  const lines: string[] = []
  const errors: string[] = []
  const log: NumberLog = { log: (line) => lines.push(line), error: (line) => errors.push(line) }
  return { log, lines, errors }
}

describe('renumberDuplicateFindings', () => {
  it('does nothing when no number is shared: one read, no update, no log', async () => {
    const db = fakeDb({ shared: [] })
    const { log, lines, errors } = fakeLog()
    const result = await renumberDuplicateFindings(db.run, log)
    expect(result).toEqual({ renumbered: [], failed: 0 })
    expect(db.calls).toHaveLength(1)
    expect(db.updates()).toHaveLength(0)
    expect(lines).toEqual([])
    expect(errors).toEqual([])
  })

  it('one pair: the older row keeps its number, the newer takes the next one', async () => {
    const db = fakeDb({
      shared: [
        { id: 'ssh-1', finding_no: 1 },
        { id: 'bolge3-1', finding_no: 1 },
      ],
    })
    const { log, lines } = fakeLog()
    const result = await renumberDuplicateFindings(db.run, log)
    expect(db.updates().map((c) => c.params)).toEqual([['bolge3-1', 1]])
    expect(result.renumbered).toEqual([{ id: 'bolge3-1', from: 1, to: 101 }])
    expect(lines).toEqual(['[boot] bulgu #1 → #101 olarak yeniden numaralandı (bolge3-1)'])
  })

  it('two pairs: both newer rows are renumbered, in the order they were created, one log line each', async () => {
    const db = fakeDb({
      shared: [
        { id: 'ssh-1', finding_no: 1 },
        { id: 'ssh-2', finding_no: 2 },
        { id: 'bolge3-1', finding_no: 1 },
        { id: 'bolge3-2', finding_no: 2 },
      ],
    })
    const { log, lines, errors } = fakeLog()
    const result = await renumberDuplicateFindings(db.run, log)
    expect(db.updates().map((c) => c.params)).toEqual([
      ['bolge3-1', 1],
      ['bolge3-2', 2],
    ])
    expect(result.renumbered).toEqual([
      { id: 'bolge3-1', from: 1, to: 101 },
      { id: 'bolge3-2', from: 2, to: 102 },
    ])
    expect(lines).toEqual([
      '[boot] bulgu #1 → #101 olarak yeniden numaralandı (bolge3-1)',
      '[boot] bulgu #2 → #102 olarak yeniden numaralandı (bolge3-2)',
    ])
    expect(errors).toEqual([])
  })

  it('three rows with one number: the oldest keeps it, the other two are renumbered in order', async () => {
    const db = fakeDb({
      shared: [
        { id: 'a', finding_no: 7 },
        { id: 'b', finding_no: 7 },
        { id: 'c', finding_no: 7 },
      ],
      nextNumber: 40,
    })
    const result = await renumberDuplicateFindings(db.run, fakeLog().log)
    expect(db.updates().map((c) => c.params)).toEqual([
      ['b', 7],
      ['c', 7],
    ])
    expect(result.renumbered.map((r) => [r.id, r.from, r.to])).toEqual([
      ['b', 7, 41],
      ['c', 7, 42],
    ])
  })

  it('reads a number the driver returns as text', async () => {
    const db = fakeDb({
      shared: [
        { id: 'a', finding_no: '3' },
        { id: 'b', finding_no: '3' },
      ],
    })
    const result = await renumberDuplicateFindings(db.run, fakeLog().log)
    expect(result.renumbered).toEqual([{ id: 'b', from: 3, to: 101 }])
  })

  it('a failing update is logged and counted, and the rest continues', async () => {
    const db = fakeDb({
      shared: [
        { id: 'a', finding_no: 1 },
        { id: 'b', finding_no: 1 },
        { id: 'c', finding_no: 1 },
        { id: 'd', finding_no: 2 },
        { id: 'e', finding_no: 2 },
      ],
      failFor: ['b'],
    })
    const { log, lines, errors } = fakeLog()
    const result = await renumberDuplicateFindings(db.run, log)
    expect(db.updates().map((c) => c.params)).toEqual([
      ['b', 1],
      ['c', 1],
      ['e', 2],
    ])
    expect(result.failed).toBe(1)
    expect(result.renumbered.map((r) => r.id)).toEqual(['c', 'e'])
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('#1')
    expect(errors[0]).toContain('(b)')
    expect(errors[0]).toContain('update of b failed')
    expect(lines).toHaveLength(2)
  })

  it('skips a row another run already renumbered (the guarded update matched nothing) without a log or a failure', async () => {
    const db = fakeDb({
      shared: [
        { id: 'a', finding_no: 5 },
        { id: 'b', finding_no: 5 },
      ],
      unmatched: ['b'],
    })
    const { log, lines, errors } = fakeLog()
    const result = await renumberDuplicateFindings(db.run, log)
    expect(result).toEqual({ renumbered: [], failed: 0 })
    expect(lines).toEqual([])
    expect(errors).toEqual([])
  })

  it('throws when the first read fails, so boot logs it once', async () => {
    const run = async (): Promise<Row[]> => {
      throw new Error('relation does not exist')
    }
    await expect(renumberDuplicateFindings(run, fakeLog().log)).rejects.toThrow('relation does not exist')
  })
})
