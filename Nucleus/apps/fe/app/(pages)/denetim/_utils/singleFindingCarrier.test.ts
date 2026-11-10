import { describe, expect, it } from 'bun:test'
import { bodyOf, pageCode } from './pageSource'
import { carrierPlanId } from './singleFinding'

describe('carrierPlanId — the plan a single finding’s carrier audit names (A2)', () => {
  it('is the plan of the audit that was started', () => {
    expect(carrierPlanId('plan-1')).toBe('plan-1')
  })

  it('is nothing for a standalone single finding', () => {
    expect(carrierPlanId(null)).toBeUndefined()
    expect(carrierPlanId(undefined)).toBeUndefined()
    expect(carrierPlanId('')).toBeUndefined()
  })
})

/*
 * Wiring guard, source-text checks (see pageSource.ts): the pure decisions are
 * tested above and in readAuditFindings.test.ts; this proves the page asks them.
 */
describe('the page sends the plan on the online carrier and reads the in-audit findings with it', () => {
  it('the online carrier carries plan_id from the started plan, like the offline replay', () => {
    const body = bodyOf('saveSingleFinding')
    expect(body).toContain("source: 'single_finding'")
    expect(body).toContain('plan_id: carrierPlanId(assignedPlan?.id)')
    expect(pageCode).toContain('plan_id: s.planId ?? undefined,')
  })

  it('the offline queue stores the same plan for the replay', () => {
    expect(bodyOf('saveSingleFinding')).toContain('const planId = assignedPlan?.id ?? null')
  })

  it('the correction list is read with the audit’s plan', () => {
    expect(pageCode).toContain('planId: editAudit?.planId ?? null,')
    expect(pageCode).toContain('planId: editPlanId || null,')
  })
})
