/**
 * Sending a corrected audit back for approval (R30).
 *
 * A plan Merkez Ekip rejected is corrected on the question screen; saving that
 * correction stamps the plan `pending_approval` again with the SAME audit, so
 * "one plan, one audit" holds and nothing new is filed. The stamp comes last:
 * once it is made the audit is no longer open to the team's writes.
 */
import type { BaseErrorResponse } from 'nucleus-core-ts/client'
import {
  PLAN_STATUS_SENT,
  RESEND_LABEL,
  serverMessageOf,
  shouldResendAfterCorrection,
} from '../../../_utils/planReview'

type StampOptions = {
  payload: { _id: string; status: typeof PLAN_STATUS_SENT; audit_id: string }
  onAfterHandle: () => void
  onErrorHandle: (error: BaseErrorResponse | BaseErrorResponse[], code?: number | null) => void
}

/** The plan update action's `start`, or null when the action does not exist. */
export type PlanStampStart = ((options: StampOptions) => void) | null

export type ResendOutcome = { ok: true } | { ok: false; message: string | null }

/** Stamps the plan as sent again; resolves with what happened, never rejects. */
export function resendPlan(start: PlanStampStart, plan: { id: string; auditId: string }): Promise<ResendOutcome> {
  return new Promise((resolve) => {
    if (!start) {
      resolve({ ok: false, message: 'Plan güncelleme işlemi bu oturumda kullanılamıyor.' })
      return
    }
    start({
      payload: { _id: plan.id, status: PLAN_STATUS_SENT, audit_id: plan.auditId },
      onAfterHandle: () => resolve({ ok: true }),
      onErrorHandle: (error) => resolve({ ok: false, message: serverMessageOf(error) }),
    })
  })
}

/** The correction is saved, the resend is not: what it means and what to do. */
export function resendFailureText(message: string | null): string {
  const why = message ? ` (${message})` : ''
  return `Düzeltmeler kaydedildi ancak denetim onaya yeniden gönderilemedi${why}. Ana sayfada bu denetimin satırındaki "${RESEND_LABEL}" düğmesine bir kez daha basın.`
}

/** The toast after a correction that was saved, and sent again when the plan had been rejected. */
export function correctionSavedText(resent: boolean): string {
  return resent ? 'Düzeltme kaydedildi; denetim onaya yeniden gönderildi.' : 'Denetim güncellendi.'
}

/** What one finding write came to: whether the finding row was saved, and how many of its photos were not. */
export type FindingWrite = { saved: boolean; failedPhotos: number }

/** The correction's finding writes, counted the way the answer writes are: by what did not save. */
export function tallyFindingWrites(writes: readonly FindingWrite[]): { failedFindings: number; failedPhotos: number } {
  return {
    failedFindings: writes.filter((write) => !write.saved).length,
    failedPhotos: writes.reduce((sum, write) => sum + write.failedPhotos, 0),
  }
}

export type CorrectionInput = {
  /** The plan's status as the form opened it. */
  status: string | null | undefined
  failedAnswers: number
  failedFindings: number
  failedPhotos: number
}

export type CorrectionVerdict = {
  /** The plan was returned for correction, so a clean save sends it again. */
  resendDue: boolean
  /** Stamp the plan now: it was due and every write saved. */
  resend: boolean
  /** What did not save, what that means and what to do; null when everything saved. */
  failureText: string | null
}

/**
 * What did not save, what that means and what to do. A failed finding left its
 * answer at the rating it was stored with (correctionWrites.ts), so reopening
 * the audit demands the finding again; a failed photo is the one write a
 * reopening does not repeat, and the correction screen has no way to add it.
 */
