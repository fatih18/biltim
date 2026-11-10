/**
 * The line the KYS.180 sheet writes under an audit whose answers are missing
 * or whose score the attendance rule zeroed.
 *
 * Notlar 22.10 (satır 39): while "Bölge sorumlusu veya görevlendirdiği kişi
 * denetime katıldı" is not ticked, the audit form's questions are passive and
 * the audit is stored with total_score 0, every step 0, no answer rows, and its
 * plan stamped field_manager_attended = false. Such a sheet used to carry the
 * note meant for records from before answers were stored ("eski kayıt"), which
 * would tell the reader the data was lost when nothing was ever asked.
 */

export type AuditAttendance = {
  /** The audit's plan: field_manager_attended as stored; null when unknown or not applicable. */
  attended: boolean | null;
  /** The audit's stored total_score. */
  total: number;
  /** The audit has at least one five_s_audit_answers row. */
  hasAnswers: boolean;
};

export const NOT_ATTENDED_NO_ANSWERS_NOTE =
  'Bölge sorumlusu veya görevlendirdiği kişi denetime katılmadığı için sorular yanıtlanmadı; denetim puanı 0.';

export const NOT_ATTENDED_NOTE =
  'Bölge sorumlusu veya görevlendirdiği kişi denetime katılmadığı için denetim puanı 0.';

export const LEGACY_NO_ANSWERS_NOTE =
  'Bu denetimin soru yanıtları kaydedilmemiş (eski kayıt); yalnız adım puanları gösteriliyor.';

/**
 * Whether the plan's "no" is the attendance rule's. Before the tick existed the
 * plan's flag was a guess ("was the field manager's name among the auditors?")
 * and was false for audits whose score was never zeroed; only a "no" next to a
 * stored 0 is the rule's own.
 */
export function isNotAttended({ attended, total }: Pick<AuditAttendance, 'attended' | 'total'>): boolean {
  return attended === false && total === 0;
}

/** The note for one audit's sheet, or null when there is nothing to explain. */
export function auditAttendanceNote(audit: AuditAttendance): string | null {
  if (isNotAttended(audit)) return audit.hasAnswers ? NOT_ATTENDED_NOTE : NOT_ATTENDED_NO_ANSWERS_NOTE;
  return audit.hasAnswers ? null : LEGACY_NO_ANSWERS_NOTE;
}
