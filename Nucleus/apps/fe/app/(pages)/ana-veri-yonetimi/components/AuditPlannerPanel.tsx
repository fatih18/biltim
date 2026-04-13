"use client";

import React from "react";
import type { Audit, AuditStatus, LocationEntity, User } from "./types";
import { normalizeName } from "./utils";
import { Badge, DangerButton, Input, PrimaryButton, Select } from "./ui";
import { DateInput } from "@/app/_components/DateInput";

type AuditTeam = { id: string; name: string };

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
}) {
  const { locations, teams, audits, users, onCreateParentPlan, onCreate, onUpdateStatus, onUpdateDate, onDelete } = props;

  // ── Parent plan form ────────────────────────────────────────────────────────
  const [ppQuarter, setPpQuarter] = React.useState("");
  const [ppStart, setPpStart] = React.useState("");
  const [ppEnd, setPpEnd] = React.useState("");
  const [ppTitle, setPpTitle] = React.useState("");
  const [ppOpen, setPpOpen] = React.useState(false);

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

    const teamConflict = same.find((a) => a.assignedTeamId === teamId);
    if (teamConflict) {
      const tName = teams.find((t) => t.id === teamId)?.name ?? teamId;
      const cLoc = locations.find((l) => l.id === teamConflict.locationId)?.name ?? "-";
      warns.push(`"${tName}" ekibi bu tarihte "${cLoc}" denetiminde görevli.`);
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
    [plannedDate, assignedTeamId, locationId, subPlans, locations, teams, users]
  );

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
    if (!plannedDate || !locationId || !assignedTeamId || dateOutOfRange) return;
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
      <section className="rounded-xl border border-slate-800 bg-slate-900/80">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Dönem Planları (Ana Planlar)</h2>
            <p className="mt-0.5 text-xs text-slate-400">Quarter tanımla, tarih aralığı belirle.</p>
          </div>
          <button
            type="button"
            onClick={() => setPpOpen((v) => !v)}
            className="rounded-md border border-sky-700/60 bg-sky-950/40 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-950/70"
          >
            {ppOpen ? "İptal" : "+ Yeni Dönem"}
          </button>
        </div>

        {ppOpen && (
          <div className="border-b border-slate-800 p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">Quarter (ör: 2025-Q2)</label>
                <Input
                  value={ppQuarter}
                  onChange={(e) => setPpQuarter(e.target.value)}
                  placeholder="2025-Q2"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">Başlangıç Tarihi</label>
                <DateInput
                  className="date-dark w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                  value={ppStart}
                  onChange={setPpStart}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">Bitiş Tarihi</label>
                <DateInput
                  className="date-dark w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                  value={ppEnd}
                  onChange={setPpEnd}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">Başlık (opsiyonel)</label>
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
            <div className="px-4 py-5 text-sm text-slate-500">Henüz dönem planı yok.</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {parentPlans.map((pp) => {
                const childCount = subPlans.filter((s) => s.parentPlanId === pp.id).length;
                return (
                  <div key={pp.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="rounded border border-indigo-700/50 bg-indigo-950/40 px-2 py-0.5 text-[11px] font-semibold text-indigo-300">
                        {pp.quarter ?? "—"}
                      </span>
                      <div>
                        {pp.title && <p className="text-xs font-medium text-slate-200">{pp.title}</p>}
                        <p className="text-[11px] text-slate-400">
                          {pp.dateRangeStart ?? "?"} – {pp.dateRangeEnd ?? "?"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-500">{childCount} alt plan</span>
                      <Badge>{pp.status}</Badge>
                      <DangerButton className="py-1" onClick={() => onDelete(pp.id)}>Sil</DangerButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── DENETİM PLANLARI ─────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/80">
        <div className="border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">Denetim Planları</h2>
          <p className="mt-0.5 text-xs text-slate-400">Lokasyon + ekip seçerek plan oluştur.</p>
        </div>

        <div className="p-4 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Dönem bağlama */}
            <div className="space-y-1 md:col-span-2">
              <label className="block text-xs font-medium text-slate-300">
                Dönem Planı <span className="text-slate-500">(opsiyonel)</span>
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
              <label className="block text-xs font-medium text-slate-300">Denetim Tarihi</label>
              <DateInput
                className={[
                  "date-dark w-full rounded-md border px-3 py-2 text-xs outline-none ring-sky-500/40 focus:ring-2",
                  dateOutOfRange
                    ? "border-rose-600 bg-rose-950/20 focus:border-rose-400"
                    : "border-slate-700 bg-slate-950/70 focus:border-sky-400",
                ].join(" ")}
                value={plannedDate}
                onChange={(value) => setPlannedDate(value)}
              />
              {selectedParentRange && (
                <p className="text-[10px] text-slate-500">
                  Dönem aralığı: {selectedParentRange.start} – {selectedParentRange.end}
                </p>
              )}
              {dateOutOfRange && (
                <p className="text-[10px] text-rose-400">⚠ Tarih dönem aralığı dışında</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">Lokasyon</label>
              <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">Seç</option>
                {activeLocations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">Atanan Ekip</label>
              <Select value={assignedTeamId} onChange={(e) => setAssignedTeamId(e.target.value)}>
                <option value="">Seç</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">Not</label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>

          {createConflicts.length > 0 && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 space-y-1">
              <p className="text-[11px] font-semibold text-amber-300">⚠ Çakışma Uyarısı</p>
              {createConflicts.map((w, i) => (
                <p key={i} className="text-[11px] text-amber-200">{w}</p>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <PrimaryButton
              onClick={submitSubPlan}
              disabled={!plannedDate || !locationId || !assignedTeamId || dateOutOfRange}
            >
              Denetim Planı Oluştur
            </PrimaryButton>
          </div>

          {/* ── Liste ── */}
          <div className="overflow-hidden rounded-lg border border-slate-800">
            <div className="grid grid-cols-12 bg-slate-900/90 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              <div className="col-span-2">Tarih</div>
              <div className="col-span-3">Lokasyon</div>
              <div className="col-span-2">Ekip</div>
              <div className="col-span-2">Saha Sorumlusu</div>
              <div className="col-span-1 text-center">Durum</div>
              <div className="col-span-2 text-right">İşlem</div>
            </div>

            {subPlans.length === 0 ? (
              <div className="px-3 py-6 text-sm text-slate-400">Henüz denetim planı yok.</div>
            ) : (
              subPlans.map((a) => {
                const locObj = locations.find((x) => x.id === a.locationId);
                const loc = locObj?.name ?? "-";
                const team = teams.find((x) => x.id === a.assignedTeamId)?.name ?? "-";
                const sahaSort = locObj?.managerUserId
                  ? (users.find((u) => u.id === locObj.managerUserId)?.name ?? "-")
                  : "-";
                const changeCount = a.dateChangeCount ?? 0;
                const canChangeDate = changeCount < 2;
                const isEditingDate = editingDateId === a.id;
                const parentPlan = a.parentPlanId ? parentPlans.find((p) => p.id === a.parentPlanId) : null;

                return (
                  <div key={a.id} className="grid grid-cols-12 items-center gap-2 border-t border-slate-800/80 px-3 py-2">
                    <div className="col-span-2">
                      {isEditingDate ? (
                        <div className="flex flex-col gap-1">
                          <DateInput
                            className="date-dark w-full rounded border border-slate-600 bg-slate-950/70 px-2 py-1 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-1"
                            value={editingDateVal}
                            onChange={(v) => setEditingDateVal(v)}
                          />
                          {editingDateVal && getEditConflicts(a.id, editingDateVal).map((w, i) => (
                            <p key={i} className="text-[10px] text-amber-300">⚠ {w}</p>
                          ))}
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (editingDateVal && editingDateVal !== a.plannedDate) {
                                  onUpdateDate(a.id, editingDateVal, changeCount + 1);
                                }
                                setEditingDateId(null);
                              }}
                              className="rounded bg-sky-500 px-2 py-0.5 text-[10px] font-semibold text-slate-950 hover:bg-sky-400"
                            >
                              Kaydet
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingDateId(null)}
                              className="rounded border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
                            >
                              İptal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm text-slate-200">{a.plannedDate}</span>
                          {canChangeDate ? (
                            <button
                              type="button"
                              onClick={() => { setEditingDateId(a.id); setEditingDateVal(a.plannedDate); }}
                              className="text-left text-[10px] text-sky-400 hover:underline"
                            >
                              Düzenle ({2 - changeCount} hak)
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500">Tarih kilitli</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="col-span-3 text-sm text-slate-100">{loc}</div>
                    <div className="col-span-2 text-sm text-slate-300">{team}</div>
                    <div className="col-span-2 text-sm text-slate-300">{sahaSort}</div>
                    <div className="col-span-1 text-center">
                      <Badge>{a.status}</Badge>
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <Select
                        className="py-1 text-xs"
                        value={a.status}
                        onChange={(e) => onUpdateStatus(a.id, e.target.value as AuditStatus)}
                      >
                        <option value="planned">planned</option>
                        <option value="completed">completed</option>
                        <option value="cancelled">cancelled</option>
                      </Select>
                      <DangerButton className="py-1.5" onClick={() => onDelete(a.id)}>Sil</DangerButton>
                    </div>
                    {(a.note || parentPlan) && (
                      <div className="col-span-12 flex flex-wrap gap-x-4 pt-1 text-[11px] text-slate-400">
                        {parentPlan && (
                          <span className="flex items-center gap-1">
                            <span className="rounded border border-indigo-800/50 bg-indigo-950/30 px-1.5 py-0.5 text-[10px] text-indigo-300">
                              {parentPlan.quarter ?? "Dönem"}
                            </span>
                            {parentPlan.title && <span>{parentPlan.title}</span>}
                          </span>
                        )}
                        {a.note && <span>Not: {a.note}</span>}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}