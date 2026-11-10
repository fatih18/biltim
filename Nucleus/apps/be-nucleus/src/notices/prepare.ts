import type { Sql } from '../db'
import { canonicalId, toDateKey } from '../guards/businessRules'
import { countAuditFindings } from '../mail/auditFindings'
import { readPlanMail, readTeamMemberIds, readUsers } from '../mail/queries'
import { resolveAudience } from '../mail/recipients'
import { numberOf, textItemsOf, textOf } from '../mail/rows'
import { buildCompletion, buildInvitation } from '../mail/texts'
import { noticeRecipientIds } from './audience'
import { bellNotice } from './texts'
import type { NoticeKind, PreparedNotice } from './types'

/**
 * Reads the plan and writes what its bell notice says, with the mail's own
 * builders and the mail's own reads. The created notice goes to the plan's team
 * (leader and active members) and the field manager(s) of its location; the
 * completed notice to the field manager(s) alone. `null` when the plan is gone.
 * With nobody to tell, the notice is not even written (`recipients` is empty).
 */
export async function prepareNotice(sql: Sql, kind: NoticeKind, planId: string): Promise<PreparedNotice | null> {
  const plan = await readPlanMail(sql, planId)
  if (!plan) return null

  const created = kind === 'created'
  const teamId = textOf(plan, 'team_id')
  const leaderId = created ? textOf(plan, 'leader_user_id') : ''
  const memberIds = created && teamId ? await readTeamMemberIds(sql, teamId) : []
  const fieldManagerIds = textItemsOf(plan, 'field_manager_user_ids')

  const wanted = [...new Set([leaderId, ...memberIds, ...fieldManagerIds].map((id) => canonicalId(id)).filter(Boolean))]
  const users = await readUsers(sql, wanted)
  const recipients = noticeRecipientIds({ leaderId, memberIds, fieldManagerIds, users })
  if (recipients.length === 0) return { recipients, title: '', body: '' }

  const location = textOf(plan, 'location_name')
  if (created) {
    const { team } = resolveAudience({ leaderId, memberIds, fieldManagerIds, users })
    const content = buildInvitation({
      title: textOf(plan, 'title'),
      period: textOf(plan, 'period_name'),
      location,
      day: toDateKey(plan.planned_date),
      team,
      appUrl: null,
    })
    return { recipients, ...bellNotice(content) }
  }

  const auditId = textOf(plan, 'audit_row_id')
  const content = buildCompletion({
    location,
    day: toDateKey(plan.audit_date) || toDateKey(plan.planned_date),
    score: numberOf(plan, 'total_score'),
    target: numberOf(plan, 'target_score'),
    findings: auditId ? await countAuditFindings(sql, auditId) : null,
    appUrl: null,
  })
  return { recipients, ...bellNotice(content) }
}
