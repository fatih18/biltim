import type { LocInfo, TeamInfo } from "../page";
import { TeamLeaderWithMembersTooltip } from "../components/TeamLeaderWithMembersTooltip";
import { MobileCellLabel } from "./MobileCellLabel";

export type ParentRange = { start: string; end: string; quarter: string | null; title: string | null };

/**
 * The four middle cells of a plan row: Dönem, Lokasyon, Müdür / Saha Sor. and
 * Ekip / Lider. A plan's row and the repeat of its audit under the day it was
 * done (R43) show the same four, so they are drawn in one place. The cells are
 * children of the row's grid and take the same column spans at every width.
 */
export function PlanRowCells(props: {
    parentRange: ParentRange | undefined;
    locInfo: LocInfo | undefined;
    teamId: string;
    teamInfoById: Map<string, TeamInfo>;
}) {
    const { parentRange, locInfo, teamId, teamInfoById } = props;
    const loc = locInfo?.name ?? "-";
    const managerName = locInfo?.managerName ?? null;
    const fieldManagerNames = locInfo?.fieldManagerNames ?? [];

    return (
        <>
            {/* Dönem */}
            <div className="col-span-1 md:col-span-2">
                <MobileCellLabel>Dönem</MobileCellLabel>
                {parentRange ? (
                    <div className="flex flex-col gap-0.5">
                        <span className="inline-block rounded border border-indigo-700/50 bg-indigo-100 dark:bg-indigo-950/40 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300">
                            {parentRange.quarter ?? "—"}
                        </span>
                        {parentRange.title && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{parentRange.title}</span>
                        )}
                    </div>
                ) : (
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">—</span>
                )}
            </div>

            <div className="col-span-1 break-words text-sm text-slate-900 md:col-span-2 dark:text-slate-100">
                <MobileCellLabel>Lokasyon</MobileCellLabel>
                {loc}
            </div>

            <div className="col-span-1 flex flex-col gap-0.5 md:col-span-2">
                <MobileCellLabel>Müdür / Saha Sor.</MobileCellLabel>
                {managerName && (
                    <div className="flex items-center gap-1 text-[11px]">
                        <span className="font-medium text-slate-500 dark:text-slate-400">Müdür:</span>
                        <span className="text-slate-700 dark:text-slate-300">{managerName}</span>
                    </div>
                )}
                {fieldManagerNames.length > 0 && (
                    <div className="flex items-center gap-1 text-[11px]">
                        <span className="font-medium text-slate-500 dark:text-slate-400">Saha:</span>
                        <span className="text-slate-700 dark:text-slate-300">{fieldManagerNames.join(", ")}</span>
                    </div>
                )}
                {!managerName && fieldManagerNames.length === 0 && (
                    <span className="text-xs text-slate-600 dark:text-slate-400">—</span>
                )}
            </div>

            <div className="col-span-1 md:col-span-2">
                <MobileCellLabel>Ekip / Lider</MobileCellLabel>
                <TeamLeaderWithMembersTooltip teamId={teamId} teamInfoById={teamInfoById} />
            </div>
        </>
    );
}
