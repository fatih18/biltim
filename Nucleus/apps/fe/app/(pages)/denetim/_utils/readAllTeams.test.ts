import { describe, expect, it } from 'bun:test'
import { LIST_PAGE_SIZE, type ListRow, type PageRequest, type PageStarter } from '@/app/_utils/readAllPages'
import { teamNamesOfUser } from './userTeams'
import { keepingStatus, readAllTeams, type ErrorOf } from './readAllTeams'

type StatusError = Error & { status: number | null }

const errorOf: ErrorOf = (body, code): StatusError =>
  Object.assign(new Error(String('message' in body ? body.message : 'failed')), {
    status: typeof code === 'number' ? code : null,
  })

const teamsOf = (count: number): ListRow[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `team-${String(i).padStart(4, '0')}`,
    name: `Ekip ${i}`,
    leader_user_id: `leader-${i}`,
    is_active: true,
  }))

/** A table the way nucleus serves it: 200 rows a page at most, whatever `limit` says. */
function serve(table: ListRow[], requests: PageRequest['payload'][] = []): PageStarter {
  return ({ payload, onAfterHandle }) => {
    requests.push(payload)
    const size = Math.min(payload.limit, LIST_PAGE_SIZE)
    const page = table.slice((payload.page - 1) * size, payload.page * size)
    onAfterHandle({ isSuccess: true, data: { data: page, pagination: { hasNext: payload.page * size < table.length } } })
  }
}

describe('readAllTeams', () => {
  it('reads past the 200th team, so its leader still has a team name', async () => {
    const requests: PageRequest['payload'][] = []
    const rows = await readAllTeams(serve(teamsOf(450), requests), errorOf)
    expect(rows).toHaveLength(450)
    expect(requests.map((r) => r.page)).toEqual([1, 2, 3])
    const teams = rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      leader_user_id: String(row.leader_user_id),
      is_active: true,
    }))
    // Team 301 sits on the second page; one read of "limit 2000" never saw it.
    expect(teamNamesOfUser('leader-301', teams, [])).toEqual(['Ekip 301'])
  })

  it('asks for a stable order: newest first, ties by id', async () => {
    const requests: PageRequest['payload'][] = []
    await readAllTeams(serve(teamsOf(3), requests), errorOf)
    expect(requests[0]?.sort).toEqual([
      { field: 'created_at', direction: 'desc' },
      { field: 'id', direction: 'asc' },
    ])
  })

  it('rejects with the HTTP code when a page fails, never with the pages read so far', async () => {
    let calls = 0
    const start: PageStarter = (request) => {
      calls += 1
      if (request.payload.page === 1) return serve(teamsOf(450))(request)
      const failing: { onErrorHandle: (body: object, code?: number | null) => void } = request
      failing.onErrorHandle({ message: 'Service Unavailable' }, 503)
    }
    const error = await readAllTeams(start, errorOf).then(
      () => null,
      (e: StatusError) => e
    )
    expect(calls).toBe(2)
    expect(error?.message).toBe('Service Unavailable')
    expect(error?.status).toBe(503)
  })

  it('an error without a code carries no status: that is a passing failure, as before', async () => {
    const start: PageStarter = (request) => request.onErrorHandle({ message: 'offline' })
    const error = await readAllTeams(start, errorOf).then(
      () => null,
      (e: StatusError) => e
    )
    expect(error?.status).toBeNull()
  })
})

describe('keepingStatus', () => {
  it('hands the request on unchanged apart from the error callback', () => {
    const seen: PageRequest['payload'][] = []
    const start: PageStarter = ({ payload }) => {
      seen.push(payload)
    }
    const payload = { page: 2, limit: 200, sort: [{ field: 'id', direction: 'asc' as const }] }
    keepingStatus(start, errorOf)({ payload, onAfterHandle: () => {}, onErrorHandle: () => {} })
    expect(seen).toEqual([payload])
  })
})
