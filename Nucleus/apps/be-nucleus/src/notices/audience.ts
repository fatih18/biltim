import type { Row } from '../db'
import { canonicalId } from '../guards/businessRules'
import { textOf } from '../mail/rows'

/**
 * Who is told in the bell: the same people the plan mail names (team leader,
 * active team members, the location's field managers, in that order), but as
 * ACCOUNTS, not addresses. A person without a mail address still has a bell, so
 * the only ones left out are accounts that no longer exist and accounts that are
 * switched off. Each person counts once, whatever combination of roles they hold.
 */

export type NoticeAudienceInput = {
  leaderId: string
  memberIds: string[]
  fieldManagerIds: string[]
  /** One row per account that exists: `id` and `is_active` (`readUsers`). */
  users: Row[]
}

/** The user ids to write a notification for: canonical, each once, in the order the people were met. */
export function noticeRecipientIds(input: NoticeAudienceInput): string[] {
  const byId = new Map<string, Row>()
  for (const user of input.users) byId.set(canonicalId(textOf(user, 'id')), user)

  const ids: string[] = []
  const seen = new Set<string>()
  for (const raw of [input.leaderId, ...input.memberIds, ...input.fieldManagerIds]) {
    const id = canonicalId(raw)
    if (!id || seen.has(id)) continue
    seen.add(id)
    const user = byId.get(id)
    if (!user || user.is_active === false) continue
    ids.push(id)
  }
  return ids
}
