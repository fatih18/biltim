import { describe, expect, it } from 'bun:test'
import { RESEND_LABEL } from '../../../_utils/planReview'
import {
  correctionEnd,
  correctionVerdict,
  savedGapText,
  savedLabelOf,
  tallyFindingWrites,
  type CorrectionInput,
} from './resendPlan'

const clean = (status: string): CorrectionInput => ({ status, failedAnswers: 0, failedFindings: 0, failedPhotos: 0 })

describe('tallyFindingWrites', () => {
  it('counts the findings that did not save and every photo that did not upload', () => {
    expect(
      tallyFindingWrites([
        { saved: true, failedPhotos: 0 },
        { saved: false, failedPhotos: 1 },
        { saved: true, failedPhotos: 2 },
      ])
    ).toEqual({ failedFindings: 1, failedPhotos: 3 })
  })

  it('counts nothing for no writes', () => {
    expect(tallyFindingWrites([])).toEqual({ failedFindings: 0, failedPhotos: 0 })
  })
})

describe('correctionVerdict', () => {
  it('sends a rejected plan again when everything saved', () => {
    expect(correctionVerdict(clean('rejected'))).toEqual({ resendDue: true, resend: true, failureText: null })
  })

  it('does not resend a plan that was not rejected, and says nothing when everything saved', () => {
    for (const status of ['completed', 'pending_approval', 'planned']) {
      expect(correctionVerdict(clean(status))).toEqual({ resendDue: false, resend: false, failureText: null })
    }
  })

  it('holds the resend for each kind of failed write, alone', () => {
    const failures: Array<Partial<CorrectionInput>> = [{ failedAnswers: 1 }, { failedFindings: 1 }, { failedPhotos: 1 }]
    for (const failure of failures) {
      const verdict = correctionVerdict({ ...clean('rejected'), ...failure })
      expect(verdict.resendDue).toBe(true)
      expect(verdict.resend).toBe(false)
      expect(verdict.failureText).toContain('yeniden gönderilmedi')
    }
  })

  it('names what failed, with the counts', () => {
    const text =
      correctionVerdict({ status: 'rejected', failedAnswers: 2, failedFindings: 1, failedPhotos: 3 }).failureText ?? ''
    expect(text).toContain('2 soru yanıtı, 1 bulgu, 3 fotoğraf')
    expect(correctionVerdict({ ...clean('rejected'), failedFindings: 1 }).failureText).not.toContain('soru yanıtı')
  })

  it('tells what to do: reopen for failed answers, a single finding for a failed finding or photo', () => {
    const answers = correctionVerdict({ ...clean('rejected'), failedAnswers: 1 }).failureText ?? ''
    expect(answers).toContain(RESEND_LABEL)
    expect(answers).not.toContain('Tekil Bulgu')
    const finding = correctionVerdict({ ...clean('rejected'), failedFindings: 1 }).failureText ?? ''
    expect(finding).toContain('Tekil Bulgu')
    expect(finding).toContain('yeniden yazmaz')
    expect(finding).toContain(RESEND_LABEL)
  })

  it('on a plan that is not rejected a failure is still said, but nothing is "not sent"', () => {
    const verdict = correctionVerdict({ ...clean('completed'), failedAnswers: 1 })
    expect(verdict.resendDue).toBe(false)
    expect(verdict.resend).toBe(false)
    expect(verdict.failureText).toContain('1 soru yanıtı')
    expect(verdict.failureText).not.toContain('yeniden gönderilmedi')
    expect(verdict.failureText).not.toContain(RESEND_LABEL)
  })
})

describe('correctionEnd', () => {
  it('leaves after a rejected plan was saved and stamped', () => {
    const end = correctionEnd(correctionVerdict(clean('rejected')), { ok: true })
    expect(end).toEqual({
      leave: true,
      gap: null,
      tone: 'success',
      text: 'Düzeltme kaydedildi; denetim onaya yeniden gönderildi.',
    })
  })

  it('leaves after a plain save of a plan that was not rejected', () => {
    const end = correctionEnd(correctionVerdict(clean('completed')), null)
    expect(end).toEqual({ leave: true, gap: null, tone: 'success', text: 'Denetim güncellendi.' })
  })

  it('stays, unsent, when a write failed on a rejected plan; the stamp was not tried', () => {
    const verdict = correctionVerdict({ ...clean('rejected'), failedPhotos: 1 })
    const end = correctionEnd(verdict, null)
    expect(end.leave).toBe(false)
    expect(end.gap).toBe('unsent')
    expect(end.tone).toBe('error')
    expect(end.text).toBe(verdict.failureText ?? '')
  })

  it('stays, incomplete, when a write failed on a plan that was not rejected', () => {
    const end = correctionEnd(correctionVerdict({ ...clean('completed'), failedFindings: 2 }), null)
    expect(end.leave).toBe(false)
    expect(end.gap).toBe('incomplete')
    expect(end.tone).toBe('error')
  })

  it('stays, unsent, when the stamp itself is refused, with the server message', () => {
    const end = correctionEnd(correctionVerdict(clean('rejected')), { ok: false, message: 'Denetim zaten onaylandı.' })
    expect(end.leave).toBe(false)
    expect(end.gap).toBe('unsent')
    expect(end.tone).toBe('error')
    expect(end.text).toContain('Denetim zaten onaylandı.')
    expect(end.text).toContain('Düzeltmeler kaydedildi')
  })

  it('a due stamp that was never tried is not a success', () => {
    const end = correctionEnd(correctionVerdict(clean('rejected')), null)
    expect(end.leave).toBe(false)
    expect(end.gap).toBe('unsent')
  })
})

describe('the save button once the correction went through', () => {
  it('reads Kaydedildi only when nothing is missing', () => {
    expect(savedLabelOf(null)).toBe('Kaydedildi')
    expect(savedLabelOf('unsent')).toBe('Kaydedildi, gönderilmedi')
    expect(savedLabelOf('incomplete')).not.toBe('Kaydedildi')
  })

  it('says what to do beside the button', () => {
    expect(savedGapText('unsent')).toContain(RESEND_LABEL)
    expect(savedGapText('incomplete')).toContain('ana sayfadan')
  })
})
