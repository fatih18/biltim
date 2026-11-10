import { describe, expect, it } from 'bun:test'
import {
  LIST_PAGE_SIZE,
  type Condition,
  type ListRow,
  type PageRequest,
  type PageStarter,
} from '@/app/_utils/readAllPages'
import { isDeletableFinding } from './findingDelete'
import type { FiveSFindingLite } from './findingTypes'
import { CARRIER_SOURCE, carrierAuditConditions, carrierIdsOf, readAuditFindings, rowsOfAudits } from './readAuditFindings'

const holds = (row: ListRow, condition: Condition): boolean => {
  const value = row[condition.field]
  if (condition.operator === 'in') return Array.isArray(condition.value) && condition.value.includes(String(value))
  return String(value) === String(condition.value)
}

/** A table the way nucleus serves it: filtered, sorted by id, 200 rows a page at most. */
function serve(table: readonly ListRow[], requests: PageRequest['payload'][] = []): PageStarter {
  return ({ payload, onAfterHandle }) => {
    requests.push(payload)
    const matching = table
      .filter((row) => (payload.filters ?? []).every((condition) => holds(row, condition)))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    const size = Math.min(payload.limit, LIST_PAGE_SIZE)
    const page = matching.slice((payload.page - 1) * size, payload.page * size)
    onAfterHandle({ data: { data: page, pagination: { hasNext: payload.page * size < matching.length } } })
  }
}

const failing: PageStarter = ({ onErrorHandle }) => onErrorHandle(new Error('boom'))

const PLAN = 'plan-1'
const AUDIT = 'audit-1'

const audits: ListRow[] = [
  { id: AUDIT, plan_id: PLAN, source: null },
  { id: 'carrier-a', plan_id: PLAN, source: CARRIER_SOURCE },
  { id: 'carrier-b', plan_id: PLAN, source: CARRIER_SOURCE },
  { id: 'carrier-other-plan', plan_id: 'plan-2', source: CARRIER_SOURCE },
  { id: 'standalone', plan_id: null, source: CARRIER_SOURCE },
]

const finding = (id: string, auditId: string, no: number, active = true): ListRow => ({
  id,
  audit_id: auditId,
  finding_no: no,
  is_active: active,
  status: 'open',
})

const findings: ListRow[] = [
  finding('own-closed', AUDIT, 3),
  finding('own-open', AUDIT, 7),
  finding('single-a', 'carrier-a', 9),
  finding('single-b', 'carrier-b', 11),
  finding('single-other-plan', 'carrier-other-plan', 12),
  finding('single-standalone', 'standalone', 13),
  finding('elsewhere', 'audit-2', 14),
  finding('own-deleted', AUDIT, 5, false),
]

type Outcome = { findings: FiveSFindingLite[] | null; error: object | null }

function run(input: {
  planId: string | null
  audits?: PageStarter
  findings?: PageStarter
  auditId?: string
}): Outcome {
  const outcome: Outcome = { findings: null, error: null }
  readAuditFindings({
    startAudits: input.audits ?? serve(audits),
    startFindings: input.findings ?? serve(findings),
    auditId: input.auditId ?? AUDIT,
    planId: input.planId,
    onDone: (list) => {
      outcome.findings = list
    },
    onError: (error) => {
      outcome.error = error
    },
  })
  return outcome
}

