import { describe, expect, it } from 'bun:test'
import { REJECTED_AUDIT_MESSAGE } from './rejectedPlan'
import type { Caller } from './caller'
import { enforceFindingScope } from './findingScope'
import { FINDING_BULK_MESSAGE, FINDING_WRITE_MESSAGE } from './findingScopeMessages'
import { classifyFindingRequest } from './findingScopeRoutes'
import {
  AUDITOR,
  AUDITOR_FM,
  CENTRAL,
  FINDING,
  FIELD_MANAGER,
  GOD,
  MANAGER,
  MANAGER_FM,
  MINE,
  OTHER,
  SUPER_ADMIN,
  closing,
  request,
  world,
  type World,
} from './findingScopeKit'
import { enforceRequestRules } from './requestGuard'

const scope = (method: string, caller: Caller | null, w: World, payload?: object, path = `/fiveSFindings/${FINDING}`) => {
  const { read, calls } = world(w)
  return { calls, run: () => enforceFindingScope({ request: request(method, path, payload), query: {}, read, caller }) }
}

describe('which requests the findings limit looks at', () => {
  it('knows the generic findings routes and nothing else', () => {
    expect(classifyFindingRequest('GET', '/fiveSFindings')?.kind).toBe('list')
    expect(classifyFindingRequest('GET', '/fiveSFindings/')?.kind).toBe('list')
    expect(classifyFindingRequest('GET', '/fiveSFindings/distinct/description')?.kind).toBe('distinct')
    expect(classifyFindingRequest('GET', `/fiveSFindings/${FINDING}`)).toEqual({ kind: 'read', id: FINDING })
    expect(classifyFindingRequest('PATCH', `/fiveSFindings/${FINDING}`)).toEqual({ kind: 'write', id: FINDING })
    expect(classifyFindingRequest('DELETE', `/fiveSFindings/${FINDING}/`)?.kind).toBe('write')
    expect(classifyFindingRequest('PUT', '/fiveSFindings/bulk')?.kind).toBe('bulk')
    expect(classifyFindingRequest('POST', '/fiveSFindings')).toBeNull()
    expect(classifyFindingRequest('PATCH', '/fiveSAudits/x')).toBeNull()
    expect(classifyFindingRequest('GET', '/fiveSLocations')).toBeNull()
  })

  it('reads the id in its one canonical spelling', () => {
    expect(classifyFindingRequest('PUT', `/fiveSFindings/${FINDING.toUpperCase()}`)?.id).toBe(FINDING)
    expect(classifyFindingRequest('PUT', `/fiveSFindings/${FINDING.replaceAll('-', '')}`)?.id).toBe(FINDING)
  })
})

