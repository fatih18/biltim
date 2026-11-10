import { type RuleContext, enforceBusinessRules } from './businessRules'
import { type FindingQuery, enforceFindingScope } from './findingScope'

/**
 * What the host hands nucleus as its `onRequest`: the findings' location limit
 * first, the 5S business rules after it.
 *
 * The limit goes first so a field manager who reaches for another location's
 * finding is told that, and not what the rules would say about a finding they
 * were never to see. Both need to know who is calling; the limit looks that up
 * only for the findings routes and hands the answer on, so a finding write is
 * identified once, not twice.
 *
 * `query` is the router's own query object, the one the generic route's handler
 * reads, so the limit can be added to a field manager's list request before
 * nucleus builds it (`narrowFindingQuery`). findingScopeList.test.ts runs this
 * through nucleus's own router (NucleusTestApp) to hold that contract: a
 * nucleus upgrade that stops handing the guard the live query object fails it.
 */
export type RequestContext = RuleContext & { query: FindingQuery }

export async function enforceRequestRules(ctx: RequestContext): Promise<Response | undefined> {
  const scope = await enforceFindingScope(ctx)
  if (scope.refusal) return scope.refusal
  return enforceBusinessRules({ ...ctx, caller: ctx.caller !== undefined ? ctx.caller : scope.caller })
}
