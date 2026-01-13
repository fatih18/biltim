"use client";

import React from "react";
import type { MasterEntity } from "../../ana-veri-yonetimi/components";
import type { TeamInfo, AuditPlanRow } from "../page";
import { TeamLeaderWithMembersTooltip } from "./TeamLeaderWithMembersTooltip";

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
    locations: MasterEntity[];
    teams: AuditTeamLite[];
    teamInfoById: Map<string, TeamInfo>;
    loading: boolean;
    onRefresh?: () => void;
    onOpenPlan?: (id: string) => void;

    // ✅ new
    canEditPlan: (plan: AuditPlanRow) => boolean;
    onUpdatePlanDate: (planId: string, dateYYYYMMDD: string) => void;
}) {
    const {
        plans,
        locations,
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

    const locNameById = React.useMemo(() => {
        const m = new Map<string, string>();
        for (const l of locations) m.set(l.id, l.name);
        return m;
    }, [locations]);

    const upcoming = React.useMemo(() => plans.filter((p) => p.status !== "completed"), [plans]);
    const completed = React.useMemo(() => plans.filter((p) => p.status === "completed"), [plans]);

    const list = tab === "upcoming" ? upcoming : completed;

    const startEdit = (p: AuditPlanRow) => {
        setEditingId(p.id);
        setEditDate(normalizeDateYYYYMMDD(p.planned_date));
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditDate("");
    };

    const saveEdit = () => {
        if (!editingId) return;
        if (!editDate) return;
        onUpdatePlanDate(editingId, editDate);
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
                        <div className="col-span-4">Lokasyon</div>
                        <div className="col-span-3">Ekip / Lider</div>
                        <div className="col-span-1 text-center">Durum</div>
                        <div className="col-span-2 text-right">İşlem</div>
                    </div>

                    {loading ? (
                        <div className="px-3 py-6 text-sm text-slate-400">Yükleniyor...</div>
                    ) : list.length === 0 ? (
                        <div className="px-3 py-6 text-sm text-slate-400">Kayıt bulunamadı.</div>
                    ) : (
                        list.map((p) => {
                            const loc = locNameById.get(p.location_id) ?? "-";
                            const editable = canEditPlan(p);
                            const isEditing = editingId === p.id;

                            return (
                                <div key={p.id} className="grid grid-cols-12 items-center gap-2 border-t border-slate-800/80 px-3 py-2">
                                    {/* Tarih */}
                                    <div className="col-span-2 text-sm text-slate-200">
                                        {isEditing ? (
                                            <input
                                                type="date"
                                                value={editDate}
                                                onChange={(e) => setEditDate(e.target.value)}
                                                className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-100 outline-none focus:border-slate-400"
                                            />
                                        ) : (
                                            <span>{normalizeDateYYYYMMDD(p.planned_date) || "-"}</span>
                                        )}
                                    </div>

                                    <div className="col-span-4 text-sm text-slate-100">{loc}</div>

                                    <div className="col-span-3">
                                        <TeamLeaderWithMembersTooltip teamId={p.assigned_team_id} teamInfoById={teamInfoById} />
                                    </div>

                                    <div className="col-span-1 text-center">
                                        <StatusPill status={p.status} />
                                    </div>

                                    <div className="col-span-2 flex justify-end gap-2">

                                        {editable ? (
                                            isEditing ? (
                                                <>
                                                    <button
                                                        className="rounded-md border border-emerald-800/60 bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-950/50 disabled:opacity-50"
                                                        onClick={saveEdit}
                                                        disabled={!editDate}
                                                    >
                                                        Kaydet
                                                    </button>
                                                    <button
                                                        className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs hover:bg-slate-950"
                                                        onClick={cancelEdit}
                                                    >
                                                        İptal
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs hover:bg-slate-950"
                                                    onClick={() => startEdit(p)}
                                                >
                                                    Düzenle
                                                </button>
                                            )
                                        ) : null}
                                    </div>

                                    {p.audit_id ? (
                                        <div className="col-span-12 pt-1 text-[11px] text-slate-500">
                                            <Badge>audit_id</Badge> <span className="text-slate-400">{p.audit_id}</span>
                                        </div>
                                    ) : null}
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