describe('readAuditFindings — the audit and the single findings raised inside it', () => {
  it('lists the audit’s findings and those under its plan’s carriers, highest number first', () => {
    const { findings: listed } = run({ planId: PLAN })
    expect(listed?.map((f) => f.id)).toEqual(['single-b', 'single-a', 'own-open', 'own-closed'])
  })

  it('leaves out another plan’s carriers, standalone single findings, other audits’ findings and inactive ones', () => {
    const ids = run({ planId: PLAN }).findings?.map((f) => f.id) ?? []
    for (const left of ['single-other-plan', 'single-standalone', 'elsewhere', 'own-deleted']) {
      expect(ids).not.toContain(left)
    }
  })

  it('reads only the audit’s own findings for an audit that never had a plan, and no carriers at all', () => {
    const requests: PageRequest['payload'][] = []
    const { findings: listed } = run({ planId: null, audits: serve(audits, requests) })
    expect(listed?.map((f) => f.id)).toEqual(['own-open', 'own-closed'])
    expect(requests).toHaveLength(0)
  })

  it('asks the server for the carriers of this plan only, in a stable order', () => {
    const requests: PageRequest['payload'][] = []
    run({ planId: PLAN, audits: serve(audits, requests) })
    expect(requests[0]?.filters).toEqual(carrierAuditConditions(PLAN))
    expect(requests[0]?.sort).toEqual([{ field: 'id', direction: 'asc' }])
  })

  it('reads the findings of the audit and of every carrier together, active ones only', () => {
    const requests: PageRequest['payload'][] = []
    run({ planId: PLAN, findings: serve(findings, requests) })
    expect(requests[0]?.filters).toEqual([
      { field: 'is_active', operator: 'eq', value: true },
      { field: 'audit_id', operator: 'in', value: [AUDIT, 'carrier-a', 'carrier-b'] },
    ])
  })

  it('reads past the 200th finding page by page, never one page of 200', () => {
    const many = Array.from({ length: 450 }, (_, i) => finding(`m-${String(i).padStart(4, '0')}`, 'carrier-a', i + 1))
    const requests: PageRequest['payload'][] = []
    const { findings: listed } = run({ planId: PLAN, findings: serve([...many, ...findings], requests) })
    expect(listed).toHaveLength(450 + 4)
    expect(requests.map((r) => r.page)).toEqual([1, 2, 3])
  })

  it('reads past the 200th carrier too', () => {
    const carriers = Array.from({ length: 450 }, (_, i) => ({
      id: `c-${String(i).padStart(4, '0')}`,
      plan_id: PLAN,
      source: CARRIER_SOURCE,
    }))
    const requests: PageRequest['payload'][] = []
    run({ planId: PLAN, audits: serve([...carriers, ...audits], requests) })
    expect(requests.map((r) => r.page)).toEqual([1, 2, 3])
  })

  it('fails as a whole when the carriers cannot be read, with no partial list', () => {
    const outcome = run({ planId: PLAN, audits: failing })
    expect(outcome.findings).toBeNull()
    expect(outcome.error).toBeInstanceOf(Error)
  })

  it('fails as a whole when the findings cannot be read', () => {
    const outcome = run({ planId: PLAN, findings: failing })
    expect(outcome.findings).toBeNull()
    expect(outcome.error).toBeInstanceOf(Error)
  })

  it('does not trust a server that ignored its filters', () => {
    const everything: PageStarter = ({ payload, onAfterHandle }) =>
      onAfterHandle({ data: { data: payload.page === 1 ? audits : [], pagination: { hasNext: false } } })
    // Every active finding of every audit, whatever audit_id was asked for.
    const allFindings: PageStarter = ({ payload, onAfterHandle }) =>
      onAfterHandle({
        data: { data: payload.page === 1 ? findings.filter((f) => f.is_active) : [], pagination: { hasNext: false } },
      })
    const ids = run({ planId: PLAN, audits: everything, findings: allFindings }).findings?.map((f) => f.id) ?? []
    expect(ids).toEqual(['single-b', 'single-a', 'own-open', 'own-closed'])
    expect(ids).not.toContain('single-other-plan')
    expect(ids).not.toContain('single-standalone')
    expect(ids).not.toContain('elsewhere')
  })
})

describe('a single finding raised inside the audit is deletable by the same rule', () => {
  const listed = run({ planId: PLAN }).findings ?? []

  it('Merkez Ekip is offered Sil for it and for the audit’s own finding, not for another plan’s or a standalone one', () => {
    expect(isDeletableFinding(true, listed, 'single-a')).toBe(true)
    expect(isDeletableFinding(true, listed, 'own-open')).toBe(true)
    expect(isDeletableFinding(true, listed, 'single-other-plan')).toBe(false)
    expect(isDeletableFinding(true, listed, 'single-standalone')).toBe(false)
    expect(isDeletableFinding(false, listed, 'single-a')).toBe(false)
  })
})

describe('carrierIdsOf and rowsOfAudits', () => {
  it('keeps each carrier of the plan once, compared as ids are compared everywhere (case, spaces)', () => {
    const rows: ListRow[] = [
      { id: 'C-1', plan_id: ' PLAN-1 ', source: CARRIER_SOURCE },
      { id: 'C-1', plan_id: PLAN, source: CARRIER_SOURCE },
      { id: 'c-2', planId: PLAN, source: CARRIER_SOURCE },
      { id: AUDIT, plan_id: PLAN, source: CARRIER_SOURCE },
      { id: '', plan_id: PLAN, source: CARRIER_SOURCE },
      { id: 'not-a-carrier', plan_id: PLAN, source: 'audit' },
    ]
    expect(carrierIdsOf(rows, { auditId: 'AUDIT-1', planId: PLAN })).toEqual(['C-1', 'c-2'])
  })

  it('keeps the finding rows that hang under one of the audits', () => {
    const rows: ListRow[] = [{ id: 'a', audit_id: 'X-1' }, { id: 'b', auditId: 'x-2' }, { id: 'c', audit_id: 'y' }, { id: 'd' }]
    expect(rowsOfAudits(rows, ['x-1', 'X-2']).map((r) => r.id)).toEqual(['a', 'b'])
  })
})
