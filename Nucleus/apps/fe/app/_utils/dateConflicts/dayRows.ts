import type { JsonValue, ListRow } from '@/app/_utils/readAllPages'
import type { ConflictLocation, ConflictMember, ConflictPlan, ConflictTeam } from './index'

/*
 * Rows of a list read, in the shape the same-day check reads. A row comes back
 * under camelCase keys with snake_case twins added, so either spelling is read.
 */

export const text = (value: JsonValue): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}

/** A column under either of its two spellings, snake_case first. */
const pick = (row: ListRow, snake: string, camel: string): string => text(row[snake] ?? row[camel])

const textList = (value: JsonValue): string[] =>
  Array.isArray(value) ? value.map(text).filter((item) => item !== '') : []

/** A plan matched by the server for `day`, so it carries that day as it was asked for. */
export function toPlan(row: ListRow, day: string): ConflictPlan {
  return {
    id: text(row.id),
    plannedDate: day,
    locationId: pick(row, 'location_id', 'locationId'),
    teamId: pick(row, 'assigned_team_id', 'assignedTeamId'),
    status: text(row.status),
  }
}

export function toTeam(row: ListRow): ConflictTeam {
  return {
    id: text(row.id),
    name: text(row.name) || null,
    leaderUserId: pick(row, 'leader_user_id', 'leaderUserId') || null,
  }
}

export function toMember(row: ListRow): ConflictMember {
  return { teamId: pick(row, 'team_id', 'teamId'), userId: pick(row, 'user_id', 'userId') }
}

export function toLocation(row: ListRow): ConflictLocation {
  return {
    id: text(row.id),
    name: text(row.name),
    fieldManagerUserIds: textList(row.field_manager_user_ids ?? row.fieldManagerUserIds),
  }
}

/** The person's name as the screens show it: first and last name, else name, else e-mail. */
export function userName(row: ListRow): string {
  const profile = row.profile
  let full = ''
  if (profile && typeof profile === 'object' && !Array.isArray(profile)) {
    full = `${pick(profile, 'first_name', 'firstName')} ${pick(profile, 'last_name', 'lastName')}`.trim()
  }
  return full || text(row.name) || text(row.email)
}
