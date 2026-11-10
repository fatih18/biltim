import { describe, expect, it } from "bun:test";
import { bodyOf, pageCode } from "./pageSource";

/*
 * Wiring guard for "Denetimi Yapan" (customer note "özge ekipte görünmemeli").
 *
 * planAuditors.test.ts proves the rule. This file proves the page uses it: both
 * draft restores settle the remembered names against the team as it is now, the
 * plan is opened with the team plus the signed-in person, the autosave stores
 * the ids next to the names, and a correction keeps the recorded names. The page
 * is a ~5000-line client component with no render harness, so the check is on
 * its source (pageSource.ts); a renamed function breaks it by name.
 */

describe("the guards find every function they read", () => {
  for (const name of ["openPlan", "tryRestoreServerDraft", "tryRestoreDraft"]) {
    it(`page.tsx has a ${name} with a body`, () => {
      expect(bodyOf(name).length).toBeGreaterThan(0);
    });
  }
});

describe("the plan is opened with the team as it is now", () => {
  it("offers the team's current members plus the signed-in person, and hands them to the draft restore", () => {
    const body = bodyOf("openPlan");
    expect(body).toContain("buildTeamMemberOptions(plan.assigned_team_id, members, teams, usersById)");
    expect(body).toContain("withSignedInAuditor(");
    expect(body).toContain("setTeamMemberOptions(auditorOptions)");
    expect(body).toContain("tryRestoreDraft(plan.id, nextHeader, auditorOptions)");
  });

  it("the page does not keep a copy of the options builder of its own", () => {
    expect(pageCode).not.toMatch(/const buildTeamMemberOptions\s*=/);
  });
});

describe("a draft never brings back a name of its own", () => {
  it("the server draft settles its names against the allowed people", () => {
    const body = bodyOf("tryRestoreServerDraft");
    expect(body).toContain("settleAuditors(");
    expect(body).toContain("auditorName: settled.auditorName");
    expect(body).not.toMatch(/String\(h\.auditorName/);
  });

  it("the browser draft settles its names the same way and drops the stored ids from the form", () => {
    const body = bodyOf("tryRestoreDraft");
    expect(body).toContain("settleAuditors(");
    expect(body).toContain("auditorName: settled.auditorName");
    expect(body).toContain("auditors: undefined");
    expect(body).toContain("tryRestoreServerDraft(planId, h.auditorName, allowed)");
  });

  it("both say so when a name was left out", () => {
    expect(bodyOf("tryRestoreServerDraft")).toContain("removedAuditorsNotice(settled.removed)");
    expect(bodyOf("tryRestoreDraft")).toContain("removedAuditorsNotice(settled.removed)");
  });
});

describe("the ids live in the draft only", () => {
  it("the autosave writes the ids of the names next to them", () => {
    expect(pageCode).toContain("draftAuditorsOf(header.auditorName,");
    expect(pageCode).toContain("saveDraftDebounced(planId, { ...header, auditors }, answers)");
  });

  it("no save path reads them: an audit carries the typed names only", () => {
    expect(pageCode).not.toMatch(/header\.auditors\b/);
  });
});

describe("a correction keeps the history", () => {
  it("the audit being corrected shows its recorded names, not a filtered copy", () => {
    expect(pageCode).toContain("auditorName: recordedAuditorName(audit.auditor_name)");
    expect(pageCode).toContain("withNamedAuditors(");
  });
});
