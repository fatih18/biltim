import { describe, expect, it } from "bun:test";
import { queryString } from "@/app/_utils/downloadFile";
import { findingsExcelParams } from "./findingsExcel";
import {
  defaultScope,
  downloadSummary,
  emptyChoiceMessage,
  EXPORT_SCOPES,
  exportStatuses,
  filterNotes,
  pickAfterStatusChange,
  resolveScope,
  statusParam,
  type ExportScope,
  type PageStatus,
  type ScopePick,
} from "./exportScope";

/** The query the download sends for a choice, the list's Durum and a location. */
function sent(scope: ExportScope, pageStatus: PageStatus, location = ""): URLSearchParams {
  const params = findingsExcelParams({
    locationFilter: location,
    statusFilter: statusParam(exportStatuses(scope, pageStatus)),
    sourceFilter: "",
    dateFrom: "",
    dateTo: "",
  });
  return new URLSearchParams(queryString(params));
}

describe("the choice", () => {
  it("offers Açık ve devam eden, Kapalı and Tümü, in that order", () => {
    expect(EXPORT_SCOPES.map((item) => item.label)).toEqual(["Açık ve devam eden", "Kapalı", "Tümü"]);
  });

  it("never calls the first choice just \"Açık\": elsewhere that means status open only", () => {
    expect(EXPORT_SCOPES[0]?.label).not.toBe("Açık");
    expect(EXPORT_SCOPES[0]?.label).toContain("devam eden");
  });

  it("starts on Açık ve devam eden, our promise, whatever the list shows but closed findings", () => {
    expect(defaultScope("")).toBe("open");
    expect(defaultScope("open")).toBe("open");
    expect(defaultScope("in_progress")).toBe("open");
    expect(resolveScope(null, "")).toBe("open");
  });

  it("follows a list of closed findings, so that file is not empty", () => {
    expect(defaultScope("closed")).toBe("closed");
    expect(resolveScope(null, "closed")).toBe("closed");
  });

  it("keeps what the person picked", () => {
    const pick: ScopePick = "all";
    expect(resolveScope(pick, "")).toBe("all");
  });
});

describe("the pick when the list's Durum changes", () => {
  it("keeps the pick while the Durum stays what it was", () => {
    expect(pickAfterStatusChange("all", "open", "open")).toBe("all");
    expect(pickAfterStatusChange(null, "", "")).toBeNull();
  });

  it("clears the pick when the Durum changes, so the choice follows the list again", () => {
    const cleared = pickAfterStatusChange("all", "", "closed");
    expect(cleared).toBeNull();
    expect(resolveScope(cleared, "closed")).toBe("closed");
    expect(resolveScope(pickAfterStatusChange("all", "", "open"), "open")).toBe("open");
  });

  it("does not bring an old pick back when the list goes A -> B -> A", () => {
    let pick: ScopePick = "all";
    pick = pickAfterStatusChange(pick, "", "closed");
    pick = pickAfterStatusChange(pick, "closed", "");
    expect(pick).toBeNull();
    expect(resolveScope(pick, "")).toBe("open");
  });
});

describe("the statuses of the file", () => {
  it("holds open and in-progress findings for Açık ve devam eden, closed ones for Kapalı, all three for Tümü", () => {
    expect(exportStatuses("open", "")).toEqual(["open", "in_progress"]);
    expect(exportStatuses("closed", "")).toEqual(["closed"]);
    expect(exportStatuses("all", "")).toEqual(["open", "in_progress", "closed"]);
  });

  it("narrows the choice to the list's Durum: the file is never wider than the list", () => {
    expect(exportStatuses("open", "in_progress")).toEqual(["in_progress"]);
    expect(exportStatuses("all", "open")).toEqual(["open"]);
    expect(exportStatuses("closed", "closed")).toEqual(["closed"]);
  });

  it("holds nothing when the choice and the list's Durum exclude each other", () => {
    expect(exportStatuses("closed", "open")).toEqual([]);
    expect(exportStatuses("open", "closed")).toEqual([]);
  });
});

