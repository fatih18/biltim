/*
 * A list read of the planning screens that failed, said as three things in
 * order: what could not be read, what that means on this screen, and what to
 * do. Without it the screen shows an empty list and the person has no way to
 * tell "nothing here" from "could not be read".
 */

export type ReadSubject = "users" | "roles" | "teams" | "actions" | "findingTypes" | "locations";

const SUBJECTS: Record<ReadSubject, { what: string; effect: string }> = {
  users: { what: "Kullanıcılar", effect: "Ekip üyesi ve lokasyon sorumlusu seçimleri boş görünür." },
  roles: { what: "Kullanıcı rolleri", effect: "Ekip üyesi seçiminde denetçi süzmesi çalışmaz." },
  teams: { what: "Denetim ekipleri", effect: "Planlamada ekip seçimi boş görünür." },
  actions: { what: "Aksiyonlar", effect: "Aksiyon listesi boş görünür." },
  findingTypes: { what: "Bulgu türleri", effect: "Bulgu türü listesi boş görünür." },
  locations: {
    what: "Lokasyonlar",
    effect: "Planlamada lokasyon seçimi boş görünür ve saha sorumlusu çakışma uyarıları çalışmaz.",
  },
};

export function readFailureMessage(subject: ReadSubject): string {
  const { what, effect } = SUBJECTS[subject];
  return `${what} okunamadı. ${effect} Sayfayı yenileyip tekrar deneyin.`;
}
