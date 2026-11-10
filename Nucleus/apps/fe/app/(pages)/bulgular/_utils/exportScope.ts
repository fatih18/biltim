/*
 * Which findings the Excel button of the Bulgular page downloads (R48).
 *
 * Our promise to the customer: "Açık bulgular Excel olarak indirilebilir". The
 * download therefore has its own explicit choice, Açık ve devam eden / Kapalı /
 * Tümü, and it starts on the first. It never leaves the screen's other filters behind: the file
 * holds what the list shows (location, source, date range, Durum) narrowed by
 * the choice, and the sentence beside the button says what that is.
 *
 * The first choice holds the findings that are open AND the ones still "Devam
 * ediyor": an audit follow-up file needs both. Everywhere else in the product
 * "Açık" means status open only, so this choice says "Açık ve devam eden" in
 * its label and in the sentence beside the button, and never just "Açık".
 */

export type FindingStatus = "open" | "in_progress" | "closed";
/** The list's Durum filter: one status, or "" for Tümü. */
export type PageStatus = FindingStatus | "";
export type ExportScope = "open" | "closed" | "all";

export const EXPORT_SCOPES: readonly { value: ExportScope; label: string }[] = [
  { value: "open", label: "Açık ve devam eden" },
  { value: "closed", label: "Kapalı" },
  { value: "all", label: "Tümü" },
];

const SCOPE_STATUSES: Record<ExportScope, readonly FindingStatus[]> = {
  open: ["open", "in_progress"],
  closed: ["closed"],
  all: ["open", "in_progress", "closed"],
};

/** The choice the person made, or null while they have made none. */
export type ScopePick = ExportScope | null;

/** The choice with nobody's pick: Açık ve devam eden, our promise; Kapalı only while the list is showing closed findings. */
export function defaultScope(pageStatus: PageStatus): ExportScope {
  return pageStatus === "closed" ? "closed" : "open";
}

/** The choice in force: the person's pick, or the default for the list's Durum while they have not picked. */
export function resolveScope(pick: ScopePick, pageStatus: PageStatus): ExportScope {
  return pick ?? defaultScope(pageStatus);
}

/**
 * The pick after the list's Durum went from `previous` to `next`. A change
 * clears it, so the choice follows the list again and a list of closed findings
 * is not downloaded as "Açık ve devam eden" and arrives empty. It is cleared for
 * good, not parked: a pick made under Durum A does not come back when the list
 * goes A -> B -> A.
 */
export function pickAfterStatusChange(pick: ScopePick, previous: PageStatus, next: PageStatus): ScopePick {
  return previous === next ? pick : null;
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
  if (key === "open,in_progress") return { counted: "açık ve devam eden bulgu", plain: "Açık ve devam eden bulgular" };
  if (key === "open") return { counted: "açık durumdaki bulgu", plain: "Açık durumdaki bulgular" };
  if (key === "in_progress") return { counted: "devam eden bulgu", plain: "Devam eden bulgular" };
  if (key === "closed") return { counted: "kapalı bulgu", plain: "Kapalı bulgular" };
  return { counted: "bulgu", plain: "Tüm bulgular" };
}

const numbers = new Intl.NumberFormat("tr-TR");

/**
 * What will be downloaded, as one sentence: "12 açık ve devam eden bulgu
 * indirilecek" when the server has counted them, "Açık ve devam eden bulgular
 * indirilecek" when it has not (still counting, or the count failed). An empty
 * file is said before it is made.
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
