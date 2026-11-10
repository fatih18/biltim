import { describe, expect, it } from 'bun:test'
import {
  IDS_PER_READ,
  LIST_MAX_PAGES,
  LIST_PAGE_SIZE,
  isAbortError,
  readAllPages,
  readByIds,
  type Condition,
  type ListRow,
  type PageRequest,
  type PageStarter,
} from './index'

const rowsOf = (count: number, prefix = 'r'): ListRow[] =>
  Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${String(i).padStart(4, '0')}`, team_id: `t-${i % 7}` }))

const holds = (row: ListRow, condition: Condition): boolean => {
  const value = row[condition.field]
  if (condition.operator === 'in') return Array.isArray(condition.value) && condition.value.includes(String(value))
  return String(value) === String(condition.value)
}

/** A table the way nucleus serves it: sorted by id, 200 rows a page at most. */
function serve(table: ListRow[], requests: PageRequest['payload'][] = []): PageStarter {
  return ({ payload, onAfterHandle }) => {
    requests.push(payload)
    const matching = table
      .filter((row) => (payload.filters ?? []).every((condition) => holds(row, condition)))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    const size = Math.min(payload.limit, LIST_PAGE_SIZE)
    const page = matching.slice((payload.page - 1) * size, payload.page * size)
    onAfterHandle({ isSuccess: true, data: { data: page, pagination: { hasNext: payload.page * size < matching.length } } })
  }
}

const broken: PageStarter = ({ onErrorHandle }) => onErrorHandle(new Error('boom'))

describe('readAllPages', () => {
  it('reads every page, not the first 200 rows', () => {
    const requests: PageRequest['payload'][] = []
    let rows: ListRow[] = []
    readAllPages({ start: serve(rowsOf(450), requests), payload: {}, onDone: (r) => (rows = r), onError: () => {} })
    expect(rows).toHaveLength(450)
    expect(requests.map((r) => r.page)).toEqual([1, 2, 3])
    expect(requests.every((r) => r.limit === LIST_PAGE_SIZE)).toBe(true)
  })

  it('stops on a short page, and on an empty list', () => {
    const requests: PageRequest['payload'][] = []
    let rows: ListRow[] | null = null
    readAllPages({ start: serve(rowsOf(3), requests), payload: {}, onDone: (r) => (rows = r), onError: () => {} })
    expect(rows).toHaveLength(3)
    expect(requests).toHaveLength(1)
    readAllPages({ start: serve([]), payload: {}, onDone: (r) => (rows = r), onError: () => {} })
    expect(rows).toHaveLength(0)
  })

  it('keeps a row that came back on two pages once', () => {
    const pages = [rowsOf(LIST_PAGE_SIZE), [...rowsOf(1), ...rowsOf(5, 'x')]]
    let page = 0
    const start: PageStarter = ({ onAfterHandle }) => {
      const items = pages[page]
      page += 1
      onAfterHandle({ data: { data: items, pagination: { hasNext: page < pages.length } } })
    }
    let rows: ListRow[] = []
    readAllPages({ start, payload: {}, onDone: (r) => (rows = r), onError: () => {} })
    expect(rows).toHaveLength(LIST_PAGE_SIZE + 5)
  })

  it('reports a failed page and never hands on the pages before it', () => {
    let calls = 0
    const start: PageStarter = (request) => (calls++ === 0 ? serve(rowsOf(450))(request) : broken(request))
    let done = false
    const errors: object[] = []
    readAllPages({ start, payload: {}, onDone: () => (done = true), onError: (e) => errors.push(e) })
    expect(done).toBe(false)
    expect(errors).toHaveLength(1)
  })

  it('gives up with an error rather than loop for ever', () => {
    let calls = 0
    const start: PageStarter = ({ onAfterHandle }) => {
      const items = rowsOf(LIST_PAGE_SIZE, `p${calls++}`)
      onAfterHandle({ data: { data: items, pagination: { hasNext: true } } })
    }
    let done = false
    const errors: object[] = []
    readAllPages({ start, payload: {}, onDone: () => (done = true), onError: (e) => errors.push(e) })
    expect(done).toBe(false)
    expect(errors).toHaveLength(1)
    expect(calls).toBe(LIST_MAX_PAGES)
  })
})

describe('readByIds', () => {
  const ids = Array.from({ length: IDS_PER_READ * 2 + 20 }, (_, i) => `r-${String(i).padStart(4, '0')}`)

  it('sends the ids in groups and gathers every row', () => {
    const requests: PageRequest['payload'][] = []
    let rows: ListRow[] = []
    readByIds({ start: serve(rowsOf(300), requests), field: 'id', ids, onDone: (r) => (rows = r), onError: () => {} })
    expect(requests).toHaveLength(3)
    expect(rows).toHaveLength(ids.length)
    for (const request of requests) {
      const group = request.filters?.find((c) => c.field === 'id')?.value
      expect(Array.isArray(group) && group.length <= IDS_PER_READ).toBe(true)
    }
  })

  it('reads every page of a group that holds more than 200 rows', () => {
    let rows: ListRow[] = []
    const table = rowsOf(450).map((row) => ({ ...row, team_id: 't-one' }))
    readByIds({ start: serve(table), field: 'team_id', ids: ['t-one'], onDone: (r) => (rows = r), onError: () => {} })
    expect(rows).toHaveLength(450)
  })

  it('keeps the extra conditions on every group', () => {
    const requests: PageRequest['payload'][] = []
    const filters: Condition[] = [{ field: 'is_active', operator: 'eq', value: true }]
    readByIds({ start: serve([], requests), field: 'id', ids, filters, onDone: () => {}, onError: () => {} })
    expect(requests.every((r) => r.filters?.some((c) => c.field === 'is_active'))).toBe(true)
  })

  it('does not ask at all for no ids, and says so with an empty list', () => {
    const requests: PageRequest['payload'][] = []
    const answer: { rows: ListRow[] | null } = { rows: null }
    readByIds({ start: serve([], requests), field: 'id', ids: ['', ''], onDone: (r) => (answer.rows = r), onError: () => {} })
    expect(answer.rows).toEqual([])
    expect(requests).toHaveLength(0)
  })

  it('reports a failure once, however many groups fail', () => {
    const errors: object[] = []
    let done = false
    readByIds({ start: broken, field: 'id', ids, onDone: () => (done = true), onError: (e) => errors.push(e) })
    expect(done).toBe(false)
    expect(errors).toHaveLength(1)
  })
})

describe('isAbortError', () => {
  it('knows a cancelled request from a refused one', () => {
    expect(isAbortError({ name: 'AbortError' })).toBe(true)
    expect(isAbortError(new Error('boom'))).toBe(false)
    expect(isAbortError([{ message: 'refused' }])).toBe(false)
    // the shape the action layer actually produces: a message and no name
    expect(isAbortError({ message: 'signal is aborted without reason' })).toBe(true)
    expect(isAbortError({ message: 'The user aborted a request.' })).toBe(true)
    expect(isAbortError({ message: 'Failed to fetch' })).toBe(false)
  })
})
