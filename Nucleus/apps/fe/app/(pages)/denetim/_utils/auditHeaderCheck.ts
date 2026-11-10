/*
 * The audit form's header check: the team, location and date come from the
 * plan, and the auditor's name is the person's own entry. Both ways of saving a
 * new audit run it before anything is written or stored: the normal save
 * (submitForm) and "Kuyruğa al" after a photo upload stopped the save
 * (queueAfterUploadFailure). The queue button skipped it, so a form with no
 * auditor name went into the offline queue and was refused by the server on
 * replay, long after the person had left the screen.
 */

/** The header fields the check reads. */
export type AuditHeaderFields = {
  teamName: string;
  department: string;
  date: string;
  auditorName: string;
};

/** What is wrong with the header, as the toast says it; null when the form may be saved. */
export function auditHeaderProblem(header: AuditHeaderFields): string | null {
  if (!header.teamName || !header.department || !header.date) {
    return "Ekip, Lokasyon ve Tarih alanları plan üzerinden otomatik gelmelidir.";
  }
  if (!header.auditorName) return "Denetimi Yapan alanı zorunludur.";
  return null;
}
