import { type PlannedAudit, placeByDay } from './doneDayPlacement'

/** Shared by doneDayPlacement.test.ts and doneDayPlacementSources.test.ts. */

export const plan = (id: string, plannedDate: string, auditId: string | null = null): PlannedAudit => ({
  id,
  planned_date: plannedDate,
  audit_id: auditId,
})

/** `kind:id@day` per entry, so a whole order reads as one array. */
export const shape = (entries: ReturnType<typeof placeByDay<PlannedAudit>>) =>
  entries.map((e) => `${e.kind === 'done' ? 'done' : 'plan'}:${e.plan.id}@${e.day}`)
