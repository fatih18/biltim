/*
 * Which findings the Excel button of the Bulgular page downloads (R48).
 *
 * Our promise to the customer: "Açık bulgular Excel olarak indirilebilir". The
 * download therefore has its own explicit choice, Açık / Kapalı / Tümü, and it
 * starts on Açık. It never leaves the screen's other filters behind: the file
 * holds what the list shows (location, source, date range, Durum) narrowed by
 * the choice, and the sentence beside the button says what that is.
 *
 * "Açık" is every finding that is not closed, so it holds the ones still
 * "Devam ediyor" too: the server's overdue counts and the location form read
 * "open" the same way.
 */

export type FindingStatus = "open" | "in_progress" | "closed";
/** The list's Durum filter: one status, or "" for Tümü. */
export type PageStatus = FindingStatus | "";
export type ExportScope = "open" | "closed" | "all";

export const EXPORT_SCOPES: readonly { value: ExportScope; label: string }[] = [
  { value: "open", label: "Açık" },
  { value: "closed", label: "Kapalı" },
  { value: "all", label: "Tümü" },
];

const SCOPE_STATUSES: Record<ExportScope, readonly FindingStatus[]> = {
  open: ["open", "in_progress"],
  closed: ["closed"],
  all: ["open", "in_progress", "closed"],
};

/** The choice the person made, and the Durum filter it was made under. */
export type ScopePick = { scope: ExportScope; madeUnder: PageStatus } | null;

/** The choice with nobody's pick: Açık, our promise; Kapalı only while the list is showing closed findings. */
export function defaultScope(pageStatus: PageStatus): ExportScope {
  return pageStatus === "closed" ? "closed" : "open";
}

/**
 * The choice in force. A pick holds while the list's Durum is what it was when
 * the person picked; when Durum changes the choice follows the list again, so a
 * list of closed findings is not downloaded as "Açık" and arrives empty.
 */
export function resolveScope(pick: ScopePick, pageStatus: PageStatus): ExportScope {
  return pick && pick.madeUnder === pageStatus ? pick.scope : defaultScope(pageStatus);
}

/** The statuses the file holds: the choice narrowed by the list's Durum. Empty = nothing can match. */
export function exportStatuses(scope: ExportScope, pageStatus: PageStatus): FindingStatus[] {
  const inScope = SCOPE_STATUSES[scope];
  return pageStatus === "" ? [...inScope] : inScope.filter((status) => status === pageStatus);
}

/**
 * The `status` parameter of the export: every status of the file as a comma
 * list, and nothing at all for all three, so "Tümü" is the whole register.
 */
export function statusParam(statuses: readonly FindingStatus[]): string {
  return statuses.length === SCOPE_STATUSES.all.length ? "" : statuses.join(",");
}

const PAGE_STATUS_LABEL: Record<FindingStatus, string> = {
  open: "Açık",
  in_progress: "Devam ediyor",
  closed: "Kapandı",
};

/** Said when the choice and the list's Durum leave no finding: what is wrong, what it means, what to do. */
export function emptyChoiceMessage(scope: ExportScope, pageStatus: PageStatus): string | null {
  if (exportStatuses(scope, pageStatus).length > 0 || pageStatus === "") return null;
  const label = EXPORT_SCOPES.find((item) => item.value === scope)?.label ?? scope;
  return `Listede Durum filtresi "${PAGE_STATUS_LABEL[pageStatus]}" seçili; "${label}" seçimiyle birlikte hiç bulgu kalmaz ve indirilecek bir şey olmaz. Durum filtresini Tümü yapın ya da başka bir seçim yapın.`;
}

/** The finding the file holds, in words: with a number (known) and without one. */
function wording(statuses: readonly FindingStatus[]): { counted: string; plain: string } {
  const key = statuses.join(",");
  if (key === "open,in_progress") return { counted: "açık bulgu", plain: "Açık bulgular" };
  if (key === "open") return { counted: "açık durumdaki bulgu", plain: "Açık durumdaki bulgular" };
  if (key === "in_progress") return { counted: "devam eden bulgu", plain: "Devam eden bulgular" };
  if (key === "closed") return { counted: "kapalı bulgu", plain: "Kapalı bulgular" };
  return { counted: "bulgu", plain: "Tüm bulgular" };
}

const numbers = new Intl.NumberFormat("tr-TR");

/**
 * What will be downloaded, as one sentence: "12 açık bulgu indirilecek" when the
 * server has counted them, "Açık bulgular indirilecek" when it has not (still
 * counting, or the count failed). An empty file is said before it is made.
 */
export function downloadSummary(statuses: readonly FindingStatus[], count: number | null): string {
  if (statuses.length === 0) return "";
  const words = wording(statuses);
  if (count === null) return `${words.plain} indirilecek.`;
  if (count === 0) return `Seçime uyan ${words.counted} yok; indirilen dosya boş olur.`;
  return `${numbers.format(count)} ${words.counted} indirilecek.`;
}

/** The list's own filters that also narrow the file, so the page can name them next to the button. */
export function filterNotes(filters: {
  locationFilter: string;
  sourceFilter: "" | "audit" | "single";
  dateFrom: string;
  dateTo: string;
}): string[] {
  const notes: string[] = [];
  if (filters.locationFilter) notes.push(`Lokasyon: ${filters.locationFilter}`);
  if (filters.sourceFilter) notes.push(filters.sourceFilter === "single" ? "Kaynak: tekil bulgular" : "Kaynak: denetim bulguları");
  if (filters.dateFrom || filters.dateTo) notes.push(`Tespit tarihi: ${filters.dateFrom || "…"} – ${filters.dateTo || "…"}`);
  return notes;
}
