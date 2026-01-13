"use client";

import React from "react";
import type { AuditStatus, MasterEntity } from "./types";
import { normalizeName } from "./utils";
import { Badge, DangerButton, Input, PrimaryButton, Select } from "./ui";

type AuditTeam = { id: string; name: string };

export function AuditPlannerPanel(props: {
	locations: MasterEntity[];
	teams: AuditTeam[];
	audits: Array<{
		id: string;
		planned_date: string;
		location_id: string;
		assigned_team_id: string;
		status: AuditStatus;
		note?: string;
	}>;
	onCreate: (data: {
		plannedDate: string;
		locationId: string;
		assignedTeamId: string;
		note?: string;
		status: AuditStatus;
	}) => void;
	onUpdateStatus: (id: string, status: AuditStatus) => void;
	onDelete: (id: string) => void;
}) {
	const { locations, teams, audits, onCreate, onUpdateStatus, onDelete } =
		props;

	const [plannedDate, setPlannedDate] = React.useState("");
	const [locationId, setLocationId] = React.useState("");
	const [assignedTeamId, setAssignedTeamId] = React.useState("");
	const [note, setNote] = React.useState("");

	const activeLocations = React.useMemo(
		() => locations.filter((x) => x.isActive),
		[locations],
	);

	function submit() {
		if (!plannedDate || !locationId || !assignedTeamId) return;

		onCreate({
			plannedDate,
			locationId,
			assignedTeamId,
			note: normalizeName(note) || undefined,
			status: "planned",
		});

		setPlannedDate("");
		setLocationId("");
		setAssignedTeamId("");
		setNote("");
	}

	return (
		<section className="rounded-xl border border-slate-800 bg-slate-900/80">
			<div className="border-b border-slate-800 px-4 py-3">
				<h2 className="text-sm font-semibold text-slate-100">
					Denetim Planlama
				</h2>
				<p className="mt-1 text-xs text-slate-400">
					Lokasyon + ekip seçerek plan oluştur.
				</p>
			</div>

			<div className="p-4 space-y-5">
				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-1">
						<label
							htmlFor="plannedDate"
							className="block text-xs font-medium text-slate-300"
						>
							Denetim Tarihi
						</label>
						<Input
							type="date"
							value={plannedDate}
							onChange={(e) => setPlannedDate(e.target.value)}
						/>
					</div>

					<div className="space-y-1">
						<label
							htmlFor="locationId"
							className="block text-xs font-medium text-slate-300"
						>
							Lokasyon
						</label>
						<Select
							value={locationId}
							onChange={(e) => setLocationId(e.target.value)}
						>
							<option value="">Seç</option>
							{activeLocations.map((l) => (
								<option key={l.id} value={l.id}>
									{l.name}
								</option>
							))}
						</Select>
					</div>

					<div className="space-y-1">
						<label
							htmlFor="assignedTeamId"
							className="block text-xs font-medium text-slate-300"
						>
							Atanan Ekip
						</label>
						<Select
							value={assignedTeamId}
							onChange={(e) => setAssignedTeamId(e.target.value)}
						>
							<option value="">Seç</option>
							{teams.map((t) => (
								<option key={t.id} value={t.id}>
									{t.name}
								</option>
							))}
						</Select>
					</div>

					<div className="space-y-1">
						<label
							htmlFor="note"
							className="block text-xs font-medium text-slate-300"
						>
							Not
						</label>
						<Input value={note} onChange={(e) => setNote(e.target.value)} />
					</div>
				</div>

				<div className="flex justify-end">
					<PrimaryButton
						onClick={submit}
						disabled={!plannedDate || !locationId || !assignedTeamId}
					>
						Denetimi Oluştur
					</PrimaryButton>
				</div>

				<div className="overflow-hidden rounded-lg border border-slate-800">
					<div className="grid grid-cols-12 bg-slate-900/90 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
						<div className="col-span-2">Tarih</div>
						<div className="col-span-4">Lokasyon</div>
						<div className="col-span-3">Ekip</div>
						<div className="col-span-1 text-center">Durum</div>
						<div className="col-span-2 text-right">İşlem</div>
					</div>

					{audits.length === 0 ? (
						<div className="px-3 py-6 text-sm text-slate-400">
							Henüz plan yok.
						</div>
					) : (
						audits.map((a) => {
							const loc =
								locations.find((x) => x.id === a.location_id)?.name ?? "-";
							const team =
								teams.find((x) => x.id === a.assigned_team_id)?.name ?? "-";

							return (
								<div
									key={a.id}
									className="grid grid-cols-12 items-center gap-2 border-t border-slate-800/80 px-3 py-2"
								>
									<div className="col-span-2 text-sm text-slate-200">
										{a.planned_date}
									</div>
									<div className="col-span-4 text-sm text-slate-100">{loc}</div>
									<div className="col-span-3 text-sm text-slate-300">
										{team}
									</div>

									<div className="col-span-1 text-center">
										<Badge>{a.status}</Badge>
									</div>

									<div className="col-span-2 flex justify-end gap-2">
										<Select
											className="py-1 text-xs"
											value={a.status}
											onChange={(e) =>
												onUpdateStatus(a.id, e.target.value as any)
											}
										>
											<option value="planned">planned</option>
											<option value="completed">completed</option>
											<option value="cancelled">cancelled</option>
										</Select>

										<DangerButton
											className="py-1.5"
											onClick={() => onDelete(a.id)}
										>
											Sil
										</DangerButton>
									</div>

									{a.note ? (
										<div className="col-span-12 pt-1 text-[11px] text-slate-400">
											Not: {a.note}
										</div>
									) : null}
								</div>
							);
						})
					)}
				</div>
			</div>
		</section>
	);
}