function failureTextOf(input: CorrectionInput, resendDue: boolean): string {
  const rewrite = input.failedAnswers > 0 || input.failedFindings > 0
  const parts = [
    input.failedAnswers > 0 ? `${input.failedAnswers} soru yanıtı` : '',
    input.failedFindings > 0 ? `${input.failedFindings} bulgu` : '',
    input.failedPhotos > 0 ? `${input.failedPhotos} fotoğraf` : '',
  ].filter((part) => part !== '')
  const what = `Düzeltme eksik kaydedildi. Kaydedilemeyen: ${parts.join(', ')}.`
  const held = resendDue ? ' Eksik düzeltmeyle onaya gitmesin diye denetim yeniden gönderilmedi.' : ''
  const via = resendDue ? `ana sayfada "${RESEND_LABEL}" düğmesiyle` : 'ana sayfadan'
  const steps: string[] = []
  if (rewrite) {
    const kept =
      input.failedFindings > 0
        ? ' Bulgusu kaydedilemeyen sorular önceki yanıtlarıyla duruyor; bulgu yeniden istenecek.'
        : ''
    const withFinding = input.failedFindings > 0 ? 'bulgularıyla birlikte ' : ''
    steps.push(`${kept} Denetimi ${via} tekrar açıp kaydedilemeyen yanıtları ${withFinding}yeniden girin ve kaydedin.`)
  }
  if (input.failedPhotos > 0) {
    steps.push(
      ' Eksik fotoğraflar denetim yeniden açılıp kaydedilse de yüklenmez: ana sayfadan Denetim ekranına gidip Tekil Bulgu ile ekleyin.'
    )
    if (resendDue && !rewrite) steps.push(` Sonra ${via} denetimi onaya gönderin.`)
  }
  return `${what}${held}${steps.join('')}`
}

/**
 * Whether a saved correction sends the plan again, and what to say when a
 * write did not save. Any failed answer, finding or photo holds the resend:
 * a sent audit takes no more writes from the team, so it would go to approval
 * incomplete.
 */
export function correctionVerdict(input: CorrectionInput): CorrectionVerdict {
  const resendDue = shouldResendAfterCorrection(input.status)
  const failed = input.failedAnswers + input.failedFindings + input.failedPhotos > 0
  return {
    resendDue,
    resend: resendDue && !failed,
    failureText: failed ? failureTextOf(input, resendDue) : null,
  }
}

/**
 * Why the saved correction is not the end of it, with the text that stays on
 * the page (the toast says the same once and is gone):
 * 'unsent': everything saved, only sending it again failed;
 * 'incomplete': a write did not save, and the text names which.
 */
export type SavedGapKind = 'unsent' | 'incomplete'
export type SavedGap = { kind: SavedGapKind; text: string }

/** The save button's label once the correction went through. */
export function savedLabelOf(gap: SavedGap | null): string {
  if (gap?.kind === 'unsent') return 'Kaydedildi, gönderilmedi'
  if (gap?.kind === 'incomplete') return 'Kaydedildi, eksikler var'
  return 'Kaydedildi'
}

export type CorrectionEnd = {
  /** Go back to the home page; false keeps the form on screen with its message. */
  leave: boolean
  gap: SavedGap | null
  tone: 'success' | 'error'
  text: string
}

/**
 * What the page does once the writes are done and, when it was due, the stamp
 * was tried. `stamp` is the result of resendPlan, or null when none was tried.
 */
export function correctionEnd(verdict: CorrectionVerdict, stamp: ResendOutcome | null): CorrectionEnd {
  if (verdict.failureText !== null) {
    const text = verdict.failureText
    return { leave: false, gap: { kind: 'incomplete', text }, tone: 'error', text }
  }
  if (!verdict.resend) {
    return { leave: true, gap: null, tone: 'success', text: correctionSavedText(false) }
  }
  const outcome: ResendOutcome = stamp ?? { ok: false, message: null }
  if (!outcome.ok) {
    const text = resendFailureText(outcome.message)
    return { leave: false, gap: { kind: 'unsent', text }, tone: 'error', text }
  }
  return { leave: true, gap: null, tone: 'success', text: correctionSavedText(true) }
}
