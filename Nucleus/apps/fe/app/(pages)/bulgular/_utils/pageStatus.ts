/*
 * The list's Durum filter, read from a <select>.
 *
 * A select hands back a plain string. The page used to say `as FindingStatus | ""`
 * and trust it; this checks it instead, so a value that is none of the three
 * statuses (an option added later and not wired here) falls back to Tümü ("")
 * rather than reaching the list's filter as a status that does not exist.
 */
import type { FindingStatus, PageStatus } from "./exportScope";

const STATUSES: readonly FindingStatus[] = ["open", "in_progress", "closed"];

export function isFindingStatus(value: string): value is FindingStatus {
  return STATUSES.some((status) => status === value);
}

/** The Durum a select value stands for: its status, or "" (Tümü) for the empty option and anything unknown. */
export function toPageStatus(value: string): PageStatus {
  return isFindingStatus(value) ? value : "";
}
