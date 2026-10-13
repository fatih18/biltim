"use client";

import React from "react";
import type { Audit, AuditStatus, LocationEntity, User } from "./types";
import { normalizeName } from "./utils";
import { Badge, DangerButton, Input, PrimaryButton, Select } from "./ui";
import { ChevronRight } from "lucide-react";
import { DateInput } from "@/app/_components/DateInput";
import { auditStatusLabelTr } from "@/app/_utils/StatusLabels";

type AuditTeam = { id: string; name: string; leaderUserId?: string | null };

export function AuditPlannerPanel(props: {
  locations: LocationEntity[];
  teams: AuditTeam[];
  audits: Audit[];
  users: User[];
  onCreateParentPlan: (payload: {
    quarter: string;
    dateRangeStart: string;
    dateRangeEnd: string;
    title?: string;
  }) => void;
  onCreate: (data: {
    plannedDate: string;
    locationId: string;
    assignedTeamId: string;
    note?: string;
    status: AuditStatus;
    parentPlanId?: string | null;
  }) => void;
  onUpdateStatus: (id: string, status: AuditStatus) => void;
  onUpdateDate: (id: string, newDate: string, newCount: number) => void;
  onDelete: (id: string) => void;
  /** Active team memberships, for the auditor clash (#26) and field-manager (#13) checks. */
  teamMembers?: Array<{ teamId: string; userId: string }>;
  /** The godmin moves any date any number of times, spending nothing (#32). */
  isGod?: boolean;
  /**
   * Merkez Ekip / Super Admin / godmin. Only they approve an audit (Tamamlandı),
   * reopen a completed one, or move the date of one already carried out —
   * not the plant manager (customer notes rows 12, 17, 29).
   */
  isAdmin?: boolean;
}) {
  const { locations, teams, audits, users, onCreateParentPlan, onCreate, onUpdateStatus, onUpdateDate, onDelete } = props;
  const teamMembers = props.teamMembers ?? [];
  const isGod = props.isGod ?? false;
  const canFinish = isGod || (props.isAdmin ?? false);

  /** The team's people: its leader and its active members. */
  const peopleOf = (teamId: string) =>
    new Set(
      [teams.find((t) => t.id === teamId)?.leaderUserId, ...teamMembers.filter((m) => m.teamId === teamId).map((m) => m.userId)]
        .filter(Boolean)
        .map(String)
    );
  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? id;

  /*
   * #13: the location's field manager cannot be on the team that audits it.
   * The server refuses such a plan; this says so before the button is pressed.
   */
  const fieldManagerClash = (teamId: string, locId: string): string[] => {
    if (!teamId || !locId) return [];
    const fm = new Set((locations.find((l) => l.id === locId)?.fieldManagerUserIds ?? []).map(String));
    return [...peopleOf(teamId)].filter((id) => fm.has(id)).map(nameOf);
  };

  /** A plan date move: who may, and whether it spends one of the two changes. */
  const dateRule = (a: Audit) => {
    const used = a.dateChangeCount ?? 0;
    const done = a.status === "completed" || a.status === "pending_approval";
    // A carried-out audit's date is a correction: admins only, nothing spent.
    if (done) return { canChange: canFinish, spends: false, label: "Tarihi Düzenle" };
    const free = isGod;
    return { canChange: free || used < 2, spends: !free, label: free ? "Tarihi Düzenle" : `Düzenle (${2 - used} hak)` };
  };

  /*
   * The plan's status menu. "Planlandı" is not offered once the plan has an
   * audit_id: the audit form drops such plans, so a sent audit set back to
   * planned could never be redone. "Tamamlandı" (approving) and reopening a
   * completed plan are for admins only; the server refuses the same.
   */
  const renderStatusSelect = (a: Audit) => {
    const lockedCompleted = a.status === "completed" && !canFinish;
    return (
      <Select
        className="py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60"
        value={a.status}
        disabled={lockedCompleted}
        title={lockedCompleted ? "Tamamlanmış denetimi yalnız Merkez Ekip yeniden açabilir." : undefined}
        onChange={(e) => onUpdateStatus(a.id, e.target.value as AuditStatus)}
      >
        <option value="planned" disabled={!!a.auditId}>Planlandı</option>
        <option value="pending_approval">Onay Bekliyor</option>
        <option value="completed" disabled={!canFinish}>Tamamlandı</option>
        <option value="cancelled">İptal edildi</option>
      </Select>
    );
  };

  // ── Parent plan form ────────────────────────────────────────────────────────
  const [ppQuarter, setPpQuarter] = React.useState("");
  const [ppStart, setPpStart] = React.useState("");
  const [ppEnd, setPpEnd] = React.useState("");
  const [ppTitle, setPpTitle] = React.useState("");
  const [ppOpen, setPpOpen] = React.useState(false);
  const [expandedParentIds, setExpandedParentIds] = React.useState<Set<string>>(new Set());

  // ── Sub-plan form ───────────────────────────────────────────────────────────
  const [plannedDate, setPlannedDate] = React.useState("");
  const [locationId, setLocationId] = React.useState("");
  const [assignedTeamId, setAssignedTeamId] = React.useState("");
  const [note, setNote] = React.useState("");
  const [parentPlanId, setParentPlanId] = React.useState("");

  // ── Date edit ───────────────────────────────────────────────────────────────
  const [editingDateId, setEditingDateId] = React.useState<string | null>(null);
  const [editingDateVal, setEditingDateVal] = React.useState("");

  // ── Derived ────────────────────────────────────────────────────────────────
  const parentPlans = React.useMemo(
    () => audits.filter((a) => !a.locationId && !a.assignedTeamId),
    [audits]
  );

  const subPlans = React.useMemo(
    () => audits.filter((a) => !!a.locationId || !!a.assignedTeamId),
    [audits]
  );

  const activeLocations = React.useMemo(
    () => locations.filter((x) => x.isActive),
    [locations]
  );

  const selectedParentRange = React.useMemo(() => {
    if (!parentPlanId) return null;
    const pp = parentPlans.find((p) => p.id === parentPlanId);
    if (!pp?.dateRangeStart || !pp?.dateRangeEnd) return null;
    return { start: pp.dateRangeStart, end: pp.dateRangeEnd };
  }, [parentPlanId, parentPlans]);

  const dateOutOfRange = !!(
    selectedParentRange &&
    plannedDate &&
    (plannedDate < selectedParentRange.start || plannedDate > selectedParentRange.end)
  );

  // ── Conflict detection ─────────────────────────────────────────────────────
  function detectConflicts(date: string, teamId: string, locId: string, excludeId?: string): string[] {
    if (!date || !teamId || !locId) return [];
    const same = subPlans.filter((a) => a.plannedDate === date && a.id !== excludeId && a.status !== "cancelled");
    const warns: string[] = [];

    const selTeam = teams.find((t) => t.id === teamId);

    const teamConflict = same.find((a) => a.assignedTeamId === teamId);
    if (teamConflict) {
      const tName = selTeam?.name ?? teamId;
      const cLoc = locations.find((l) => l.id === teamConflict.locationId)?.name ?? "-";
      warns.push(`"${tName}" ekibi bu tarihte "${cLoc}" denetiminde görevli.`);
    }

    const leaderId = selTeam?.leaderUserId;
    if (leaderId) {
      const leaderConflict = same.find(
        (a) => a.assignedTeamId !== teamId && teams.find((t) => t.id === a.assignedTeamId)?.leaderUserId === leaderId
      );
      if (leaderConflict) {
        const leaderName = users.find((u) => u.id === leaderId)?.name ?? leaderId;
        const cLoc = locations.find((l) => l.id === leaderConflict.locationId)?.name ?? "-";
        const cTeam = teams.find((t) => t.id === leaderConflict.assignedTeamId)?.name ?? "-";
        warns.push(`Ekip lideri (${leaderName}) bu tarihte "${cLoc}" denetiminde (${cTeam}) görevli.`);
      }
    }

    // #26: one of this team's auditors is already on another team's audit that day.
    const mine = peopleOf(teamId);
    for (const plan of same) {
      if (plan.assignedTeamId === teamId) continue;
      /*
       * The leader is left out only where the leader warning above already
       * names them — the other team is LED by the same person. When our
       * leader is merely a member of that other team, no leader warning fires,
       * and dropping them here hid the clash altogether.
       */
      const otherLeaderId = teams.find((t) => t.id === plan.assignedTeamId)?.leaderUserId;
      const leaderAlreadyWarned = !!leaderId && String(otherLeaderId ?? "") === String(leaderId);
      const shared = [...peopleOf(plan.assignedTeamId)].filter(
        (id) => mine.has(id) && !(leaderAlreadyWarned && id === String(leaderId))
      );
      if (shared.length > 0) {
        const cLoc = locations.find((l) => l.id === plan.locationId)?.name ?? "-";
        warns.push(`Denetçi (${shared.map(nameOf).join(", ")}) bu tarihte "${cLoc}" denetiminde de görevli.`);
      }
    }

    const selLoc = locations.find((l) => l.id === locId);
    const selFM = selLoc?.fieldManagerUserIds ?? [];
    if (selFM.length > 0) {
      for (const plan of same) {
        if (plan.locationId === locId) continue;
        const pLoc = locations.find((l) => l.id === plan.locationId);
        const pFM = pLoc?.fieldManagerUserIds ?? [];
        const overlap = selFM.filter((id) => pFM.includes(id));
        if (overlap.length > 0) {
          const names = overlap.map((uid) => users.find((u) => u.id === uid)?.name ?? uid).join(", ");
          warns.push(`Saha sorumlusu (${names}) bu tarihte "${pLoc?.name ?? "-"}" denetiminde görevli.`);
        }
      }
    }
    return warns;
  }

  const createConflicts = React.useMemo(
    () => detectConflicts(plannedDate, assignedTeamId, locationId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plannedDate, assignedTeamId, locationId, subPlans, locations, teams, users, teamMembers]
  );
  const createClash = fieldManagerClash(assignedTeamId, locationId);

  function getEditConflicts(auditId: string, newDate: string): string[] {
    const a = subPlans.find((x) => x.id === auditId);
    if (!a) return [];
    return detectConflicts(newDate, a.assignedTeamId, a.locationId, auditId);
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  function submitParentPlan() {
    if (!ppQuarter || !ppStart || !ppEnd) return;
    onCreateParentPlan({ quarter: ppQuarter, dateRangeStart: ppStart, dateRangeEnd: ppEnd, title: normalizeName(ppTitle) || undefined });
    setPpQuarter(""); setPpStart(""); setPpEnd(""); setPpTitle(""); setPpOpen(false);
  }

  function submitSubPlan() {
    if (!plannedDate || !locationId || !assignedTeamId || dateOutOfRange || createClash.length > 0) return;
    onCreate({
      plannedDate,
      locationId,
      assignedTeamId,
      note: normalizeName(note) || undefined,
      status: "planned",
      parentPlanId: parentPlanId || null,
    });
    setPlannedDate(""); setLocationId(""); setAssignedTeamId(""); setNote(""); setParentPlanId("");
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── DÖNEM PLANLARI ──────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
        <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Dönem Planları (Ana Planlar)</h2>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Quarter tanımla, tarih aralığı belirle.</p>
          </div>
          <button
            type="button"
            onClick={() => setPpOpen((v) => !v)}
            className="rounded-md border border-sky-700/60 bg-sky-950/40 px-3 py-1.5 text-xs font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-950/70"
          >
            {ppOpen ? "İptal" : "+ Yeni Dönem"}
          </button>
        </div>

        {ppOpen && (
          <div className="border-b border-slate-300 dark:border-slate-800 p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Quarter (ör: 2025-Q2)</label>
                <Input
                  value={ppQuarter}
                  onChange={(e) => setPpQuarter(e.target.value)}
                  placeholder="2025-Q2"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Başlangıç Tarihi</label>
                <DateInput
                  className="date-dark w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                  value={ppStart}
                  onChange={setPpStart}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Bitiş Tarihi</label>
                <DateInput
                  className="date-dark w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                  value={ppEnd}
                  onChange={setPpEnd}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Başlık (opsiyonel)</label>
              <Input value={ppTitle} onChange={(e) => setPpTitle(e.target.value)} placeholder="Q2 2025 Denetim Dönemi" />
            </div>
            {ppStart && ppEnd && ppEnd < ppStart && (
              <p className="text-[11px] text-rose-400">⚠ Bitiş tarihi başlangıçtan önce olamaz.</p>
            )}
            <div className="flex justify-end">
              <PrimaryButton onClick={submitParentPlan} disabled={!ppQuarter || !ppStart || !ppEnd || ppEnd < ppStart}>
                Dönem Planı Oluştur
              </PrimaryButton>
            </div>
          </div>
        )}

        <div className="overflow-hidden">
          {parentPlans.length === 0 ? (
            <div className="px-4 py-5 text-sm text-slate-500 dark:text-slate-400">Henüz dönem planı yok.</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {parentPlans.map((pp) => {
                const childPlans = subPlans.filter((s) => s.parentPlanId === pp.id);
                const childCount = childPlans.length;
                const isExpanded = expandedParentIds.has(pp.id);

                return (
                  <div key={pp.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        setExpandedParentIds((prev) => {
                          const next = new Set(prev);
                          next.has(pp.id) ? next.delete(pp.id) : next.add(pp.id);
                          return next;
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedParentIds((prev) => {
                            const next = new Set(prev);
                            next.has(pp.id) ? next.delete(pp.id) : next.add(pp.id);
                            return next;
                          });
                        }
                      }}
                      className="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-slate-100 hover:dark:bg-slate-800/40"
                    >
                      <div className="flex items-center gap-3">
                        <ChevronRight
                          size={14}
                          className={`shrink-0 text-slate-600 dark:text-slate-400 transition-transform duration-200 ${isExpanded ?"rotate-90" : ""}`}
                        />
                        <span className="rounded border border-indigo-700/50 bg-indigo-100 dark:bg-indigo-950/40 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300">
                          {pp.quarter ?? "—"}
                        </span>
                        <div>
                          {pp.title && <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{pp.title}</p>}
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            {pp.dateRangeStart ?? "?"} – {pp.dateRangeEnd ?? "?"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{childCount} denetim planı</span>
                        <Badge>{auditStatusLabelTr(pp.status)}</Badge>
                        <DangerButton
                          className="py-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(pp.id);
                          }}
                        >
                          Sil
                        </DangerButton>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-800/60 bg-slate-950/20">
                        {childPlans.length === 0 ? (
                          <p className="px-8 py-4 text-xs text-slate-500 dark:text-slate-400">
                            Bu döneme bağlı denetim planı yok.
                          </p>
                        ) : (
                          <div className="divide-y divide-slate-800/40">
                            <div className="grid grid-cols-12 bg-slate-50 dark:bg-slate-900/60 px-8 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              <div className="col-span-2">Tarih</div>
                              <div className="col-span-3">Lokasyon</div>
                              <div className="col-span-2">Ekip</div>
                              <div className="col-span-2">Saha Sorumlusu</div>
                              <div className="col-span-1 text-center">Durum</div>
                              <div className="col-span-2 text-right">İşlem</div>
                            </div>
                            {childPlans.map((a) => {
                              const locObj = locations.find((x) => x.id === a.locationId);
                              const loc = locObj?.name ?? (a.locationId ? "Silinmiş lokasyon" : "-");
                              const team = teams.find((x) => x.id === a.assignedTeamId)?.name ?? (a.assignedTeamId ? "Silinmiş ekip" : "-");
                              const sahaSort = (locObj?.fieldManagerUserIds ?? []).length > 0
                                ? (locObj!.fieldManagerUserIds!.map((id) => users.find((u) => u.id === id)?.name ?? id).join(", "))
                                : "-";
                              const rule = dateRule(a);
                              const changeCount = a.dateChangeCount ?? 0;
                              const canChangeDate = rule.canChange;
                              const isEditingDate = editingDateId === a.id;

                              return (
                                <div key={a.id} className="grid grid-cols-12 items-center gap-2 px-8 py-2">
                                  <div className="col-span-2">
                                    {isEditingDate ? (
                                      <div className="flex flex-col gap-1">
                                        <DateInput
                                          className="date-dark w-full rounded border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-950/70 px-2 py-1 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-1"
                                          value={editingDateVal}
                                          onChange={(v) => setEditingDateVal(v)}
                                        />
                                        {editingDateVal && getEditConflicts(a.id, editingDateVal).map((w, i) => (
                                          <p key={i} className="text-[11px] text-amber-700 dark:text-amber-300">⚠ {w}</p>
                                        ))}
                                        <div className="flex gap-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (editingDateVal && editingDateVal !== a.plannedDate) {
                                                onUpdateDate(a.id, editingDateVal, changeCount + (rule.spends ? 1 : 0));
                                              }
                                              setEditingDateId(null);
                                            }}
                                            className="rounded bg-sky-500 px-2 py-0.5 text-[11px] font-semibold text-slate-950 hover:bg-sky-400"
                                          >
                                            Kaydet
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditingDateId(null)}
                                            className="rounded border border-slate-400 dark:border-slate-600 px-2 py-0.5 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-200 hover:dark:bg-slate-800"
                                          >
                                            İptal
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-sm text-slate-800 dark:text-slate-200">{a.plannedDate}</span>
                                        {canChangeDate ? (
                                          <button
                                            type="button"
                                            onClick={() => { setEditingDateId(a.id); setEditingDateVal(a.plannedDate); }}
                                            className="text-left text-[11px] text-sky-700 dark:text-sky-400 hover:underline"
                                          >
                                            {rule.label}
                                          </button>
                                        ) : (
                                          <span className="text-[11px] text-slate-500 dark:text-slate-400">Tarih kilitli</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="col-span-3 text-sm text-slate-900 dark:text-slate-100">{loc}</div>
                                  <div className="col-span-2 text-sm text-slate-700 dark:text-slate-300">{team}</div>
                                  <div className="col-span-2 text-sm text-slate-700 dark:text-slate-300">{sahaSort}</div>
                                  <div className="col-span-1 text-center">
                                    <Badge>{auditStatusLabelTr(a.status)}</Badge>
                                  </div>
                                  <div className="col-span-2 flex justify-end gap-2">
                                    {renderStatusSelect(a)}
                                    <DangerButton className="py-1.5" onClick={() => onDelete(a.id)}>Sil</DangerButton>
                                  </div>
                                  {a.note && (
                                    <div className="col-span-12 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
                                      Not: {a.note}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── DENETİM PLANLARI ─────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
        <div className="border-b border-slate-300 dark:border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Denetim Planları</h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Lokasyon + ekip seçerek plan oluştur.</p>
        </div>

        <div className="p-4 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Dönem bağlama */}
            <div className="space-y-1 md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Dönem Planı <span className="text-slate-500 dark:text-slate-400">(opsiyonel)</span>
              </label>
              <Select value={parentPlanId} onChange={(e) => setParentPlanId(e.target.value)}>
                <option value="">— Bağlı dönem yok —</option>
                {parentPlans.map((pp) => (
                  <option key={pp.id} value={pp.id}>
                    {pp.quarter ?? pp.id} {pp.title ? `– ${pp.title}` : ""} ({pp.dateRangeStart ?? "?"} – {pp.dateRangeEnd ?? "?"})
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Denetim Tarihi</label>
              <DateInput
                className={[
                  "date-dark w-full rounded-md border px-3 py-2 text-xs outline-none ring-sky-500/40 focus:ring-2",
                  dateOutOfRange
                    ? "border-rose-600 bg-rose-950/20 focus:border-rose-400"
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 focus:border-sky-400",
                ].join(" ")}
                value={plannedDate}
                onChange={(value) => setPlannedDate(value)}
              />
              {selectedParentRange && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Dönem aralığı: {selectedParentRange.start} – {selectedParentRange.end}
                </p>
              )}
              {dateOutOfRange && (
                <p className="text-[11px] text-rose-400">⚠ Tarih dönem aralığı dışında</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Lokasyon</label>
              <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">Seç</option>
                {activeLocations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Atanan Ekip</label>
              <Select value={assignedTeamId} onChange={(e) => setAssignedTeamId(e.target.value)}>
                <option value="">Seç</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Not</label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>

          {createConflicts.length > 0 && (
            <div className="rounded-md border border-amber-500/30 bg-amber-100 dark:bg-amber-500/10 px-3 py-2 space-y-1">
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">⚠ Çakışma Uyarısı</p>
              {createConflicts.map((w, i) => (
                <p key={i} className="text-[11px] text-amber-700 dark:text-amber-200">{w}</p>
              ))}
            </div>
          )}

          {createClash.length > 0 && (
            <div className="rounded-md border border-rose-500/40 bg-rose-100 dark:bg-rose-500/10 px-3 py-2">
              <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                {createClash.join(", ")} bu lokasyonun saha sorumlusu; kendi lokasyonunu denetleyen ekipte yer alamaz.
                Başka bir ekip seçin ya da ekibi düzenleyin.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <PrimaryButton
              onClick={submitSubPlan}
              disabled={!plannedDate || !locationId || !assignedTeamId || dateOutOfRange || createClash.length > 0}
            >
              Denetim Planı Oluştur
            </PrimaryButton>
          </div>

          {/* ── Dönemsiz Planlar ── */}
          {subPlans.filter((s) => !s.parentPlanId).length > 0 && (
            <div className="overflow-hidden rounded-lg border border-slate-300 dark:border-slate-800">
              <div className="border-b border-slate-800/60 bg-slate-50 dark:bg-slate-900/60 px-3 py-2">
                <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Dönemsiz Planlar</p>
              </div>
              <div className="grid grid-cols-12 bg-slate-50 dark:bg-slate-900/90 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <div className="col-span-2">Tarih</div>
                <div className="col-span-3">Lokasyon</div>
                <div className="col-span-2">Ekip</div>
                <div className="col-span-2">Saha Sorumlusu</div>
                <div className="col-span-1 text-center">Durum</div>
                <div className="col-span-2 text-right">İşlem</div>
              </div>
              {subPlans.filter((s) => !s.parentPlanId).map((a) => {
                const locObj = locations.find((x) => x.id === a.locationId);
                const loc = locObj?.name ?? (a.locationId ? "Silinmiş lokasyon" : "-");
                const team = teams.find((x) => x.id === a.assignedTeamId)?.name ?? (a.assignedTeamId ? "Silinmiş ekip" : "-");
                const sahaSort = (locObj?.fieldManagerUserIds ?? []).length > 0
                  ? (locObj!.fieldManagerUserIds!.map((id) => users.find((u) => u.id === id)?.name ?? id).join(", "))
                  : "-";
                const rule = dateRule(a);
                const changeCount = a.dateChangeCount ?? 0;
                const canChangeDate = rule.canChange;
                const isEditingDate = editingDateId === a.id;
                return (
                  <div key={a.id} className="grid grid-cols-12 items-center gap-2 border-t border-slate-300 dark:border-slate-800/80 px-3 py-2">
                    <div className="col-span-2">
                      {isEditingDate ? (
                        <div className="flex flex-col gap-1">
                          <DateInput
                            className="date-dark w-full rounded border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-950/70 px-2 py-1 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-1"
                            value={editingDateVal}
                            onChange={(v) => setEditingDateVal(v)}
                          />
                          {editingDateVal && getEditConflicts(a.id, editingDateVal).map((w, i) => (
                            <p key={i} className="text-[11px] text-amber-700 dark:text-amber-300">⚠ {w}</p>
                          ))}
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (editingDateVal && editingDateVal !== a.plannedDate) {
                                  onUpdateDate(a.id, editingDateVal, changeCount + (rule.spends ? 1 : 0));
                                }
                                setEditingDateId(null);
                              }}
                              className="rounded bg-sky-500 px-2 py-0.5 text-[11px] font-semibold text-slate-950 hover:bg-sky-400"
                            >
                              Kaydet
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingDateId(null)}
                              className="rounded border border-slate-400 dark:border-slate-600 px-2 py-0.5 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-200 hover:dark:bg-slate-800"
                            >
                              İptal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm text-slate-800 dark:text-slate-200">{a.plannedDate}</span>
                          {canChangeDate ? (
                            <button
                              type="button"
                              onClick={() => { setEditingDateId(a.id); setEditingDateVal(a.plannedDate); }}
                              className="text-left text-[11px] text-sky-700 dark:text-sky-400 hover:underline"
                            >
                              {rule.label}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">Tarih kilitli</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="col-span-3 text-sm text-slate-900 dark:text-slate-100">{loc}</div>
                    <div className="col-span-2 text-sm text-slate-700 dark:text-slate-300">{team}</div>
                    <div className="col-span-2 text-sm text-slate-700 dark:text-slate-300">{sahaSort}</div>
                    <div className="col-span-1 text-center">
                      <Badge>{auditStatusLabelTr(a.status)}</Badge>
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      {renderStatusSelect(a)}
                      <DangerButton className="py-1.5" onClick={() => onDelete(a.id)}>Sil</DangerButton>
                    </div>
                    {a.note && (
                      <div className="col-span-12 pt-1 text-[11px] text-slate-600 dark:text-slate-400">Not: {a.note}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}