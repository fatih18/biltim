import { describe, expect, it } from 'bun:test'
import { RESEND_LABEL } from '../../../_utils/planReview'
import {
  correctionEnd,
  correctionVerdict,
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

  it('tells what to do: reopen for a failed answer or finding, the home page for a failed photo', () => {
    const answers = correctionVerdict({ ...clean('rejected'), failedAnswers: 1 }).failureText ?? ''
    expect(answers).toContain(RESEND_LABEL)
    expect(answers).not.toContain('Tekil Bulgu')
    // A failed finding holds its answer back (correctionWrites.ts), so reopening writes the finding again.
    const finding = correctionVerdict({ ...clean('rejected'), failedFindings: 1 }).failureText ?? ''
    expect(finding).toContain(RESEND_LABEL)
    expect(finding).toContain('önceki yanıtlarıyla duruyor')
    expect(finding).toContain('bulgu yeniden istenecek')
    expect(finding).not.toContain('Tekil Bulgu')
    expect(finding).not.toContain('yeniden yazmaz')
  })

  it('names the place for a failed photo: the correction screen has no Tekil Bulgu button', () => {
    const photo = correctionVerdict({ ...clean('rejected'), failedPhotos: 1 }).failureText ?? ''
    expect(photo).toContain('ana sayfadan Denetim ekranına gidip Tekil Bulgu ile ekleyin')
    expect(photo).toContain('yeniden açılıp kaydedilse de yüklenmez')
    // Photos alone: add them, then send the audit again.
    expect(photo).toContain(`Sonra ana sayfada "${RESEND_LABEL}" düğmesiyle denetimi onaya gönderin.`)
    const notRejected = correctionVerdict({ ...clean('completed'), failedPhotos: 1 }).failureText ?? ''
    expect(notRejected).toContain('Tekil Bulgu ile ekleyin')
    expect(notRejected).not.toContain(RESEND_LABEL)
  })

  it('a failed photo next to a failed answer: one reopening step, and the photo is still named', () => {
    const text = correctionVerdict({ ...clean('rejected'), failedAnswers: 1, failedPhotos: 2 }).failureText ?? ''
    expect(text).toContain('1 soru yanıtı, 2 fotoğraf')
    expect(text).toContain('Tekil Bulgu ile ekleyin')
    expect(text.split(RESEND_LABEL)).toHaveLength(2)
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

  it('stays, incomplete, when a write failed on a rejected plan; the stamp was not tried', () => {
    const verdict = correctionVerdict({ ...clean('rejected'), failedPhotos: 1 })
    const end = correctionEnd(verdict, null)
    expect(end.leave).toBe(false)
    expect(end.gap).toEqual({ kind: 'incomplete', text: verdict.failureText ?? '' })
    expect(end.tone).toBe('error')
    expect(end.text).toBe(verdict.failureText ?? '')
  })

  it('stays, incomplete, when a write failed on a plan that was not rejected', () => {
    const end = correctionEnd(correctionVerdict({ ...clean('completed'), failedFindings: 2 }), null)
    expect(end.leave).toBe(false)
    expect(end.gap?.kind).toBe('incomplete')
    expect(end.tone).toBe('error')
  })

  it('stays, unsent, when the stamp itself is refused, with the server message', () => {
    const end = correctionEnd(correctionVerdict(clean('rejected')), { ok: false, message: 'Denetim zaten onaylandı.' })
    expect(end.leave).toBe(false)
    expect(end.gap?.kind).toBe('unsent')
    expect(end.tone).toBe('error')
    expect(end.text).toContain('Denetim zaten onaylandı.')
    expect(end.text).toContain('Düzeltmeler kaydedildi')
  })

  it('a due stamp that was never tried is not a success', () => {
    const end = correctionEnd(correctionVerdict(clean('rejected')), null)
    expect(end.leave).toBe(false)
    expect(end.gap?.kind).toBe('unsent')
  })

  it('keeps the end text in the gap, so the line beside the button says what the toast said', () => {
    const failed = correctionEnd(correctionVerdict({ ...clean('rejected'), failedFindings: 1 }), null)
    expect(failed.gap?.text).toBe(failed.text)
    const refused = correctionEnd(correctionVerdict(clean('rejected')), { ok: false, message: null })
    expect(refused.gap?.text).toBe(refused.text)
  })

  it('a failed write is not worded as "saved, only the resend failed"', () => {
    for (const failure of [{ failedAnswers: 1 }, { failedFindings: 1 }, { failedPhotos: 1 }]) {
      const end = correctionEnd(correctionVerdict({ ...clean('rejected'), ...failure }), null)
      expect(end.gap?.text).toContain('Kaydedilemeyen')
      expect(end.gap?.text).not.toContain('Düzeltmeler kaydedildi ancak')
      expect(end.gap?.text).not.toContain('yukarıdaki uyarıda')
    }
  })
})

describe('the save button once the correction went through', () => {
  it('reads Kaydedildi only when nothing is missing', () => {
    expect(savedLabelOf(null)).toBe('Kaydedildi')
    expect(savedLabelOf({ kind: 'unsent', text: 'x' })).toBe('Kaydedildi, gönderilmedi')
    expect(savedLabelOf({ kind: 'incomplete', text: 'x' })).toBe('Kaydedildi, eksikler var')
  })

  it('a rejected plan whose writes failed reads "eksikler var", not "gönderilmedi"', () => {
    const end = correctionEnd(correctionVerdict({ ...clean('rejected'), failedAnswers: 1 }), null)
    expect(savedLabelOf(end.gap)).toBe('Kaydedildi, eksikler var')
  })
})
