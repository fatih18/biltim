/*
 * What the audit page does when it opens, given the plans the person may work on.
 *
 * It used to attach a lone assigned plan by itself and open the audit form, so
 * anyone with an assignment could not reach a plan-less single finding: every
 * way in led straight into the audit (Notlar 22.10, satır 16). An audit is now
 * started only on purpose: the home page names the plan in the address, or the
 * person picks it from the list. Everything else shows the list, where
 * "Tekil Bulgu +" stands next to the plans.
 */
export type PlanEntry =
  | { kind: "start"; planId: string }
  | { kind: "choose"; planIds: string[]; own: boolean }
  | { kind: "none" };

export function decidePlanEntry(input: {
  /** `?planId=` of the address: the person pressed "Denetime Başla" for that plan. */
  requestedPlanId: string | null | undefined;
  /** Plans assigned to the person's own team. */
  ownPlanIds: readonly string[];
  /** Every open plan; only the people who may open any plan can start from it. */
  openablePlanIds: readonly string[];
  canOpenAny: boolean;
}): PlanEntry {
  const requested = (input.requestedPlanId ?? "").trim();
  const startable = input.canOpenAny ? input.openablePlanIds : input.ownPlanIds;
  if (requested && startable.includes(requested)) return { kind: "start", planId: requested };
  if (input.ownPlanIds.length > 0) return { kind: "choose", planIds: [...input.ownPlanIds], own: true };
  if (input.canOpenAny && input.openablePlanIds.length > 0) {
    return { kind: "choose", planIds: [...input.openablePlanIds], own: false };
  }
  return { kind: "none" };
}