describe("the parameters the download sends", () => {
  it("sends Açık ve devam eden as the two statuses it holds, and by default", () => {
    expect(sent("open", "").get("status")).toBe("open,in_progress");
    expect(sent(resolveScope(null, ""), "").get("status")).toBe("open,in_progress");
  });

  it("sends Kapalı as closed", () => {
    expect(sent("closed", "").get("status")).toBe("closed");
  });

  it("sends no status for Tümü, so the file is the whole register", () => {
    expect(sent("all", "").has("status")).toBe(false);
    expect(statusParam(exportStatuses("all", ""))).toBe("");
  });

  it("sends the list's Durum when it narrows the choice", () => {
    expect(sent("all", "in_progress").get("status")).toBe("in_progress");
    expect(sent("open", "open").get("status")).toBe("open");
  });

  it("keeps the list's other filters beside the status, under the names the server reads", () => {
    const params = findingsExcelParams({
      locationFilter: "Çelik Hane",
      statusFilter: statusParam(exportStatuses("open", "")),
      sourceFilter: "single",
      dateFrom: "2026-10-01",
      dateTo: "2026-10-31",
    });
    expect(params).toEqual({
      location_name: "Çelik Hane",
      status: "open,in_progress",
      source: "single_finding",
      date_from: "2026-10-01",
      date_to: "2026-10-31",
    });
    expect(sent("open", "", "Çelik Hane").get("location_name")).toBe("Çelik Hane");
  });
});

describe("what is said about an empty choice", () => {
  it("says nothing when something can match", () => {
    expect(emptyChoiceMessage("open", "")).toBeNull();
    expect(emptyChoiceMessage("all", "closed")).toBeNull();
  });

  it("says what is wrong, what it means and what to do when nothing can match", () => {
    const text = emptyChoiceMessage("closed", "open") ?? "";
    expect(text).toContain('Durum filtresi "Açık"');
    expect(text).toContain('"Kapalı"');
    expect(text).toContain("indirilecek bir şey olmaz");
    expect(text).toContain("Durum filtresini Tümü yapın");
  });

  it("names the first choice in full", () => {
    expect(emptyChoiceMessage("open", "closed")).toContain('"Açık ve devam eden" seçimiyle');
  });
});

describe("downloadSummary", () => {
  const open = exportStatuses("open", "");

  it("names the count and what is counted once the server has counted", () => {
    expect(downloadSummary(open, 12)).toBe("12 açık ve devam eden bulgu indirilecek.");
    expect(downloadSummary(exportStatuses("closed", ""), 3)).toBe("3 kapalı bulgu indirilecek.");
    expect(downloadSummary(exportStatuses("all", ""), 40)).toBe("40 bulgu indirilecek.");
    expect(downloadSummary(exportStatuses("all", "in_progress"), 5)).toBe("5 devam eden bulgu indirilecek.");
  });

  it("writes a thousand the way Turkish does", () => {
    expect(downloadSummary(open, 1234)).toBe("1.234 açık ve devam eden bulgu indirilecek.");
  });

  it("gives no number while the count is not known", () => {
    expect(downloadSummary(open, null)).toBe("Açık ve devam eden bulgular indirilecek.");
    expect(downloadSummary(exportStatuses("all", ""), null)).toBe("Tüm bulgular indirilecek.");
    expect(downloadSummary(exportStatuses("closed", ""), null)).toBe("Kapalı bulgular indirilecek.");
  });

  it("says before the download that the file would be empty", () => {
    expect(downloadSummary(open, 0)).toBe("Seçime uyan açık ve devam eden bulgu yok; indirilen dosya boş olur.");
  });

  it("says nothing when no status is left", () => {
    expect(downloadSummary([], 7)).toBe("");
  });
});

describe("filterNotes", () => {
  const none: Parameters<typeof filterNotes>[0] = { locationFilter: "", sourceFilter: "", dateFrom: "", dateTo: "" };

  it("names nothing when the list is not narrowed", () => {
    expect(filterNotes(none)).toEqual([]);
  });

  it("names each filter that is set", () => {
    expect(
      filterNotes({ locationFilter: "Haddehane", sourceFilter: "audit", dateFrom: "2026-10-01", dateTo: "2026-10-31" })
    ).toEqual(["Lokasyon: Haddehane", "Kaynak: denetim bulguları", "Tespit tarihi: 2026-10-01 – 2026-10-31"]);
  });

  it("shows an open end of the date range as an ellipsis", () => {
    expect(filterNotes({ ...none, dateFrom: "2026-10-01" })).toEqual(["Tespit tarihi: 2026-10-01 – …"]);
    expect(filterNotes({ ...none, sourceFilter: "single", dateTo: "2026-10-31" })).toEqual([
      "Kaynak: tekil bulgular",
      "Tespit tarihi: … – 2026-10-31",
    ]);
  });
});
