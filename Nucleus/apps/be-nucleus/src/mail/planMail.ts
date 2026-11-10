import type { Sql } from '../db'
import { canonicalId, toDateKey } from '../guards/businessRules'
import { countAuditFindings, readPlanMail, readTeamMemberIds, readUsers } from './queries'
import { type Audience, resolveAudience } from './recipients'
import { numberOf, textItemsOf, textOf } from './rows'
import { buildCompletion, buildInvitation } from './texts'
import type { MailContent, MailKind } from './types'

/** One plan's mail, ready to send: who gets it, what it says, and who was left out. */
export type PlanMail = {
  recipients: string[]
  content: MailContent
  skipped: Audience['skipped']
}

/**
 * Reads the plan and writes its mail.
 *
 * The invitation goes to the plan's team (leader and active members) and the
 * field manager(s) of its location; the completion goes to the field
 * manager(s) alone. `null` when the plan is gone.
 */
export async function preparePlanMail(
  sql: Sql,
  kind: MailKind,
  planId: string,
  appUrl: string | null
): Promise<PlanMail | null> {
  const plan = await readPlanMail(sql, planId)
  if (!plan) return null

  const teamId = textOf(plan, 'team_id')
  const leaderId = kind === 'invitation' ? textOf(plan, 'leader_user_id') : ''
  const memberIds = kind === 'invitation' && teamId ? await readTeamMemberIds(sql, teamId) : []
  const fieldManagerIds = textItemsOf(plan, 'field_manager_user_ids')

  const wanted = [...new Set([leaderId, ...memberIds, ...fieldManagerIds].map((id) => canonicalId(id)).filter(Boolean))]
  const users = await readUsers(sql, wanted)
  const audience = resolveAudience({ leaderId, memberIds, fieldManagerIds, users })

  const location = textOf(plan, 'location_name')
  if (kind === 'invitation') {
    const content = buildInvitation({
      title: textOf(plan, 'title'),
      period: textOf(plan, 'period_name'),
      location,
      day: toDateKey(plan.planned_date),
      team: audience.team,
      appUrl,
    })
    return { recipients: audience.recipients, content, skipped: audience.skipped }
  }

  const auditId = textOf(plan, 'audit_row_id')
  const content = buildCompletion({
    location,
    day: toDateKey(plan.audit_date) || toDateKey(plan.planned_date),
    score: numberOf(plan, 'total_score'),
    target: numberOf(plan, 'target_score'),
    findings: auditId ? await countAuditFindings(sql, auditId) : null,
    appUrl,
  })
  return { recipients: audience.recipients, content, skipped: audience.skipped }
}
