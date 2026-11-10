import type { ConflictMember, ConflictWorld } from "@/app/_utils/dateConflicts";
import type { Audit, LocationEntity, User } from "../components/types";

type PlannerTeam = { id: string; name?: string | null; leaderUserId?: string | null };

/**
 * What the planning screen holds, in the shape the same-day clash check reads.
 *
 * Only audit plans are passed on: a period plan has a date range, no day, no
 * team and no location, so it can never clash with anything.
 */
export function plannerConflictWorld(input: {
  audits: readonly Audit[];
  teams: readonly PlannerTeam[];
  locations: readonly LocationEntity[];
  users: readonly User[];
  teamMembers: readonly ConflictMember[];
}): ConflictWorld {
  return {
    plans: input.audits
      .filter((audit) => !!audit.locationId || !!audit.assignedTeamId)
      .map((audit) => ({
        id: audit.id,
        plannedDate: audit.plannedDate,
        locationId: audit.locationId,
        teamId: audit.assignedTeamId,
        status: audit.status,
      })),
    teams: input.teams,
    locations: input.locations.map((location) => ({
      id: location.id,
      name: location.name,
      fieldManagerUserIds: location.fieldManagerUserIds ?? [],
    })),
    members: input.teamMembers,
    userNames: new Map(input.users.map((user) => [user.id, user.name])),
  };
}
