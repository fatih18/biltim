import type { Row } from '../db'
import { squash } from '../guards/rejectedPlan'

/**
 * The plan columns the mail worker keeps (config.json, `five_s_audit_plans`):
 * the moment each mail was taken and how many attempts it cost.
 *
 * They belong to the server alone. Müdür and Merkez Ekip hold the table-level
 * write claim on plans, so nucleus would let a plain PUT or PATCH rewrite them:
 * clearing a marker makes a mail go out a second time, setting one makes a
 * plan's mail never go out. No screen writes them; any body that names one, in
 * any spelling (`invitationMailedAt`, `invitation_mailed_at`), is refused for
 * every caller, the same way the rejection columns are (`rejectionColumnsIn`).
 */

const MAIL_COLUMNS: readonly string[] = [
  'invitationmailedat',
  'completionmailedat',
  'invitationmailattempts',
  'completionmailattempts',
]

/** The keys of a plan write that name one of the mail columns, in any spelling. */
export function mailColumnsIn(body: Row): string[] {
  return Object.keys(body).filter((key) => MAIL_COLUMNS.includes(squash(key)))
}

export const MAIL_COLUMNS_WRITE_MESSAGE =
  'Planın e-posta gönderim kayıtları elle yazılamaz; bunları yalnız sunucudaki e-posta çalışanı tutar. Yazmak, bir e-postanın ikinci kez ya da hiç gönderilmemesine yol açar. Planı kaydederken bu alanları göndermeyin.'
