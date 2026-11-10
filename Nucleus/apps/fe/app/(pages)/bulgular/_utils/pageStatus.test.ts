import { describe, expect, it } from "bun:test";
import { isFindingStatus, toPageStatus } from "./pageStatus";

describe("isFindingStatus", () => {
  it("knows the three statuses of a finding", () => {
    for (const status of ["open", "in_progress", "closed"]) expect(isFindingStatus(status)).toBe(true);
  });

  it("refuses the empty option, other words and other spellings", () => {
    for (const value of ["", "Open", "OPEN", " open", "in progress", "done", "cancelled", "all"]) {
      expect(isFindingStatus(value)).toBe(false);
    }
  });
});

describe("toPageStatus", () => {
  it("returns the status itself for each of the three", () => {
    expect(toPageStatus("open")).toBe("open");
    expect(toPageStatus("in_progress")).toBe("in_progress");
    expect(toPageStatus("closed")).toBe("closed");
  });

  it("returns Tümü for the empty option, and for a value no status matches", () => {
    expect(toPageStatus("")).toBe("");
    expect(toPageStatus("Açık")).toBe("");
    expect(toPageStatus("rejected")).toBe("");
  });
});
