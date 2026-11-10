import { describe, expect, it } from "bun:test";
import { detailsLockOf } from "./findingDetailsLock";
import { requiresNewFinding } from "./scoring";

/** The page's needsFindingDetails: the save's own rule. */
const needs = (
  rating: "good" | "medium" | "bad" | null,
  hasOpenFinding: boolean,
  storedRating?: "good" | "medium" | "bad" | null,
) => requiresNewFinding(rating, { hasOpenFinding, storedRating });

describe("detailsLockOf: the finding fields are hidden where no new finding will be written", () => {
  it("shows them for a new audit's Orta/Kötü with no open finding: a finding is written", () => {
    for (const rating of ["medium", "bad"] as const) {
      expect(detailsLockOf({ rating, hasOpenFinding: false, needsDetails: needs(rating, false) })).toBeNull();
    }
  });

  it("locks them when the question has an open finding", () => {
    expect(detailsLockOf({ rating: "bad", hasOpenFinding: true, needsDetails: needs("bad", true) })).toBe("open_finding");
    expect(detailsLockOf({ rating: "good", hasOpenFinding: true, needsDetails: needs("good", true) })).toBe(
      "open_finding",
    );
  });

  it("locks them in a correction for an answer that was already Orta/Kötü and has no open finding", () => {
    for (const stored of ["medium", "bad"] as const) {
      for (const rating of ["medium", "bad"] as const) {
        const needsDetails = needs(rating, false, stored);
        expect(needsDetails).toBe(false);
        expect(detailsLockOf({ rating, hasOpenFinding: false, needsDetails })).toBe("already_stored");
      }
    }
  });

  it("keeps them in a correction for an answer moved down from İyi or from no answer: a finding is written", () => {
    for (const stored of ["good", null] as const) {
      const needsDetails = needs("medium", false, stored);
      expect(needsDetails).toBe(true);
      expect(detailsLockOf({ rating: "medium", hasOpenFinding: false, needsDetails })).toBeNull();
    }
  });

  it("keeps them while no rating is picked, or İyi: the details typed now are used once Orta/Kötü is", () => {
    for (const rating of [null, undefined, "good"] as const) {
      expect(detailsLockOf({ rating, hasOpenFinding: false, needsDetails: false })).toBeNull();
    }
  });

  it("an open finding wins over a stored answer", () => {
    expect(detailsLockOf({ rating: "medium", hasOpenFinding: true, needsDetails: false })).toBe("open_finding");
  });
});
