import { describe, expect, it } from "bun:test";
import { CLOSED_STATUS, isFindingStatus, isSourceFilter, toPageStatus, toRowStatus, toSourceFilter } from "./pageStatus";

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

describe("CLOSED_STATUS", () => {
  it("is the closed status, one of the three the guard knows", () => {
    expect(CLOSED_STATUS).toBe("closed");
    expect(isFindingStatus(CLOSED_STATUS)).toBe(true);
  });
});

describe("toRowStatus", () => {
  it("returns the status itself for each of the three", () => {
    expect(toRowStatus("open")).toBe("open");
    expect(toRowStatus("in_progress")).toBe("in_progress");
    expect(toRowStatus("closed")).toBe("closed");
  });

  it("reads the empty option and a value no status matches as open, never as a status that does not exist", () => {
    expect(toRowStatus("")).toBe("open");
    expect(toRowStatus("Kapalı")).toBe("open");
    expect(toRowStatus("CLOSED")).toBe("open");
  });
});

describe("isSourceFilter", () => {
  it("knows Tümü and the two sources a finding has", () => {
    for (const source of ["", "audit", "single"]) expect(isSourceFilter(source)).toBe(true);
  });

  it("refuses other words and other spellings", () => {
    for (const value of ["Audit", "AUDIT", " single", "all", "manual", "denetim"]) {
      expect(isSourceFilter(value)).toBe(false);
    }
  });
});

describe("toSourceFilter", () => {
  it("returns the source itself, and Tümü for the empty option", () => {
    expect(toSourceFilter("audit")).toBe("audit");
    expect(toSourceFilter("single")).toBe("single");
    expect(toSourceFilter("")).toBe("");
  });

  it("returns Tümü for a value no source matches", () => {
    expect(toSourceFilter("Tekil bulgular")).toBe("");
    expect(toSourceFilter("manual")).toBe("");
  });
});
