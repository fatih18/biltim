import { describe, expect, it } from "bun:test";
import { previousNumberText } from "./previousNumber";

describe("previousNumberText", () => {
  it("names the old number in the label and explains it in the tooltip", () => {
    expect(previousNumberText(2)).toEqual({
      label: "eski no: #2",
      title: "Bu numara yeniden numaralandı; eski numarası #2",
    });
    expect(previousNumberText(14)?.label).toBe("eski no: #14");
  });

  it("is nothing for a finding that was never renumbered", () => {
    expect(previousNumberText(null)).toBeNull();
    expect(previousNumberText(undefined)).toBeNull();
  });

  it("is nothing for a value that is not a whole number", () => {
    expect(previousNumberText(Number.NaN)).toBeNull();
    expect(previousNumberText(1.5)).toBeNull();
    expect(previousNumberText(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
