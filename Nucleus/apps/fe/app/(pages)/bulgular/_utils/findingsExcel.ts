/*
 * The open-findings workbook of the register screen (customer notes, "Madde 15").
 * The backend writes it at `/reports/findings.xlsx`; the screen only says which
 * rows it is showing, and the server narrows a field manager's file to their
 * locations, as it does the list.
 */

import { todayAtPlant } from "@/app/_utils/auditDate";

export const FINDINGS_EXCEL_PATH = "/reports/findings.xlsx";

/** The register's filters as the screen holds them; an empty string is "not set". */
export type FindingsExcelFilters = {
  locationFilter: string;
  statusFilter: string;
  sourceFilter: "" | "audit" | "single";
  dateFrom: string;
  dateTo: string;
};

/** The query the export endpoint reads; a filter that is not set is left out by `downloadFile`. */
export function findingsExcelParams(filters: FindingsExcelFilters): Record<string, string> {
  const source = filters.sourceFilter === "" ? "" : filters.sourceFilter === "single" ? "single_finding" : "audit";
  return {
    location_name: filters.locationFilter,
    status: filters.statusFilter,
    source,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
  };
}

/**
 * The name the file gets when the server sent none: `5s-bulgu-raporu-YYYY-AA-GG.xlsx`,
 * dated by the plant's day (UTC would name yesterday between 00:00 and 03:00).
 */
export function findingsExcelFallbackName(now: Date): string {
  return `5s-bulgu-raporu-${todayAtPlant(now)}.xlsx`;
}
