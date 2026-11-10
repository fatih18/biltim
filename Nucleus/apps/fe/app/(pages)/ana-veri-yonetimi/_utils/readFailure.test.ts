import { describe, expect, it } from "bun:test";
import { readFailureMessage, type ReadSubject } from "./readFailure";

const SUBJECTS: ReadSubject[] = ["users", "roles", "teams", "actions", "findingTypes", "locations"];

describe("readFailureMessage", () => {
  it("says what could not be read, what it means and what to do, for every list the screen reads", () => {
    for (const subject of SUBJECTS) {
      const message = readFailureMessage(subject);
      // what + "okunamadı." + a sentence about the screen + the way out
      expect(message).toMatch(/^\S.* okunamadı\. \S.*\. Sayfayı yenileyip tekrar deneyin\.$/);
    }
  });

  it("tells the lists apart", () => {
    expect(new Set(SUBJECTS.map(readFailureMessage)).size).toBe(SUBJECTS.length);
  });

  it("names the planning consequence of a failed locations read", () => {
    expect(readFailureMessage("locations")).toContain("çakışma uyarıları");
  });
});
