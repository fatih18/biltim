/*
 * The list's Durum and Kaynak filters, read from a <select>.
 *
 * A select hands back a plain string. The page used to say `as FindingStatus | ""`
 * and trust it; this checks it instead, so a value that is none of the three
 * statuses (an option added later and not wired here) falls back to Tümü ("")
 * rather than reaching the list's filter as a status that does not exist. The
 * Kaynak select (Tümü / Denetim bulguları / Tekil bulgular) is read the same way.
 */
import type { FindingStatus, PageStatus } from "./exportScope";

const STATUSES: readonly FindingStatus[] = ["open", "in_progress", "closed"];

/** The status a finding takes when it is closed, named once so the page needs no `as` to write it. */
export const CLOSED_STATUS: FindingStatus = "closed";

export function isFindingStatus(value: string): value is FindingStatus {
  return STATUSES.some((status) => status === value);
}

/** The Durum a select value stands for: its status, or "" (Tümü) for the empty option and anything unknown. */
export function toPageStatus(value: string): PageStatus {
  return isFindingStatus(value) ? value : "";
}

/** The status a row's own select picked; the empty option and anything unknown mean "open", as the page always read an empty value. */
export function toRowStatus(value: string): FindingStatus {
  return isFindingStatus(value) ? value : "open";
}

export type SourceFilter = "" | "audit" | "single";

const SOURCES: readonly SourceFilter[] = ["audit", "single"];

export function isSourceFilter(value: string): value is SourceFilter {
  return value === "" || SOURCES.some((source) => source === value);
}

/** The Kaynak a select value stands for: "audit", "single", or "" (Tümü) for the empty option and anything unknown. */
export function toSourceFilter(value: string): SourceFilter {
  return isSourceFilter(value) ? value : "";
}
