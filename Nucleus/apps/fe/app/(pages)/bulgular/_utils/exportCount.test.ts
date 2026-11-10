import { describe, expect, it } from "bun:test";
import { countToShow, readCount } from "./exportCount";

describe("readCount", () => {
  it("reads the total of an opened response", () => {
    expect(readCount({ total: 12 })).toBe(12);
    expect(readCount({ total: 0 })).toBe(0);
  });

  it("reads the total of a response whose envelope is still on", () => {
    expect(readCount({ success: true, data: { total: 7 } })).toBe(7);
  });

  it("does not know a count that is not a whole, non-negative number", () => {
    expect(readCount({ total: "12" })).toBeNull();
    expect(readCount({ total: -1 })).toBeNull();
    expect(readCount({ total: 1.5 })).toBeNull();
    expect(readCount({ total: null })).toBeNull();
  });

  it("does not know a count out of anything else", () => {
    expect(readCount(undefined)).toBeNull();
    expect(readCount(null)).toBeNull();
    expect(readCount(5)).toBeNull();
    expect(readCount([{ total: 5 }])).toBeNull();
    expect(readCount({})).toBeNull();
    expect(readCount({ data: [] })).toBeNull();
  });
});

describe("countToShow", () => {
  it("shows the answer for the parameters on screen", () => {
    expect(countToShow({ key: "?status=open", total: 12 }, "?status=open", true)).toBe(12);
  });

  it("shows no number for an answer to other parameters, so a late answer is never shown for new filters", () => {
    expect(countToShow({ key: "?status=open", total: 12 }, "?status=closed", true)).toBeNull();
  });

  it("shows no number before any answer, after a failed count, or when nothing can match", () => {
    expect(countToShow(null, "?status=open", true)).toBeNull();
    expect(countToShow({ key: "?status=open", total: null }, "?status=open", true)).toBeNull();
    expect(countToShow({ key: "?status=open", total: 12 }, "?status=open", false)).toBeNull();
  });
});
