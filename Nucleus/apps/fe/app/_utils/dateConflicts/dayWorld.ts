import { BY_ID, readAllPages, readByIds, type ListRow, type PageStarter } from '@/app/_utils/readAllPages'
import { findDateConflicts, toDayKey, type ConflictWorld } from './index'
import { text, toLocation, toMember, toPlan, toTeam, userName } from './dayRows'

/**
 * The world of ONE day, read from the server (R28).
 *
 * A screen that holds a page of plans cannot say who is busy on a day: a plan
 * that fell outside its page is exactly the clash that goes unreported. This
 * reads what the check needs for the chosen day only, every page of it:
 *
 *  - the plans on that day that are not cancelled;
 *  - the teams on them, and the team being planned;
 *  - those teams' active members;
 *  - the locations of those plans (their field managers), and the location
 *    being planned;
 *  - the names of the people who turn up in all of that.
 *
 * A failed read is reported, never turned into "no clash". Only the names are
 * a nicety: without them the warning says "bilinmeyen kullanıcı" and is still
 * shown.
 */

/** The list actions the read needs; `null` where the action is missing. */
export type DayStarters = {
  plans: PageStarter | null
  teams: PageStarter | null
  members: PageStarter | null
  locations: PageStarter | null
  users: PageStarter | null
}

/** The plan being created or re-dated, and the day it is being given. */
export type DayRequest = {
  /** The plan being changed: it never clashes with itself. */
  planId: string
  day: string
  teamId: string
  locationId: string
}

type Around = { teams: ListRow[]; members: ListRow[]; locations: ListRow[] }

/** Teams, members and locations for the given ids, read together; `onError` once. */
function readAround(
  starters: { teams: PageStarter; members: PageStarter; locations: PageStarter },
  ids: { teamIds: string[]; locationIds: string[] },
  onDone: (around: Around) => void,
  onError: (error: object) => void
): void {
  const around: Around = { teams: [], members: [], locations: [] }
  let waiting = 3
  let failed = false

  const arrived = (into: keyof Around) => (rows: ListRow[]) => {
    if (failed) return
    around[into] = rows
    waiting -= 1
    if (waiting === 0) onDone(around)
  }
  const failedWith = (error: object) => {
    if (failed) return
    failed = true
    onError(error)
  }

  readByIds({ start: starters.teams, field: 'id', ids: ids.teamIds, onDone: arrived('teams'), onError: failedWith })
  readByIds({
    start: starters.members,
    field: 'team_id',
    ids: ids.teamIds,
    filters: [{ field: 'is_active', operator: 'eq', value: true }],
    onDone: arrived('members'),
    onError: failedWith,
  })
  readByIds({
    start: starters.locations,
    field: 'id',
    ids: ids.locationIds,
    onDone: arrived('locations'),
    onError: failedWith,
  })
}

/** Reads the day and calls `onDone` with what the same-day check reads, or `onError` once. */
export function loadDayWorld(
  starters: DayStarters,
  request: DayRequest,
  onDone: (world: ConflictWorld) => void,
  onError: (error: object) => void
): void {
  const { plans, teams, members, locations, users } = starters
  if (!plans || !teams || !members || !locations) {
    onError(new Error('A list action the same-day check needs is missing.'))
    return
  }
  const day = toDayKey(request.day)
  if (!day) {
    onError(new Error('The day to read is not a date.'))
    return
  }

  readAllPages({
    start: plans,
    payload: {
      sort: BY_ID,
      filters: [
        { field: 'is_active', operator: 'eq', value: true },
        { field: 'planned_date', operator: 'eq', value: day },
        { field: 'status', operator: 'notIn', value: ['cancelled'] },
      ],
    },
    onError,
    onDone: (planRows) => {
      const dayPlans = planRows.map((row) => toPlan(row, day))
      const ids = {
        teamIds: [request.teamId, ...dayPlans.map((plan) => plan.teamId ?? '')],
        locationIds: [request.locationId, ...dayPlans.map((plan) => plan.locationId ?? '')],
      }

      readAround({ teams, members, locations }, ids, (around) => {
        const finish = (people: ListRow[]) => {
          const userNames = new Map<string, string>()
          for (const row of people) {
            const name = userName(row)
            if (text(row.id) && name) userNames.set(text(row.id), name)
          }
          onDone({
            plans: dayPlans,
            teams: around.teams.map(toTeam),
            locations: around.locations.map(toLocation),
            members: around.members.map(toMember),
            userNames,
          })
        }

        if (!users) {
          finish([])
          return
        }
        const peopleIds = [
          ...around.teams.map((row) => toTeam(row).leaderUserId ?? ''),
          ...around.members.map((row) => toMember(row).userId),
          ...around.locations.flatMap((row) => toLocation(row).fieldManagerUserIds),
        ]
        // Names only: a failed read leaves the warning with an unknown person, not without a warning.
        readByIds({ start: users, field: 'id', ids: peopleIds, onDone: finish, onError: () => finish([]) })
      }, onError)
    },
  })
}

/**
 * What is wrong if this plan takes this day, as sentences: the day is read from
 * the server and handed to the shared check. Empty when nothing clashes, and
 * when there is no team or no day to check.
 */
export function loadDayConflicts(
  starters: DayStarters,
  request: DayRequest,
  onDone: (warnings: string[]) => void,
  onError: (error: object) => void
): void {
  if (!toDayKey(request.day) || !request.teamId) {
    onDone([])
    return
  }
  loadDayWorld(
    starters,
    request,
    (world) =>
      onDone(
        findDateConflicts(world, {
          planId: request.planId,
          date: request.day,
          teamId: request.teamId,
          locationId: request.locationId,
        })
      ),
    onError
  )
}
