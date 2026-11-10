import { describe, expect, it } from "bun:test";
import { queryString } from "@/app/_utils/downloadFile";
import { findingsExcelFallbackName, findingsExcelParams, type FindingsExcelFilters } from "./findingsExcel";

const none: FindingsExcelFilters = { locationFilter: "", statusFilter: "", sourceFilter: "", dateFrom: "", dateTo: "" };

describe("findingsExcelParams", () => {
  it("sends nothing when no filter is set", () => {
    expect(queryString(findingsExcelParams(none))).toBe("");
  });

  it("sends the filters under the names the export endpoint reads", () => {
    const params = findingsExcelParams({
      locationFilter: "Haddehane",
      statusFilter: "open",
      sourceFilter: "audit",
      dateFrom: "2026-10-01",
      dateTo: "2026-10-31",
    });
    expect(params).toEqual({
      location_name: "Haddehane",
      status: "open",
      source: "audit",
      date_from: "2026-10-01",
      date_to: "2026-10-31",
    });
  });

  it("calls the single-finding form's findings single_finding", () => {
    expect(findingsExcelParams({ ...none, sourceFilter: "single" }).source).toBe("single_finding");
  });

  it("keeps a location name with Turkish letters and spaces intact in the query", () => {
    const qs = queryString(findingsExcelParams({ ...none, locationFilter: "Çelik Hane İ" }));
    expect(new URLSearchParams(qs).get("location_name")).toBe("Çelik Hane İ");
  });
});

describe("findingsExcelFallbackName", () => {
  it("is dated by the day it was made", () => {
    expect(findingsExcelFallbackName(new Date("2026-11-10T09:00:00Z"))).toBe("5s-bulgu-raporu-2026-11-10.xlsx");
  });

  it("is dated by the plant's day, not UTC's, between 00:00 and 03:00 in Turkey", () => {
    // 22:30 UTC on the 9th is 01:30 on the 10th at the plant (UTC+3).
    expect(findingsExcelFallbackName(new Date("2026-11-09T22:30:00Z"))).toBe("5s-bulgu-raporu-2026-11-10.xlsx");
    // 20:59 UTC is still 23:59 on the 9th.
    expect(findingsExcelFallbackName(new Date("2026-11-09T20:59:00Z"))).toBe("5s-bulgu-raporu-2026-11-09.xlsx");
  });
});
