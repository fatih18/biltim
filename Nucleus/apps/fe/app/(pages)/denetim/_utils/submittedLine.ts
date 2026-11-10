/*
 * The line under the summary table once the form was handed in.
 *
 * It used to read the connection ("Form başarıyla gönderildi." when online) and
 * not what happened to the form. A form queued while online (the photo upload
 * stopped the save and the person pressed "Kuyruğa al", or the audit request
 * failed in passing and the form went to the queue) was announced as SENT while
 * it was still on the device. The line now follows the form: queued or sent.
 */

/** What the form's hand-in came to: sent to the server, or stored in the offline queue. */
export type SubmittedForm = { queued: boolean; online: boolean };

/** The confirmation line for a form that was handed in. */
export function submittedLine(form: SubmittedForm): string {
  if (!form.queued) return "Form başarıyla gönderildi.";
  if (!form.online) return "Form offline kuyruğa alındı (internet gelince gönderilecek).";
  return "Form kuyruğa alındı, henüz gönderilmedi. Bağlantı uygun olduğu için birazdan otomatik gönderilecek; gönderilemezse kayıt cihazda bekler.";
}
