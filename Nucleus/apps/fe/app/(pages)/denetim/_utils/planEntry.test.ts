import { describe, expect, it } from "bun:test";
import { decidePlanEntry } from "./planEntry";

const base = { requestedPlanId: null, ownPlanIds: [], openablePlanIds: [], canOpenAny: false };

describe("decidePlanEntry — an audit starts only on purpose (R16)", () => {
  it("a lone assigned plan is offered, not started: the person can still file a standalone single finding", () => {
    const entry = decidePlanEntry({ ...base, ownPlanIds: ["p1"], openablePlanIds: ["p1"] });
    expect(entry).toEqual({ kind: "choose", planIds: ["p1"], own: true });
  });

  it("several assigned plans are offered", () => {
    const entry = decidePlanEntry({ ...base, ownPlanIds: ["p1", "p2"], openablePlanIds: ["p1", "p2", "p3"] });
    expect(entry).toEqual({ kind: "choose", planIds: ["p1", "p2"], own: true });
  });

  it("pressing Denetime Başla for an assigned plan starts exactly that plan", () => {
    const entry = decidePlanEntry({
      ...base,
      requestedPlanId: "p2",
      ownPlanIds: ["p1", "p2"],
      openablePlanIds: ["p1", "p2"],
    });
    expect(entry).toEqual({ kind: "start", planId: "p2" });
  });

  it("a plan named in the address that the person may not open starts nothing", () => {
    const entry = decidePlanEntry({
      ...base,
      requestedPlanId: "p9",
      ownPlanIds: ["p1"],
      openablePlanIds: ["p1", "p9"],
    });
    expect(entry).toEqual({ kind: "choose", planIds: ["p1"], own: true });
  });

  it("whoever may open any plan can start one outside their own team from the home page", () => {
    const entry = decidePlanEntry({
      ...base,
      canOpenAny: true,
      requestedPlanId: "p9",
      ownPlanIds: ["p1"],
      openablePlanIds: ["p1", "p9"],
    });
    expect(entry).toEqual({ kind: "start", planId: "p9" });
  });

  it("with no plan of their own, a person who may open any plan is offered every open plan", () => {
    const entry = decidePlanEntry({ ...base, canOpenAny: true, openablePlanIds: ["p1", "p2"] });
    expect(entry).toEqual({ kind: "choose", planIds: ["p1", "p2"], own: false });
  });

  it("nobody with nothing assigned and no right to open others has an audit to start", () => {
    expect(decidePlanEntry({ ...base, openablePlanIds: ["p1"] })).toEqual({ kind: "none" });
    expect(decidePlanEntry({ ...base, canOpenAny: true })).toEqual({ kind: "none" });
  });

  it("an address without a plan, or with a blank one, starts nothing", () => {
    expect(decidePlanEntry({ ...base, requestedPlanId: "  ", ownPlanIds: ["p1"], openablePlanIds: ["p1"] }).kind).toBe(
      "choose",
    );
  });
});
