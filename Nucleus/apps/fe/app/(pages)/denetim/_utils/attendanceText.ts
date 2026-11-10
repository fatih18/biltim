/*
 * Every sentence the attendance box says, in one place so the box, the
 * confirmation, the correction screen's warnings and the tests use the same
 * words (Notlar 22.10, satır 39).
 */

export const ATTENDANCE_LABEL = "Bölge sorumlusu veya görevlendirdiği kişi denetime katıldı";

export const ATTENDANCE_HINT = "İşaretlenmezse sorular pasif kalır; denetim 0 puanla kaydedilir.";

export const NO_FIELD_MANAGER_TEXT =
  "Bu lokasyona saha sorumlusu tanımlı değil; bölge sorumlusu katılım kuralı uygulanmaz.";

/** One line above the greyed questions: what it means and what to do. */
export const PASSIVE_NOTICE =
  "Sorular pasif: denetim 0 puanla kaydedilecek. Soruları doldurmak için yukarıdaki kutuyu işaretleyin.";

export const NOT_ATTENDED_CONFIRM: { readonly title: string; readonly message: string } = {
  title: "Bölge sorumlusu veya görevlendirdiği kişi katılmadı olarak kaydedilecek",
  message: `"${ATTENDANCE_LABEL}" işaretli değil. Sorular yanıtlanmadan denetim puanı 0 olarak kaydedilecek. Devam edilsin mi?`,
};

/** Merkez Ekip's correction: the plan could not tell whether anyone attended. */
export function unknownAttendanceWarning(planUnreadable: boolean): string {
  const why = planUnreadable ? "Denetimin planı okunamadı" : "Denetimin planı bulunamadı";
  return `${why}; bölge sorumlusunun veya görevlendirdiği kişinin katılıp katılmadığı bilinmiyor. Kayıtlı 0 puan korunuyor: katıldıysa "${ATTENDANCE_LABEL}" kutusunu işaretleyin.`;
}

/**
 * The correction screen's note for an audit that has no answer rows.
 * Three different causes: an audit saved without attendance (nothing was
 * asked, on purpose), an audit whose plan could not be read, so nobody can say
 * whether anyone attended (`attendanceUnknown`: the stored 0 is no proof of
 * a "no", and the note must not claim one), and an old record from before
 * answers were stored. A location with no field manager has no attendance
 * rule, so the first two are never said there: it is the old-record sentence.
 */
export function noAnswersNotice(audit: {
  hadAnswers: boolean;
  initialAttended: boolean;
  /** Already gated by `ruleApplies`: unknown where the rule does not apply is not unknown, it is moot. */
  attendanceUnknown: boolean;
  /** The location has a field manager, so the attendance rule applies to it. */
  ruleApplies: boolean;
}): string {
  if (audit.hadAnswers) return "";
  if (audit.attendanceUnknown) {
    return ` Bu denetimin soru yanıtı kayıtlı değil ve planına ulaşılamadığı için katılım durumu bilinmiyor (puan 0). Yanıtları girerek puanı düzeltebilirsiniz; bölge sorumlusu veya görevlendirdiği kişi katıldıysa önce "${ATTENDANCE_LABEL}" kutusunu işaretleyin.`;
  }
  if (!audit.initialAttended && audit.ruleApplies) {
    return ` Bölge sorumlusu veya görevlendirdiği kişi katılmadığı için bu denetimde soru yanıtlanmamış (puan 0); yanıtları girmek için "${ATTENDANCE_LABEL}" kutusunu işaretleyin.`;
  }
  return " Bu denetimin soru yanıtları kaydedilmemiş (eski kayıt); yanıtları yeniden girerek puanı düzeltebilirsiniz.";
}
