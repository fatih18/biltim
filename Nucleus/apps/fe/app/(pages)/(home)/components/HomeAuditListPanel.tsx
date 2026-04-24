"use client";

import React from "react";
import type { TeamInfo, AuditPlanRow, LocInfo } from "../page";
import { TeamLeaderWithMembersTooltip } from "./TeamLeaderWithMembersTooltip";
import { DateInput } from "@/app/_components/DateInput";

type AuditTeamLite = { id: string; name?: string | null; isActive: boolean };

function Badge({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-md border border-slate-700 bg-slate-950/50 px-2 py-0.5 text-[11px] text-slate-200">
            {children}
        </span>
    );
}

function StatusPill({ status }: { status: string }) {
    const base = "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium";
    if (status === "planned")
        return <span className={`${base} border-amber-800/60 bg-amber-950/30 text-amber-200`}>planned</span>;
    if (status === "completed")
        return <span className={`${base} border-emerald-800/60 bg-emerald-950/25 text-emerald-200`}>completed</span>;
    if (status === "cancelled")
        return <span className={`${base} border-rose-900/60 bg-rose-950/25 text-rose-200`}>cancelled</span>;
    return <span className={`${base} border-slate-700 bg-slate-950/50 text-slate-200`}>{status}</span>;
}

function SegTabs({
    value,
    onChange,
    items,
}: {
    value: string;
    onChange: (v: string) => void;
    items: { value: string; label: string }[];
}) {
    return (
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950/40 p-1">
            {items.map((it) => {
                const active = it.value === value;
                return (
                    <button
                        key={it.value}
                        onClick={() => onChange(it.value)}
                        className={[
                            "rounded-md px-3 py-1.5 text-xs font-semibold",
                            active ? "bg-slate-200 text-slate-950" : "text-slate-300 hover:bg-slate-950/50",
                        ].join(" ")}
                    >
                        {it.label}
                    </button>
                );
            })}
        </div>
    );
}

