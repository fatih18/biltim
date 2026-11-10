import { describe, expect, it } from "bun:test";
import { explanationMissing, openFindingsFor, questionsAddedHere, sessionFindingsOfReplay } from "./singleFinding";

const needsText = { requireExplanation: true };
const bad = { rating: "bad" as const, explanation: "" };
/** The plan of the audit that is open in these tests. */
const PLAN = "plan-1";

describe("questionsAddedHere — findings added during THIS audit only (R2/R17)", () => {
  it("counts a finding saved from the modal in this session, at this location", () => {
    const added = questionsAddedHere(
      "Bölge 3",
      { queued: [], session: [{ questionId: "S1-1", location: "bölge 3", findingNo: 21, auditPlanId: PLAN }] },
      PLAN,
    );
    expect([...added]).toEqual(["S1-1"]);
  });

  it("counts a single finding still waiting in the offline queue, queued inside this audit", () => {
    const added = questionsAddedHere(
      "Bölge 3",
      {
        queued: [
          { questionId: "S2-1", location: "bölge 3", planId: PLAN },
          { questionId: "", location: "Bölge 3", planId: PLAN },
        ],
        session: [],
      },
      PLAN,
    );
    expect([...added]).toEqual(["S2-1"]);
  });

  describe("a standalone single finding waiting in the offline queue", () => {
    const standalone = { questionId: "S1-1", location: "Bölge 3", planId: null };

    it("is not added in this audit: it waives no explanation", () => {
      const added = questionsAddedHere("Bölge 3", { queued: [standalone], session: [] }, PLAN);
      expect(added.size).toBe(0);
      expect(explanationMissing(needsText, bad, added.has("S1-1"))).toBe(true);
    });

    it("is still the question's open finding at that location, so no second finding is demanded", () => {
      const open = openFindingsFor("Bölge 3", { findings: [], queuedQuestionIds: ["S1-1"], session: [] });
      expect(open.has("S1-1")).toBe(true);
    });

    it("does not count in an audit of another plan, and the one queued inside this audit still does", () => {
      const other = { questionId: "S1-2", location: "Bölge 3", planId: "plan-2" };
      const mine = { questionId: "S1-3", location: "Bölge 3", planId: PLAN };
      const added = questionsAddedHere("Bölge 3", { queued: [standalone, other, mine], session: [] }, PLAN);
      expect([...added]).toEqual(["S1-3"]);
    });

    it("counts for nothing while no audit is open", () => {
      const inAudit = { questionId: "S1-2", location: "Bölge 3", planId: PLAN };
      expect(questionsAddedHere("Bölge 3", { queued: [standalone, inAudit], session: [] }, null).size).toBe(0);
    });

    it("ignores a queued finding of another location, even inside this audit", () => {
      const elsewhere = { questionId: "S1-1", location: "İdari Bina", planId: PLAN };
      expect(questionsAddedHere("Bölge 3", { queued: [elsewhere], session: [] }, PLAN).size).toBe(0);
    });

    it("an empty location matches no queued finding", () => {
      const nowhere = { questionId: "S1-1", location: "", planId: PLAN };
      expect(questionsAddedHere("", { queued: [nowhere], session: [] }, PLAN).size).toBe(0);
    });
  });

  it("ignores a session finding saved for another location", () => {
    const added = questionsAddedHere(
      "Bölge 3",
      { queued: [], session: [{ questionId: "S1-1", location: "İdari Bina", findingNo: 5, auditPlanId: PLAN }] },
      PLAN,
    );
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
    const added = questionsAddedHere("Bölge 3", { queued: [], session: [] }, PLAN);
    expect(explanationMissing(needsText, bad, added.has("S1-1"))).toBe(true);
  });

  it("waives the explanation for the question just given a finding, and only for it", () => {
    const added = questionsAddedHere(
      "Bölge 3",
      { queued: [], session: [{ questionId: "S1-1", location: "Bölge 3", findingNo: 21, auditPlanId: PLAN }] },
      PLAN,
    );
    expect(explanationMissing(needsText, bad, added.has("S1-1"))).toBe(false);
    expect(explanationMissing(needsText, bad, added.has("S1-2"))).toBe(true);
  });

  describe("a standalone finding saved earlier in the same page visit", () => {
    const standalone = { questionId: "S1-1", location: "Bölge 3", findingNo: 21, auditPlanId: null };

    it("is not added in this audit: it waives no explanation", () => {
      const added = questionsAddedHere("Bölge 3", { queued: [], session: [standalone] }, PLAN);
      expect(added.size).toBe(0);
      expect(explanationMissing(needsText, bad, added.has("S1-1"))).toBe(true);
    });

    it("is still the question's open finding at that location, so no second finding is demanded", () => {
      const open = openFindingsFor("Bölge 3", { findings: [], queuedQuestionIds: [], session: [standalone] });
      expect(open.get("S1-1")).toEqual(["#21"]);
    });

    it("counts for nothing while no audit is open", () => {
      const inAudit = { ...standalone, auditPlanId: PLAN };
      expect(questionsAddedHere("Bölge 3", { queued: [], session: [standalone, inAudit] }, null).size).toBe(0);
    });

    it("does not count in an audit of another plan, and the finding raised in this audit still does", () => {
      const other = { ...standalone, questionId: "S1-2", auditPlanId: "plan-2" };
      const mine = { ...standalone, questionId: "S1-3", auditPlanId: PLAN };
      const added = questionsAddedHere("Bölge 3", { queued: [], session: [standalone, other, mine] }, PLAN);
      expect([...added]).toEqual(["S1-3"]);
    });
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
      { questionId: "S1-1", location: "Bölge 3", findingNo: null, auditPlanId: null },
      { questionId: "S1-2", location: "İdari Bina", findingNo: null, auditPlanId: null },
    ]);
  });

  it("carries the number the server gave, when the replay saw it", () => {
    const saved = sessionFindingsOfReplay(queued, new Map([["c-1", 31]]));
    expect(saved[0]).toEqual({ questionId: "S1-1", location: "Bölge 3", findingNo: 31, auditPlanId: null });
    expect(saved[1]?.findingNo).toBeNull();
  });

  it("tags each with the plan the submission was queued for, so only that audit counts it as added here", () => {
    const saved = sessionFindingsOfReplay(queued, new Map(), PLAN);
    expect(saved.every((s) => s.auditPlanId === PLAN)).toBe(true);
    expect(questionsAddedHere("Bölge 3", { queued: [], session: saved }, PLAN).has("S1-1")).toBe(true);
    expect(questionsAddedHere("Bölge 3", { queued: [], session: saved }, "plan-2").size).toBe(0);
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
