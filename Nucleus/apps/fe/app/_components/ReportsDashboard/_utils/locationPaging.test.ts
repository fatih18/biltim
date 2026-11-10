import { describe, expect, it } from 'bun:test'
import { nextPagingStep, type PagingState, type PagingStep, pickerStatus } from './locationPaging'

/** What the server answers for a page: that many rows, or a refusal. */
type Reply = number | 'fail'

const idle: PagingState = { hasMore: false, isLoading: false, isLoadingMore: false, failed: false }

/**
 * The picker as it runs, without a browser: the list moves through the same
 * states as useServerList (a request sets the loading flag and clears the
 * error; an answer lowers the flag; a refusal keeps `hasMore` and the page
 * counter where they were), and the rule decides after every change whether to
 * ask again. `cap` ends a reading that never stops.
 */
function readPicker(replies: Reply[], rule: (s: PagingState) => PagingStep = nextPagingStep, cap = 20) {
  let state: PagingState = { ...idle }
  let page = 0
  let rows = 0
  let requests = 0

  const request = (next: number, mode: 'replace' | 'append') => {
    requests += 1
    const reply = replies[next - 1] ?? 'fail'
    if (reply === 'fail') {
      state = { ...state, isLoading: false, isLoadingMore: false, failed: true }
      return
    }
    page = next
    rows = mode === 'replace' ? reply : rows + reply
    state = { hasMore: replies.length > next, isLoading: false, isLoadingMore: false, failed: false }
  }

  request(1, 'replace')
  while (requests < cap && rule(state) === 'read') request(page + 1, 'append')

  return { requests, rows, state, step: nextPagingStep(state), capped: requests >= cap }
}

describe('nextPagingStep', () => {
  it('asks for the next page only when one follows and nothing is in flight', () => {
    expect(nextPagingStep({ ...idle, hasMore: true })).toBe('read')
    expect(nextPagingStep(idle)).toBe('done')
  })

  it('waits while the first page, a reload or a later page is on its way', () => {
    expect(nextPagingStep({ ...idle, isLoading: true })).toBe('wait')
    expect(nextPagingStep({ ...idle, hasMore: true, isLoadingMore: true })).toBe('wait')
    // A reload clears the error when it starts, so the rule waits and then reads from page 1.
    expect(nextPagingStep({ hasMore: true, isLoading: true, isLoadingMore: false, failed: false })).toBe('wait')
  })

  it('stops on a failure even though the list still says another page follows', () => {
    expect(nextPagingStep({ hasMore: true, isLoading: false, isLoadingMore: false, failed: true })).toBe('failed')
  })
})

describe('reading every page of the locations', () => {
  it('reads a second page of 50 after a full first page of 200, then stops', () => {
    const run = readPicker([200, 50])
    expect(run.rows).toBe(250)
    expect(run.requests).toBe(2)
    expect(run.step).toBe('done')
    expect(run.state.failed).toBe(false)
  })

  it('reads three pages when there are three', () => {
    const run = readPicker([200, 200, 7])
    expect(run.rows).toBe(407)
    expect(run.requests).toBe(3)
    expect(run.step).toBe('done')
  })

  it('makes one request when everything fits on the first page', () => {
    const run = readPicker([120])
    expect(run.requests).toBe(1)
    expect(run.step).toBe('done')
  })

  it('stops when the second page fails, asks once, and reports failed', () => {
    const run = readPicker([200, 'fail'])
    expect(run.requests).toBe(2)
    expect(run.capped).toBe(false)
    expect(run.step).toBe('failed')
    expect(run.rows).toBe(200)
    expect(run.state.hasMore).toBe(true)
  })

  it('stops when the first page fails', () => {
    const run = readPicker(['fail'])
    expect(run.requests).toBe(1)
    expect(run.step).toBe('failed')
  })

  it('would loop on a refused page if the error were not part of the rule', () => {
    const blind = (s: PagingState) => nextPagingStep({ ...s, failed: false })
    const run = readPicker([200, 'fail'], blind)
    expect(run.capped).toBe(true)
    expect(run.requests).toBeGreaterThan(10)
  })
})

describe('pickerStatus', () => {
  const base = { requested: true, waitingForScope: false, scoped: false, scopeFailed: false }

  it('is loading before the first request, while pages are read and while the scope is awaited', () => {
    expect(pickerStatus({ ...base, requested: false, list: idle }).loading).toBe(true)
    expect(pickerStatus({ ...base, list: { ...idle, isLoading: true } }).loading).toBe(true)
    expect(pickerStatus({ ...base, list: { ...idle, hasMore: true, isLoadingMore: true } }).loading).toBe(true)
    expect(pickerStatus({ ...base, list: { ...idle, hasMore: true } }).loading).toBe(true)
    expect(pickerStatus({ ...base, waitingForScope: true, list: idle }).loading).toBe(true)
  })

  it('is ready when every page is in', () => {
    expect(pickerStatus({ ...base, list: idle })).toEqual({ loading: false, failed: false })
  })

  it('reaches the error state when a later page failed, although hasMore is still true', () => {
    const list = { hasMore: true, isLoading: false, isLoadingMore: false, failed: true }
    expect(pickerStatus({ ...base, list })).toEqual({ loading: false, failed: true })
  })

  it('reports a failed scope read only for a field manager', () => {
    expect(pickerStatus({ ...base, scoped: true, scopeFailed: true, list: idle }).failed).toBe(true)
    expect(pickerStatus({ ...base, scoped: false, scopeFailed: true, list: idle }).failed).toBe(false)
  })
})
