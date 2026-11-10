import type { TeamInfo, LocInfo, AuditPlanRow } from "../page";
import type { DoneEntry } from "../_utils/doneDayPlacement";
import { MobileCellLabel } from "./MobileCellLabel";
import { PlanRowCells, type ParentRange } from "./PlanRowCells";
import { StatusPill } from "./StatusPill";

/**
 * An audit listed a second time, under the day it was done (R43).
 *
 * The audit was planned for another day and its plan row, under that day, says
 * "Yapıldı: ...". This is the same audit, so it is read-only (every action stays
 * on the plan row) and it says so twice: the planned day sits under the date,
 * and the status cell names it "Aynı denetim". It is drawn in the plan row's
 * grid so its cells line up with the rows around it at every width, and a
 * tinted background with a left rule sets it apart from a plan.
 */
export function DoneDayRow(props: {
    entry: DoneEntry<AuditPlanRow>;
    locInfoById: Map<string, LocInfo>;
    parentPlanRangeById: Map<string, ParentRange>;
    teamInfoById: Map<string, TeamInfo>;
}) {
    const { entry, locInfoById, parentPlanRangeById, teamInfoById } = props;
    const plan = entry.plan;
    const parentRange = plan.parent_plan_id ? parentPlanRangeById.get(plan.parent_plan_id) : undefined;

    return (
        <div className="grid grid-cols-2 items-start gap-x-3 gap-y-2 border-t border-l-2 border-slate-300 border-l-sky-500 bg-sky-50/60 px-3 py-2 sm:grid-cols-3 md:grid-cols-12 md:gap-2 dark:border-slate-800/80 dark:border-l-sky-400 dark:bg-sky-950/20">
            <div className="col-span-1 md:col-span-2">
                <MobileCellLabel>Tarih</MobileCellLabel>
                <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-slate-800 dark:text-slate-200">Yapıldı: {entry.day}</span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">Plan: {entry.plannedDay}</span>
                </div>
            </div>

            <PlanRowCells
                parentRange={parentRange}
                locInfo={locInfoById.get(plan.location_id)}
                teamId={plan.assigned_team_id}
                teamInfoById={teamInfoById}
            />

            <div className="col-span-1 flex flex-col items-start gap-1 text-left md:col-span-2 md:items-center md:text-center">
                <MobileCellLabel>Durum</MobileCellLabel>
                <StatusPill status={plan.status} />
                <span className="text-[11px] text-slate-600 dark:text-slate-400">Aynı denetim</span>
            </div>
        </div>
    );
}
