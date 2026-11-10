import { describe, expect, it } from "bun:test";
import {
  defaultScope,
  EXPORT_SCOPES,
  exportStatuses,
  pickAfterStatusChange,
  resolveScope,
  type ScopePick,
} from "./exportScope";

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
