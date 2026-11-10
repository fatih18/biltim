import { describe, expect, it } from 'bun:test'
import { conflictKey, conflictView, isChecking, takeAnswer, type DayConflictAnswer } from './dayConflictState'

const key = conflictKey('plan-1', '2026-11-10', 0)
const ready = (warnings: string[]): DayConflictAnswer => ({ key, failed: false, warnings })

describe('conflictKey', () => {
  it('is the same question for the same plan, day and attempt', () => {
    expect(conflictKey('p', '2026-11-10', 0)).toBe(conflictKey('p', '2026-11-10', 0))
  })

  it('is another question for another plan, another day or a retry', () => {
    const base = conflictKey('p', '2026-11-10', 0)
    expect(conflictKey('q', '2026-11-10', 0)).not.toBe(base)
    expect(conflictKey('p', '2026-11-11', 0)).not.toBe(base)
    expect(conflictKey('p', '2026-11-10', 1)).not.toBe(base)
  })
})

describe('isChecking', () => {
  it('needs a way to read and a chosen day', () => {
    expect(isChecking(true, '2026-11-10')).toBe(true)
    expect(isChecking(false, '2026-11-10')).toBe(false)
    expect(isChecking(true, '')).toBe(false)
  })
})

describe('takeAnswer', () => {
  it('keeps the answer of the newest request, warnings and all', () => {
    expect(takeAnswer({ latest: 3, request: 3, key, outcome: { failed: false, warnings: ['Ekip meşgul.'] } })).toEqual(
      ready(['Ekip meşgul.'])
    )
  })

  it('keeps an empty list as a real answer: nothing clashes', () => {
    expect(takeAnswer({ latest: 1, request: 1, key, outcome: { failed: false, warnings: [] } })).toEqual(ready([]))
  })

  it('keeps a failed read as a failure with no warnings', () => {
    expect(takeAnswer({ latest: 2, request: 2, key, outcome: { failed: true } })).toEqual({
      key,
      failed: true,
      warnings: [],
    })
  })

  it('drops a late answer, whether it brings warnings, nothing or a failure', () => {
    expect(takeAnswer({ latest: 4, request: 3, key, outcome: { failed: false, warnings: ['Eski gün.'] } })).toBeNull()
    expect(takeAnswer({ latest: 4, request: 3, key, outcome: { failed: false, warnings: [] } })).toBeNull()
    expect(takeAnswer({ latest: 4, request: 3, key, outcome: { failed: true } })).toBeNull()
  })

  it('drops an answer that arrives after the screen left (the cleanup moved latest on)', () => {
    expect(takeAnswer({ latest: 2, request: 1, key, outcome: { failed: false, warnings: [] } })).toBeNull()
  })
})

describe('conflictView', () => {
  it('is idle, with no warnings, when there is nothing to check', () => {
    expect(conflictView({ active: false, key, answer: ready(['eski']) })).toEqual({ status: 'idle', warnings: [] })
  })

  it('is loading until the question has an answer', () => {
    expect(conflictView({ active: true, key, answer: null })).toEqual({ status: 'loading', warnings: [] })
  })

  it('is loading, not ready, when the last answer is for another day', () => {
    const other = { ...ready(['Başka günün uyarısı.']), key: conflictKey('plan-1', '2026-11-09', 0) }
    expect(conflictView({ active: true, key, answer: other })).toEqual({ status: 'loading', warnings: [] })
  })

  it('is ready with the warnings of its own answer', () => {
    expect(conflictView({ active: true, key, answer: ready(['Ekip meşgul.']) })).toEqual({
      status: 'ready',
      warnings: ['Ekip meşgul.'],
    })
  })

  it('is ready with no warnings when nothing clashes', () => {
    expect(conflictView({ active: true, key, answer: ready([]) })).toEqual({ status: 'ready', warnings: [] })
  })

  it('is failed when the read failed: a failed read does not look like "no clash"', () => {
    const failed = takeAnswer({ latest: 1, request: 1, key, outcome: { failed: true } })
    const view = conflictView({ active: true, key, answer: failed })
    expect(view.status).toBe('failed')
    expect(view.status).not.toBe('ready')
  })

  it('goes back to loading on retry: the retry is a new key, the failed answer is not its answer', () => {
    const failed = takeAnswer({ latest: 1, request: 1, key, outcome: { failed: true } })
    const retried = conflictKey('plan-1', '2026-11-10', 1)
    expect(conflictView({ active: true, key: retried, answer: failed })).toEqual({ status: 'loading', warnings: [] })
  })
})
