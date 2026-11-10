import { describe, expect, it } from "bun:test";
import { explanationMissing, openFindingsFor, questionsAddedHere, sessionFindingsOfReplay } from "./singleFinding";

const needsText = { requireExplanation: true };
const bad = { rating: "bad" as const, explanation: "" };

describe("questionsAddedHere — findings added during THIS audit only (R2/R17)", () => {
  it("counts a finding saved from the modal in this session, at this location", () => {
    const added = questionsAddedHere("Bölge 3", {
      queuedQuestionIds: [],
      session: [{ questionId: "S1-1", location: "bölge 3", findingNo: 21 }],
    });
    expect([...added]).toEqual(["S1-1"]);
  });

  it("counts a single finding still waiting in the offline queue", () => {
    const added = questionsAddedHere("Bölge 3", { queuedQuestionIds: ["S2-1", ""], session: [] });
    expect([...added]).toEqual(["S2-1"]);
  });

  it("ignores a session finding saved for another location", () => {
    const added = questionsAddedHere("Bölge 3", {
      queuedQuestionIds: [],
      session: [{ questionId: "S1-1", location: "İdari Bina", findingNo: 5 }],
    });
    expect(added.size).toBe(0);
  });

  it("does not know a finding that was open before the audit: the server read is not a source", () => {
    // openFindingsFor lists it (the question shows "Açık bulgu #7") ...
    const open = openFindingsFor("Bölge 3", {
      findings: [{ question_id: "S1-1", status: "open", finding_no: 7 }],
      queuedQuestionIds: [],
      session: [],
    });
    expect(open.get("S1-1")).toEqual(["#7"]);
    // ... but it was not added in this audit, so it waives no explanation.
    const added = questionsAddedHere("Bölge 3", { queuedQuestionIds: [], session: [] });
    expect(explanationMissing(needsText, bad, added.has("S1-1"))).toBe(true);
  });

  it("waives the explanation for the question just given a finding, and only for it", () => {
    const added = questionsAddedHere("Bölge 3", {
      queuedQuestionIds: [],
      session: [{ questionId: "S1-1", location: "Bölge 3", findingNo: 21 }],
    });
    expect(explanationMissing(needsText, bad, added.has("S1-1"))).toBe(false);
    expect(explanationMissing(needsText, bad, added.has("S1-2"))).toBe(true);
  });
});

describe("sessionFindingsOfReplay — a replayed single finding keeps counting (R2/R17)", () => {
  const queued = [
    { question_id: "S1-1", location_name: "Bölge 3", client_finding_id: "c-1" },
    { question_id: null, location_name: "Bölge 3", client_finding_id: "c-2" },
    { question_id: "S1-2", location_name: "İdari Bina", client_finding_id: "c-3" },
  ];

  it("turns each question-linked finding into a session finding with its location", () => {
    expect(sessionFindingsOfReplay(queued)).toEqual([
      { questionId: "S1-1", location: "Bölge 3", findingNo: null },
      { questionId: "S1-2", location: "İdari Bina", findingNo: null },
    ]);
  });

  it("carries the number the server gave, when the replay saw it", () => {
    const saved = sessionFindingsOfReplay(queued, new Map([["c-1", 31]]));
    expect(saved[0]).toEqual({ questionId: "S1-1", location: "Bölge 3", findingNo: 31 });
    expect(saved[1]?.findingNo).toBeNull();
  });

  it("leaves out a finding linked to no question, and tolerates empty input", () => {
    expect(sessionFindingsOfReplay([{ question_id: "  ", location_name: "X" }])).toEqual([]);
    expect(sessionFindingsOfReplay([])).toEqual([]);
  });

  it("the question is still open at that location the moment the queue empties", () => {
    const replayed = sessionFindingsOfReplay(queued, new Map([["c-1", 31]]));
    // the queue list no longer holds it, the closing read has not come back yet
    const map = openFindingsFor("Bölge 3", { findings: [], queuedQuestionIds: [], session: replayed });
    expect(map.get("S1-1")).toEqual(["#31"]);
    expect(map.has("S1-2")).toBe(false);
    expect(openFindingsFor("İdari Bina", { findings: [], queuedQuestionIds: [], session: replayed }).get("S1-2")).toEqual([
      "yeni eklendi",
    ]);
  });
});
