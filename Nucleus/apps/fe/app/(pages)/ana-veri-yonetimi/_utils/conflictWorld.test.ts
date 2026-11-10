import { describe, expect, it } from "bun:test";
import { findDateConflicts } from "@/app/_utils/dateConflicts";
import type { Audit, LocationEntity, User } from "../components/types";
import { plannerConflictWorld } from "./conflictWorld";

const audit = (id: string, over: Partial<Audit> = {}): Audit => ({
  id,
  createdAt: "2026-11-01T00:00:00.000Z",
  status: "planned",
  plannedDate: "2026-11-10",
  locationId: "loc-a",
  assignedTeamId: "team-1",
  ...over,
});

const location = (id: string, name: string, fieldManagerUserIds: string[] = []): LocationEntity => ({
  id,
  name,
  isActive: true,
  createdAt: "2026-11-01T00:00:00.000Z",
  fieldManagerUserIds,
});

const users: User[] = [
  { id: "u-ayse", name: "Ayşe Denetçi" },
  { id: "u-lider", name: "Leyla Lider" },
];

const base = {
  teams: [
    { id: "team-1", name: "Mavi Ekip", leaderUserId: "u-lider" },
    { id: "team-2", name: "Kırmızı Ekip", leaderUserId: "u-lider" },
  ],
  locations: [location("loc-a", "Haddehane"), location("loc-b", "Çelikhane")],
  users,
  teamMembers: [
    { teamId: "team-1", userId: "u-ayse" },
    { teamId: "team-2", userId: "u-ayse" },
  ],
};

describe("plannerConflictWorld", () => {
  it("leaves period plans out: they have a range, not a day", () => {
    const period = audit("pp1", { plannedDate: "", locationId: "", assignedTeamId: "", dateRangeStart: "2026-10-01" });
    const world = plannerConflictWorld({ ...base, audits: [period, audit("p1")] });
    expect(world.plans.map((p) => p.id)).toEqual(["p1"]);
  });

  it("feeds the clash check: a team and a day are enough to see the shared auditor", () => {
    const world = plannerConflictWorld({
      ...base,
      audits: [audit("p1", { assignedTeamId: "team-2", locationId: "loc-b" })],
    });
    const warnings = findDateConflicts(world, { date: "2026-11-10", teamId: "team-1" });
    expect(warnings.some((w) => w.includes("Ayşe Denetçi") && w.includes('"Çelikhane"'))).toBe(true);
  });

  it("answers a changed date of an existing plan without clashing it with itself", () => {
    const world = plannerConflictWorld({
      ...base,
      audits: [audit("p1"), audit("p2", { assignedTeamId: "team-2", locationId: "loc-b", plannedDate: "2026-11-12" })],
    });
    expect(findDateConflicts(world, { planId: "p1", date: "2026-11-12", teamId: "team-1", locationId: "loc-a" })).not.toEqual([]);
    expect(findDateConflicts(world, { planId: "p1", date: "2026-11-10", teamId: "team-1", locationId: "loc-a" })).toEqual([]);
  });
});
