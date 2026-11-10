import { describe, expect, it } from "bun:test";
import { SINGLE_FINDING_TITLE } from "@/app/_utils/singleFindingTitle";
import { type Rating, requiresNewFinding } from "./scoring";
import {
  explanationMissing,
  findingNoOf,
  openFindingsFor,
  queuedSubmissionLabel,
  singleFindingHeading,
  singleFindingMode,
  singleFindingTitle,
} from "./singleFinding";

describe("singleFindingMode — started audit or standalone (R16)", () => {
  it("a started plan makes it an in-audit finding that must name its question", () => {
    expect(singleFindingMode("plan-1")).toEqual({ inAudit: true, questionRequired: true });
  });

  it("no started plan is a standalone finding: no plan link, question optional", () => {
    expect(singleFindingMode(null)).toEqual({ inAudit: false, questionRequired: false });
    expect(singleFindingMode(undefined)).toEqual({ inAudit: false, questionRequired: false });
    expect(singleFindingMode("")).toEqual({ inAudit: false, questionRequired: false });
  });
});

describe("singleFindingTitle — the audit's name inside an audit (R74)", () => {
  const inAudit = singleFindingMode("plan-1");
  const alone = singleFindingMode(null);

  it("uses the audit's own name inside an audit", () => {
    expect(singleFindingTitle(inAudit, "Bölge 3 · 10.11.2026")).toBe("Bölge 3 · 10.11.2026");
  });

  it("keeps 'Tekil Bulgu' for a standalone finding, whatever the header says", () => {
    expect(singleFindingTitle(alone, "Bölge 3 · 10.11.2026")).toBe(SINGLE_FINDING_TITLE);
  });

  it("falls back to 'Tekil Bulgu' when an audit has no name to give", () => {
    expect(singleFindingTitle(inAudit, "  ")).toBe(SINGLE_FINDING_TITLE);
  });

  it("heads the description with the audit's name instead of TEKİL BULGU", () => {
    expect(singleFindingHeading("Bölge 3 · 10.11.2026")).toBe("Ana Denetim: Bölge 3 · 10.11.2026");
    expect(singleFindingHeading(SINGLE_FINDING_TITLE)).toBe("TEKİL BULGU");
  });
});

describe("queuedSubmissionLabel — the offline queue's name (R74)", () => {
  it("names an in-audit single finding by its audit", () => {
    const label = queuedSubmissionLabel({
      source: "single_finding",
      formTitle: "Bölge 3 · 10.11.2026",
      department: "Bölge 3",
      date: "2026-11-10",
    });
    expect(label).toBe("Bölge 3 · 10.11.2026 — Bölge 3 · 2026-11-10");
  });

  it("keeps 'Tekil bulgu' for a standalone one, and 'Denetim' for an audit", () => {
    expect(
      queuedSubmissionLabel({ source: "single_finding", formTitle: "Tekil Bulgu", department: "Bölge 3", date: "2026-11-10" }),
    ).toBe("Tekil bulgu — Bölge 3 · 2026-11-10");
    expect(queuedSubmissionLabel({ source: "single_finding", department: "Bölge 3", date: "2026-11-10" })).toBe(
      "Tekil bulgu — Bölge 3 · 2026-11-10",
    );
    expect(queuedSubmissionLabel({ department: "Bölge 3", date: "2026-11-10" })).toBe("Denetim — Bölge 3 · 2026-11-10");
    expect(queuedSubmissionLabel({})).toBe("Denetim — - · -");
  });
});

describe("findingNoOf — the number the server gave", () => {
  it("reads it from the shapes the API layer returns", () => {
    expect(findingNoOf({ finding_no: 12 })).toBe(12);
    expect(findingNoOf({ data: { finding_no: 13 } })).toBe(13);
    expect(findingNoOf({ data: { data: { finding_no: "14" } } })).toBe(14);
    expect(findingNoOf({ data: [{ findingNo: 15 }] })).toBe(15);
  });

  it("is null when the answer carries none", () => {
    expect(findingNoOf(null)).toBeNull();
    expect(findingNoOf({})).toBeNull();
    expect(findingNoOf({ data: { finding_no: "" } })).toBeNull();
    expect(findingNoOf({ data: { finding_no: 0 } })).toBeNull();
  });
});