function normalizeDateYYYYMMDD(value: string): string {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = String(d.getFullYear()).padStart(4, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export function HomeAuditListPanel(props: {
    plans: AuditPlanRow[];
    locInfoById: Map<string, LocInfo>;
    parentPlanRangeById: Map<string, { start: string; end: string; quarter: string | null; title: string | null }>;
    teams: AuditTeamLite[];
    teamInfoById: Map<string, TeamInfo>;
    loading: boolean;
    onRefresh?: () => void;
    onOpenPlan?: (id: string) => void;
    canEditPlan: (plan: AuditPlanRow) => boolean;
    onUpdatePlanDate: (planId: string, dateYYYYMMDD: string, newCount: number) => void;
}) {
    const {
        plans,
        locInfoById,
        parentPlanRangeById,
        teamInfoById,
        loading,
        onRefresh,
        onOpenPlan,
        canEditPlan,
        onUpdatePlanDate,
    } = props;

    const [tab, setTab] = React.useState<"upcoming" | "completed">("upcoming");

    // edit UI state
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editDate, setEditDate] = React.useState<string>("");

    const upcoming = React.useMemo(() =>
        plans
            .filter((p) => !!p.location_id && p.status !== "completed")
            .sort((a, b) => (a.planned_date ?? "").localeCompare(b.planned_date ?? "")),
        [plans]);
    const completed = React.useMemo(() =>
        plans
            .filter((p) => !!p.location_id && p.status === "completed")
            .sort((a, b) => (b.planned_date ?? "").localeCompare(a.planned_date ?? "")),
        [plans]);

    const list = tab === "upcoming" ? upcoming : completed;

    const startEdit = (p: AuditPlanRow) => {
        setEditingId(p.id);
        setEditDate(normalizeDateYYYYMMDD(p.planned_date));
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditDate("");
    };

    const saveEdit = (plan: AuditPlanRow) => {
        if (!editingId) return;
        if (!editDate) return;
        const newCount = (plan.date_change_count ?? 0) + 1;
        onUpdatePlanDate(editingId, editDate, newCount);
        setEditingId(null);
    };

    return (
        <section className="rounded-xl border border-slate-800 bg-slate-900/40">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
                <div>
                    <div className="text-sm font-semibold text-slate-100">Denetimler</div>
                    <div className="mt-1 text-xs text-slate-400">Planlanan / yaklaşan ve tamamlanan denetimler.</div>
                </div>

                <div className="flex items-center gap-2">
                    <SegTabs
                        value={tab}
                        onChange={(v) => {
                            setTab(v as any);
                            cancelEdit();
                        }}
                        items={[
                            { value: "upcoming", label: `Plan / Yaklaşan (${upcoming.length})` },
                            { value: "completed", label: `Tamamlanan (${completed.length})` },
                        ]}
                    />

                    <button
                        className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs hover:bg-slate-950 disabled:opacity-50"
                        onClick={onRefresh}
                        disabled={!onRefresh || loading}
                    >
                        Yenile
                    </button>
                </div>
            </div>

            <div className="p-4">
                <div className="overflow-hidden rounded-lg border border-slate-800">
                    <div className="grid grid-cols-12 bg-slate-900/60 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        <div className="col-span-2">Tarih</div>
                        <div className="col-span-2">Dönem</div>
                        <div className="col-span-2">Lokasyon</div>
                        <div className="col-span-2">Müdür / Saha Sor.</div>
                        <div className="col-span-2">Ekip / Lider</div>
                        <div className="col-span-2 text-center">Durum</div>
                    </div>

                    {loading ? (
                        <div className="px-3 py-6 text-sm text-slate-400">Yükleniyor...</div>
                    ) : list.length === 0 ? (
                        <div className="px-3 py-6 text-sm text-slate-400">Kayıt bulunamadı.</div>
                    ) : (
                        list.map((p) => {
                            const locInfo = locInfoById.get(p.location_id);
                            const loc = locInfo?.name ?? "-";
                            const managerName = locInfo?.managerName ?? null;
                            const fieldManagerNames = locInfo?.fieldManagerNames ?? [];
                            const editable = canEditPlan(p);
                            const isEditing = editingId === p.id;
                            const parentRange = p.parent_plan_id
                                ? parentPlanRangeById.get(p.parent_plan_id)
                                : undefined;
                            const outOfRange = !!(parentRange && editDate &&
                                (editDate < parentRange.start || editDate > parentRange.end));

                            return (
                                <div key={p.id} className="grid grid-cols-12 items-start gap-2 border-t border-slate-800/80 px-3 py-2">
                                    {/* Tarih */}
                                    <div className="col-span-2">
                                        {isEditing ? (
                                            <div className="flex flex-col gap-1">
                                                <DateInput
                                                    value={editDate}
                                                    onChange={(value) => setEditDate(value)}
                                                    className={[
                                                        "date-dark w-full rounded-md border px-3 py-2 text-xs outline-none ring-sky-500/40 focus:ring-2",
                                                        outOfRange
                                                            ? "border-rose-600 bg-rose-950/20 focus:border-rose-400"
                                                            : "border-slate-700 bg-slate-950/70 focus:border-sky-400",
                                                    ].join(" ")}
                                                />
                                                {parentRange && (
                                                    <p className="text-[10px] text-slate-500">
                                                        Aralık: {parentRange.start} – {parentRange.end}
                                                    </p>
                                                )}
                                                {outOfRange && (
                                                    <p className="text-[10px] text-rose-400">
                                                        ⚠ Seçilen tarih ana plan aralığı dışında
                                                    </p>
                                                )}
                                                <div className="flex gap-1">
                                                    <button
                                                        className="rounded-md border border-emerald-800/60 bg-emerald-950/30 px-3 py-1 text-xs text-emerald-200 hover:bg-emerald-950/50 disabled:opacity-50"
                                                        onClick={() => saveEdit(p)}
                                                        disabled={!editDate || outOfRange}
                                                    >
                                                        Kaydet
                                                    </button>
                                                    <button
                                                        className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-1 text-xs hover:bg-slate-950"
                                                        onClick={cancelEdit}
                                                    >
                                                        İptal
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm text-slate-200">{normalizeDateYYYYMMDD(p.planned_date) || "-"}</span>
                                                {editable ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(p)}
                                                        className="text-left text-[10px] text-sky-400 hover:underline"
                                                    >
                                                        Düzenle ({2 - (p.date_change_count ?? 0)} hak)
                                                    </button>
                                                ) : (p.date_change_count ?? 0) >= 2 && canEditPlan({ ...p, date_change_count: 0 }) ? (
                                                    <span className="text-[10px] text-slate-500">Tarih kilitli</span>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>

                                    {/* Dönem */}
                                    <div className="col-span-2">
                                        {parentRange ? (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="inline-block rounded border border-indigo-700/50 bg-indigo-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                                                    {parentRange.quarter ?? "—"}
                                                </span>
                                                {parentRange.title && (
                                                    <span className="text-[10px] text-slate-500 truncate">{parentRange.title}</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-[11px] text-slate-600">—</span>
                                        )}
                                    </div>

                                    <div className="col-span-2 text-sm text-slate-100">{loc}</div>

                                    <div className="col-span-2 flex flex-col gap-0.5">
                                        {managerName && (
                                            <div className="flex items-center gap-1 text-[10px]">
                                                <span className="font-medium text-slate-500">Müdür:</span>
                                                <span className="text-slate-300">{managerName}</span>
                                            </div>
                                        )}
                                        {fieldManagerNames.length > 0 && (
                                            <div className="flex items-center gap-1 text-[10px]">
                                                <span className="font-medium text-slate-500">Saha:</span>
                                                <span className="text-slate-300">{fieldManagerNames.join(", ")}</span>
                                            </div>
                                        )}
                                        {!managerName && fieldManagerNames.length === 0 && (
                                            <span className="text-xs text-slate-600">—</span>
                                        )}
                                    </div>

                                    <div className="col-span-2">
                                        <TeamLeaderWithMembersTooltip teamId={p.assigned_team_id} teamInfoById={teamInfoById} />
                                    </div>

                                    <div className="col-span-2 text-center">
                                        <StatusPill status={p.status} />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* küçük not */}
                <div className="mt-3 text-[11px] text-slate-500">
                    Not: “Düzenle” butonu sadece ilgili ekibin liderinde görünür.
                </div>
            </div>
        </section>
    );
}
