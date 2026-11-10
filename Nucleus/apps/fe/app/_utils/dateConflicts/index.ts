/**
 * Same-day clash warnings for an audit plan (R28).
 *
 * "Aynı denetçi farklı denetimlere atanıyor, aynı tarihte atandıysa uyarı
 * vermeli." The check used to live twice: once in the home page, once inside
 * the planning panel, and the panel's copy only ran when date, team AND
 * location were all filled in. It is one pure function now, so both screens
 * answer the same question the same way.
 *
 * A warning never blocks anything. It names who is already busy and where, and
 * the person decides.
 */

/** A plan someone is already assigned to, in the shape this check needs. */
export type ConflictPlan = {
  id: string
  plannedDate: string | null | undefined
  locationId: string | null | undefined
  teamId: string | null | undefined
  status: string
}

export type ConflictTeam = {
  id: string
  name?: string | null
  leaderUserId?: string | null
}

export type ConflictLocation = {
  id: string
  name: string
  fieldManagerUserIds: readonly string[]
}

/** One person on one team. A member marked inactive does not count. */
export type ConflictMember = {
  teamId: string
  userId: string
  isActive?: boolean
}

/** Everything the check reads. */
export type ConflictWorld = {
  plans: readonly ConflictPlan[]
  teams: readonly ConflictTeam[]
  locations: readonly ConflictLocation[]
  members: readonly ConflictMember[]
  userNames: ReadonlyMap<string, string>
}

/** The plan being created, or the plan whose team or date is being changed. */
export type ConflictCandidate = {
  /** The plan being changed: it never clashes with itself. */
  planId?: string
  date: string | null | undefined
  teamId: string | null | undefined
  /** Without a location the field manager check is skipped; the rest still run. */
  locationId?: string | null
}

const UNKNOWN_PERSON = 'bilinmeyen kullanıcı'
const UNKNOWN_PLACE = 'bilinmeyen lokasyon'

/**
 * A calendar day as `YYYY-MM-DD`, or '' when the value is no date.
 *
 * A plain day is returned as it is. Anything else (a timestamp) is read in the
 * browser's own zone, which is how the plant's people see it.
 */
export function toDayKey(value: string | null | undefined): string {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const year = String(parsed.getFullYear()).padStart(4, '0')
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const idText = (value: string | null | undefined): string => (value ? String(value) : '')

/**
 * What is wrong on that day, as sentences: who is already assigned, and where.
 *
 *  1. the same team is on another audit;
 *  2. this team's leader leads a different team that is on another audit;
 *  3. one of this team's auditors (leader or active member) is on a different
 *     team's audit;
 *  4. this location's field manager is at another location's audit.
 *
 * Needs a day and a team; nothing else is required. Empty when nothing clashes.
 */
export function findDateConflicts(world: ConflictWorld, candidate: ConflictCandidate): string[] {
  const date = toDayKey(candidate.date)
  const teamId = idText(candidate.teamId)
  if (!date || !teamId) return []

  const same = world.plans.filter(
    (plan) => plan.id !== candidate.planId && plan.status !== 'cancelled' && toDayKey(plan.plannedDate) === date
  )
  if (same.length === 0) return []

  const teamById = new Map(world.teams.map((team) => [team.id, team]))
  const locationById = new Map(world.locations.map((location) => [location.id, location]))
  const placeOf = (plan: ConflictPlan) => locationById.get(idText(plan.locationId))?.name || UNKNOWN_PLACE
  const personOf = (userId: string) => world.userNames.get(userId) || UNKNOWN_PERSON

  /** A team's people: its leader and its active members. */
  const peopleOf = (id: string): Set<string> => {
    const people = new Set<string>()
    const leader = idText(teamById.get(id)?.leaderUserId)
    if (leader) people.add(leader)
    for (const member of world.members) {
      if (member.teamId === id && member.isActive !== false && member.userId) people.add(member.userId)
    }
    return people
  }

  const warnings: string[] = []
  const team = teamById.get(teamId)
  const leaderId = idText(team?.leaderUserId)

  // 1) the same team, on another audit that day
  const sameTeam = same.find((plan) => idText(plan.teamId) === teamId)
  if (sameTeam) {
    const who = team?.name ? `"${team.name}" ekibi` : 'Seçilen ekip'
    warnings.push(`${who} bu tarihte "${placeOf(sameTeam)}" denetiminde görevli.`)
  }

  // 2) this team's leader leads another team that is on an audit that day
  if (leaderId) {
    const sameLeader = same.find((plan) => {
      const otherTeam = idText(plan.teamId)
      return otherTeam !== teamId && idText(teamById.get(otherTeam)?.leaderUserId) === leaderId
    })
    if (sameLeader) {
      const otherName = teamById.get(idText(sameLeader.teamId))?.name || 'başka bir ekip'
      warnings.push(`Ekip lideri (${personOf(leaderId)}) bu tarihte "${placeOf(sameLeader)}" denetiminde (${otherName}) görevli.`)
    }
  }

  // 3) one of this team's auditors is on a different team's audit that day (#26)
  const mine = peopleOf(teamId)
  for (const plan of same) {
    const otherTeam = idText(plan.teamId)
    if (!otherTeam || otherTeam === teamId) continue
    /*
     * The leader is left out only where warning 2 already names them: the
     * other team is LED by the same person. When our leader is merely a member
     * of that other team, warning 2 stays silent, and leaving them out here
     * too hid the clash altogether.
     */
    const leaderNamedAbove = !!leaderId && idText(teamById.get(otherTeam)?.leaderUserId) === leaderId
    const shared = [...peopleOf(otherTeam)].filter((id) => mine.has(id) && !(leaderNamedAbove && id === leaderId))
    if (shared.length > 0) {
      warnings.push(`Denetçi (${shared.map(personOf).join(', ')}) bu tarihte "${placeOf(plan)}" denetiminde de görevli.`)
    }
  }

  // 4) this location's field manager is at another location's audit that day
  const locationId = idText(candidate.locationId)
  const managers = locationById.get(locationId)?.fieldManagerUserIds ?? []
  if (locationId && managers.length > 0) {
    for (const plan of same) {
      if (idText(plan.locationId) === locationId) continue
      const there = locationById.get(idText(plan.locationId))?.fieldManagerUserIds ?? []
      const overlap = managers.filter((id) => there.includes(id))
      if (overlap.length > 0) {
        warnings.push(`Saha sorumlusu (${overlap.map(personOf).join(', ')}) bu tarihte "${placeOf(plan)}" denetiminde görevli.`)
      }
    }
  }

  return [...new Set(warnings)]
}