describe("openFindingsFor — findings added in this audit count (R2/R17)", () => {
  const none = { findings: [], queuedQuestionIds: [], session: [] };

  it("a single finding saved a moment ago is the question's open finding even when the read does not list it", () => {
    const map = openFindingsFor("Bölge 3", {
      ...none,
      session: [{ questionId: "S1-1", location: "Bölge 3", findingNo: 21 }],
    });
    expect(map.get("S1-1")).toEqual(["#21"]);
  });

  it("so choosing Orta or Kötü on that question asks for no new finding details", () => {
    const open = openFindingsFor("Bölge 3", {
      ...none,
      session: [{ questionId: "S1-1", location: "Bölge 3", findingNo: 21 }],
    });
    const notGood: Rating[] = ["medium", "bad"];
    for (const rating of notGood) {
      expect(requiresNewFinding(rating, { hasOpenFinding: open.has("S1-1") })).toBe(false);
    }
    // another question is still asked for its own finding
    expect(requiresNewFinding("bad", { hasOpenFinding: open.has("S1-2") })).toBe(true);
    // and İyi stays a rating the close-time confirmation looks at
    expect(open.has("S1-1")).toBe(true);
  });

  it("is not listed twice once the server read has it", () => {
    const map = openFindingsFor("Bölge 3", {
      findings: [{ question_id: "S1-1", status: "open", finding_no: 21 }],
      queuedQuestionIds: [],
      session: [{ questionId: "S1-1", location: "Bölge 3", findingNo: 21 }],
    });
    expect(map.get("S1-1")).toEqual(["#21"]);
  });

  it("an unnumbered saved finding yields to any open finding the read already lists for the question", () => {
    const read = openFindingsFor("Bölge 3", {
      findings: [{ question_id: "S1-1", status: "open", finding_no: 21 }],
      queuedQuestionIds: [],
      session: [{ questionId: "S1-1", location: "Bölge 3", findingNo: null }],
    });
    expect(read.get("S1-1")).toEqual(["#21"]);

    const unread = openFindingsFor("Bölge 3", {
      ...none,
      session: [{ questionId: "S1-1", location: "Bölge 3", findingNo: null }],
    });
    // Neutral wording: a standalone finding seen later from an audit is not "in this audit".
    expect(unread.get("S1-1")).toEqual(["yeni eklendi"]);
  });

  it("adds to what is already open and queued for the question", () => {
    const map = openFindingsFor("Bölge 3", {
      findings: [{ question_id: "S1-1", status: "open", finding_no: 7 }],
      queuedQuestionIds: ["S1-1"],
      session: [{ questionId: "S1-1", location: "Bölge 3", findingNo: 21 }],
    });
    expect(map.get("S1-1")).toEqual(["#7", "kuyrukta", "#21"]);
  });

  it("a finding saved for another location does not count here, whatever the letter case", () => {
    const session = [{ questionId: "S1-1", location: "İDARİ BİNA", findingNo: 5 }];
    expect(openFindingsFor("Bölge 3", { ...none, session }).has("S1-1")).toBe(false);
    expect(openFindingsFor("idari bina", { ...none, session }).get("S1-1")).toEqual(["#5"]);
  });

  it("still leaves a closed finding out", () => {
    const map = openFindingsFor("Bölge 3", {
      findings: [{ question_id: "S1-1", status: "closed", finding_no: 3 }],
      queuedQuestionIds: [],
      session: [],
    });
    expect(map.has("S1-1")).toBe(false);
  });
});

describe("explanationMissing — Orta/Kötü on a question just given a finding blocks nothing (R2/R17)", () => {
  const needsText = { requireExplanation: true };
  const noText = { requireExplanation: false };

  it("still asks for the explanation where no finding was added to the question in this audit", () => {
    expect(explanationMissing(needsText, { rating: "bad", explanation: "  " }, false)).toBe(true);
    expect(explanationMissing(needsText, { rating: "medium", explanation: "Zemin yağlı" }, false)).toBe(false);
  });

  it("does not ask once a single finding was added to the question in this audit", () => {
    expect(explanationMissing(needsText, { rating: "bad", explanation: "" }, true)).toBe(false);
    expect(explanationMissing(needsText, { rating: "medium", explanation: "" }, true)).toBe(false);
  });

  it("never asks for İyi, an unanswered question or a question that needs no text", () => {
    expect(explanationMissing(needsText, { rating: "good", explanation: "" }, false)).toBe(false);
    expect(explanationMissing(needsText, { rating: null, explanation: "" }, false)).toBe(false);
    expect(explanationMissing(noText, { rating: "bad", explanation: "" }, false)).toBe(false);
  });
});
