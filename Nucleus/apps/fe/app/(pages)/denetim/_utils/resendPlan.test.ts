import { describe, expect, it } from 'bun:test'
import { correctionSavedText, resendFailureText, resendPlan, type PlanStampStart } from './resendPlan'

describe('resendPlan', () => {
  it('stamps the plan pending_approval again with the same audit', async () => {
    const sent: Array<{ _id: string; status: string; audit_id: string }> = []
    const start: PlanStampStart = (options) => {
      sent.push(options.payload)
      options.onAfterHandle()
    }
    expect(await resendPlan(start, { id: 'plan-1', auditId: 'audit-9' })).toEqual({ ok: true })
    expect(sent).toEqual([{ _id: 'plan-1', status: 'pending_approval', audit_id: 'audit-9' }])
  })

  it('answers with the server message when the stamp is refused', async () => {
    const start: PlanStampStart = (options) => options.onErrorHandle([{ message: 'Denetim zaten onaylandı.' }], 409)
    expect(await resendPlan(start, { id: 'p', auditId: 'a' })).toEqual({ ok: false, message: 'Denetim zaten onaylandı.' })
  })

  it('answers with no message when the refusal carried none', async () => {
    const start: PlanStampStart = (options) => options.onErrorHandle({ message: '' }, 500)
    expect(await resendPlan(start, { id: 'p', auditId: 'a' })).toEqual({ ok: false, message: null })
  })

  it('does not throw when the action is missing', async () => {
    const outcome = await resendPlan(null, { id: 'p', auditId: 'a' })
    expect(outcome.ok).toBe(false)
  })
})

describe('texts', () => {
  it('says the correction is safe and where to resend when the stamp failed', () => {
    const text = resendFailureText('Bu denetimi yalnız ekip gönderebilir.')
    expect(text).toContain('Düzeltmeler kaydedildi')
    expect(text).toContain('Bu denetimi yalnız ekip gönderebilir.')
    expect(text).toContain('Düzelt ve Yeniden Gönder')
    expect(resendFailureText(null)).not.toContain('()')
  })

  it('tells a resent correction from a plain save', () => {
    expect(correctionSavedText(true)).toContain('yeniden gönderildi')
    expect(correctionSavedText(false)).toBe('Denetim güncellendi.')
  })
})
