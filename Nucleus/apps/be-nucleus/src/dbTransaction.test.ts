import { describe, expect, it } from 'bun:test'
import { type TransactionPool, runTransaction } from './db'
import type { QueryParam } from './guards/caller'

/** `runTransaction` against a pool that records what it is asked, with no database. */

type Call = { text: string; params: QueryParam[] | undefined }

function fakePool(options: { failOn?: string; failRollback?: boolean } = {}) {
  const calls: Call[] = []
  const events: string[] = []
  const released: Array<Error | undefined> = []
  const pool: TransactionPool = {
    connect: async () => {
      events.push('connect')
      return {
        query: async (text, params) => {
          calls.push({ text, params })
          events.push(text)
          if (text === options.failOn) throw new Error(`${text} failed`)
          if (text === 'rollback' && options.failRollback) throw new Error('rollback failed')
          return { rows: text.startsWith('select') ? [{ n: 1 }] : [] }
        },
        release: (error) => {
          events.push('release')
          released.push(error)
        },
      }
    },
  }
  return { pool, calls, events, released }
}

describe('runTransaction', () => {
  it('commits what the work did and hands the connection back once, clean', async () => {
    const { pool, events, released } = fakePool()
    const result = await runTransaction(pool, async (sql) => (await sql('select 1'))[0]?.n)
    expect(result).toBe(1)
    expect(events).toEqual(['connect', 'begin', 'select 1', 'commit', 'release'])
    expect(released).toEqual([undefined])
  })

  it('runs every statement of the work on the one connection, binding [] when it names no parameters', async () => {
    const { pool, calls } = fakePool()
    await runTransaction(pool, async (sql) => {
      await sql('select 1')
      await sql('update t set a = $1', ['x'])
    })
    expect(calls.filter((c) => c.text !== 'begin' && c.text !== 'commit')).toEqual([
      { text: 'select 1', params: [] },
      { text: 'update t set a = $1', params: ['x'] },
    ])
  })

  it('rolls back and rethrows when the work throws, never commits, and releases once', async () => {
    const { pool, events, released } = fakePool()
    const boom = new Error('boom')
    await expect(
      runTransaction(pool, async (sql) => {
        await sql('select 1')
        throw boom
      })
    ).rejects.toBe(boom)
    expect(events).toEqual(['connect', 'begin', 'select 1', 'rollback', 'release'])
    expect(released).toEqual([undefined])
  })

  it('rolls back when the commit itself fails', async () => {
    const { pool, events, released } = fakePool({ failOn: 'commit' })
    await expect(runTransaction(pool, async () => 'done')).rejects.toThrow('commit failed')
    expect(events).toEqual(['connect', 'begin', 'commit', 'rollback', 'release'])
    expect(released).toEqual([undefined])
  })

  it('drops a connection whose rollback failed (release gets the error) and still throws the original one', async () => {
    const { pool, released } = fakePool({ failRollback: true })
    await expect(
      runTransaction(pool, async () => {
        throw new Error('boom')
      })
    ).rejects.toThrow('boom')
    expect(released).toHaveLength(1)
    expect(released[0]?.message).toBe('rollback failed')
  })
})
