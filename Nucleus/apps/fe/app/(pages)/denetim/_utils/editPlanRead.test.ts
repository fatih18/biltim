import { describe, expect, it } from 'bun:test'
import { EDIT_PLAN_UNREADABLE_TEXT, EDIT_PLAN_UNREADABLE_WHY, editPlanVerdict } from './editPlanRead'

describe('editPlanVerdict', () => {
  it('opens when the address names a plan and it was read', () => {
    expect(editPlanVerdict({ addressPlanId: 'plan-1', plan: { id: 'plan-1' } })).toBe('open')
  })

  it('does not open when the address names a plan and none was read (failed read or empty answer)', () => {
    expect(editPlanVerdict({ addressPlanId: 'plan-1', plan: null })).toBe('unreadable')
    expect(editPlanVerdict({ addressPlanId: 'plan-1', plan: undefined })).toBe('unreadable')
  })

  it('opens an audit whose address names no plan, as before (a deleted plan is not an error)', () => {
    for (const addressPlanId of [null, undefined, '', '   ']) {
      expect(editPlanVerdict({ addressPlanId, plan: null })).toBe('open')
    }
  })

  it('says what to do, and why the form is not opened anyway', () => {
    expect(EDIT_PLAN_UNREADABLE_TEXT).toBe('Denetimin planı okunamadı; sayfayı yenileyip yeniden deneyin.')
    expect(EDIT_PLAN_UNREADABLE_WHY).toContain('onaya yeniden gönderilemezdi')
  })
})