describe('a field manager writing a finding', () => {
  it('may write one of their own locations, closing included', async () => {
    for (const method of ['PUT', 'PATCH']) {
      const { run } = scope(method, FIELD_MANAGER, { finding: MINE, managed: [MINE, OTHER] }, closing)
      expect((await run()).refusal).toBeUndefined()
    }
  })

  it('is refused another location with what is wrong, why and what to do', async () => {
    for (const method of ['PUT', 'PATCH', 'DELETE']) {
      const { run } = scope(method, FIELD_MANAGER, { finding: OTHER, managed: [MINE] }, method === 'DELETE' ? undefined : closing)
      const { refusal } = await run()
      expect(refusal?.status).toBe(403)
      const body = await refusal?.json()
      expect(body).toMatchObject({ success: false, isSuccess: false, message: FINDING_WRITE_MESSAGE })
      expect(FINDING_WRITE_MESSAGE).toMatch(/saha sorumlusu olduğunuz lokasyonlardan birine ait değil/)
      expect(FINDING_WRITE_MESSAGE).toMatch(/Merkez Ekip yapmalıdır/)
    }
  })

  it('is refused every finding when they manage no location', async () => {
    const { run } = scope('PATCH', FIELD_MANAGER, { finding: MINE, managed: [] }, closing)
    expect((await run()).refusal?.status).toBe(403)
  })

  it('is refused a finding that names no location', async () => {
    for (const finding of ['', '   ']) {
      const { run } = scope('PATCH', FIELD_MANAGER, { finding, managed: [MINE] }, closing)
      expect((await run()).refusal?.status).toBe(403)
    }
  })

  it('leaves a finding that is not there to the route (404)', async () => {
    const { run } = scope('PATCH', FIELD_MANAGER, { managed: [MINE] }, closing)
    expect((await run()).refusal).toBeUndefined()
  })

  it('matches the place the way the reports do: case, spaces, Turkish i, hidden marks', async () => {
    const same: Array<[string, string]> = [
      ['Çelik Haddehane', 'ÇELİK HADDEHANE'],
      ['Çelik Haddehane', '  çelik   haddehane '],
      ['Çelik Haddehane', 'Çelik Haddehane'],
      ['Çelik Haddehane', 'Çelik Hadde​hane'],
      ['Isıl İşlem', 'ISIL İŞLEM'],
      ['Isıl İşlem', 'ısıl işlem'],
      ['İdari Bina', 'Idari Bina'],
      ['İdari Bina', 'idari bina'],
    ]
    for (const [managed, stored] of same) {
      const { run } = scope('PATCH', FIELD_MANAGER, { finding: stored, managed: [managed] }, closing)
      expect((await run()).refusal).toBeUndefined()
    }
    const { run } = scope('PATCH', FIELD_MANAGER, { finding: 'Çelik Haddehane 2', managed: ['Çelik Haddehane'] }, closing)
    expect((await run()).refusal?.status).toBe(403)
  })

  it('looks the finding up by its canonical id', async () => {
    const { run, calls } = scope('PATCH', FIELD_MANAGER, { finding: MINE, managed: [MINE] }, closing, `/fiveSFindings/${FINDING.toUpperCase()}`)
    await run()
    const lookup = calls.find((c) => c.text.includes('select location_name'))
    expect(lookup?.params).toEqual([FINDING])
  })

  it('has no bulk door', async () => {
    const { run } = scope('PUT', FIELD_MANAGER, { managed: [MINE] }, [{ id: FINDING, data: closing }], '/fiveSFindings/bulk')
    const { refusal } = await run()
    expect(refusal?.status).toBe(403)
    expect(await refusal?.json()).toMatchObject({ message: FINDING_BULK_MESSAGE })
  })
})

describe('everyone else is left alone', () => {
  it('asks nothing of the database for a caller who is not a field manager', async () => {
    for (const caller of [GOD, SUPER_ADMIN, CENTRAL, MANAGER, AUDITOR, MANAGER_FM]) {
      for (const method of ['PUT', 'PATCH', 'DELETE']) {
        const { run, calls } = scope(method, caller, { finding: OTHER, managed: [] }, closing)
        expect((await run()).refusal).toBeUndefined()
        expect(calls).toHaveLength(0)
      }
      const bulk = scope('DELETE', caller, {}, undefined, '/fiveSFindings/bulk')
      expect((await bulk.run()).refusal).toBeUndefined()
    }
  })

  it('limits an auditor who is also a field manager the same way', async () => {
    expect((await scope('PATCH', AUDITOR_FM, { finding: MINE, managed: [MINE] }, closing).run()).refusal).toBeUndefined()
    expect((await scope('PATCH', AUDITOR_FM, { finding: OTHER, managed: [MINE] }, closing).run()).refusal?.status).toBe(403)
  })
})

describe('a plan sent back for correction', () => {
  const rejected: World = { finding: OTHER, managed: [MINE], rejectedTeams: ['t1'] }

  it('leaves a correction of its findings to the rejected-plan rule that follows', async () => {
    for (const method of ['PUT', 'PATCH', 'DELETE']) {
      const { run } = scope(method, AUDITOR_FM, rejected, { description: 'Kırık raf' })
      expect((await run()).refusal).toBeUndefined()
    }
    const { read } = world(rejected)
    const after = await enforceRequestRules({ request: request('PATCH', `/fiveSFindings/${FINDING}`, { description: 'Kırık raf' }), body: undefined, query: {}, read, caller: AUDITOR_FM })
    expect(after?.status).toBe(403)
    expect(await after?.json()).toMatchObject({ message: REJECTED_AUDIT_MESSAGE })
  })

  it('never takes closing for a correction', async () => {
    const { run } = scope('PATCH', AUDITOR_FM, rejected, closing)
    expect((await run()).refusal?.status).toBe(403)
    const camel = { _id: FINDING, photoAfterFiles: [{ fileId: 'a1' }], status: 'closed' }
    expect((await scope('PATCH', AUDITOR_FM, rejected, camel).run()).refusal?.status).toBe(403)
  })

  it('does not widen anything for a finding of a plan that is not rejected', async () => {
    const { run } = scope('PATCH', AUDITOR_FM, { finding: OTHER, managed: [MINE] }, { description: 'Kırık raf' })
    expect((await run()).refusal?.status).toBe(403)
  })
})
