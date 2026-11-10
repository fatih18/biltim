import type { Row } from '../db'
import { canonicalId } from '../guards/businessRules'
import { textOf } from './rows'

/**
 * Who a plan mail goes to.
 *
 * The audience is the plan's team (its leader and active members) and the
 * field manager(s) of its location. Each person counts once, whatever
 * combination of those they are, and each address once. Someone whose account
 * is switched off, who has no usable address or who no longer exists is left
 * out and counted, so the log can say why a mail reached fewer people than the
 * plan names.
 */

export type TeamPerson = { name: string; leader: boolean }

export type Audience = {
  /** Addresses, lower case, in the order the people were met: team leader, members, field managers. */
  recipients: string[]
  /** The active people of the team, for the mail's team line; the leader first. */
  team: TeamPerson[]
  skipped: { missing: number; inactive: number; noAddress: number }
}

const ADDRESS_SHAPE = /^[^\s@,;<>()"']+@[^\s@,;<>()"']+\.[^\s@,;<>()"']+$/

/** The address in lower case, or '' when it is not one a mail can go to (blank, spaces, several addresses, a header-breaking character). */
export function mailableAddress(value: string): string {
  const address = value.trim().toLowerCase()
  return address.length <= 254 && ADDRESS_SHAPE.test(address) ? address : ''
}

/** "Ad Soyad", else the part of the address before the @, else a plain word. */
export function personName(user: Row): string {
  const full = `${textOf(user, 'first_name')} ${textOf(user, 'last_name')}`.trim()
  if (full) return full
  const local = textOf(user, 'email').split('@')[0]?.trim()
  return local || 'Kullanıcı'
}

type AudienceInput = {
  leaderId: string
  memberIds: string[]
  fieldManagerIds: string[]
  /** One row per account that exists: `id`, `email`, `is_active`, `first_name`, `last_name`. */
  users: Row[]
}

export function resolveAudience(input: AudienceInput): Audience {
  const byId = new Map<string, Row>()
  for (const user of input.users) byId.set(canonicalId(textOf(user, 'id')), user)

  const audience: Audience = { recipients: [], team: [], skipped: { missing: 0, inactive: 0, noAddress: 0 } }
  const leaderKey = canonicalId(input.leaderId)
  const seenPeople = new Set<string>()
  const teamSeen = new Set<string>()
  const seenAddresses = new Set<string>()

  const visit = (rawId: string, inTeam: boolean): void => {
    const id = canonicalId(rawId)
    if (!id) return
    const user = byId.get(id)
    const first = !seenPeople.has(id)
    seenPeople.add(id)

    if (!user) {
      if (first) audience.skipped.missing += 1
      return
    }
    if (user.is_active === false) {
      if (first) audience.skipped.inactive += 1
      return
    }
    if (inTeam && !teamSeen.has(id)) {
      teamSeen.add(id)
      audience.team.push({ name: personName(user), leader: id === leaderKey })
    }
    if (!first) return

    const address = mailableAddress(textOf(user, 'email'))
    if (!address) {
      audience.skipped.noAddress += 1
      return
    }
    if (seenAddresses.has(address)) return
    seenAddresses.add(address)
    audience.recipients.push(address)
  }

  visit(input.leaderId, true)
  for (const id of input.memberIds) visit(id, true)
  for (const id of input.fieldManagerIds) visit(id, false)
  return audience
}
