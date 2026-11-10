/**
 * Sending a corrected audit back for approval (R30).
 *
 * A plan Merkez Ekip rejected is corrected on the question screen; saving that
 * correction stamps the plan `pending_approval` again with the SAME audit, so
 * "one plan, one audit" holds and nothing new is filed. The stamp comes last:
 * once it is made the audit is no longer open to the team's writes.
 */
import type { BaseErrorResponse } from 'nucleus-core-ts/client'
import { PLAN_STATUS_SENT, RESEND_LABEL, serverMessageOf } from '../../../_utils/planReview'

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
