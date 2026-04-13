"use client";

import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { LocationEntity, User } from "./types";
import { isNameTaken, normalizeName } from "./utils";
import { Modal } from "./Modal";
import { Input, PrimaryButton, SecondaryButton, Select } from "./ui";

export function LocationsPanel(props: {
    items: LocationEntity[];
    users: User[];
    usersLoading?: boolean;
    onCreate: (data: { name: string; managerUserId?: string | null; fieldManagerUserIds?: string[] }) => void;
    onUpdate: (id: string, data: { name: string; isActive: boolean; managerUserId?: string | null; fieldManagerUserIds?: string[] }) => void;
    onDelete: (id: string) => void;
}) {
    const { items, users, usersLoading, onCreate, onUpdate, onDelete } = props;

    const [q, setQ] = React.useState("");
    const [open, setOpen] = React.useState(false);
    const [mode, setMode] = React.useState<"create" | "edit">("create");
    const [editingId, setEditingId] = React.useState<string | null>(null);

    const [name, setName] = React.useState("");
    const [isActive, setIsActive] = React.useState(true);
    const [managerUserId, setManagerUserId] = React.useState<string>("");
    const [fieldManagerUserIds, setFieldManagerUserIds] = React.useState<string[]>([]);
    const [error, setError] = React.useState<string | null>(null);

    const filtered = React.useMemo(() => {
        const query = normalizeName(q).toLowerCase();
        if (!query) return items;
        return items.filter((x) => normalizeName(x.name).toLowerCase().includes(query));
    }, [items, q]);

    const userById = React.useMemo(() => {
        const m = new Map<string, string>();
        for (const u of users) m.set(u.id, u.name);
        return m;
    }, [users]);

    function openCreate() {
        setMode("create");
        setEditingId(null);
        setName("");
        setIsActive(true);
        setManagerUserId("");
        setFieldManagerUserIds([]);
        setError(null);
        setOpen(true);
    }

    function openEdit(it: LocationEntity) {
        setMode("edit");
        setEditingId(it.id);
        setName(it.name);
        setIsActive(it.isActive);
        setManagerUserId(it.managerUserId ?? "");
        setFieldManagerUserIds(it.fieldManagerUserIds ?? []);
        setError(null);
        setOpen(true);
    }

    function toggleFieldManager(userId: string) {
        setFieldManagerUserIds((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        );
    }

    function submit() {
        const n = normalizeName(name);
        if (!n) return setError("İsim zorunlu.");

        const payload = {
            name: n,
            managerUserId: managerUserId || null,
            fieldManagerUserIds,
        };

        if (mode === "create") {
            if (isNameTaken(items, n)) return setError("Bu isim zaten var.");
            onCreate(payload);
            setOpen(false);
            return;
        }

        if (mode === "edit" && editingId) {
            if (isNameTaken(items, n, editingId)) return setError("Bu isim zaten var.");
            onUpdate(editingId, { ...payload, isActive });
            setOpen(false);
        }
    }

    return (
        <section className="rounded-xl border border-slate-800 bg-slate-900/80">
            <div className="border-b border-slate-800 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-100">Lokasyonlar</h2>
                        <p className="mt-1 text-xs text-slate-400">Müdür ve saha sorumluları atanabilir.</p>
                    </div>
                    <button
                        type="button"
                        onClick={openCreate}
                        className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                    >
                        Yeni Ekle
                    </button>
                </div>

                <div className="mt-3">
                    <Input
                        placeholder="Ara (isim)"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                </div>
            </div>

            <div className="p-4">
                <div className="overflow-hidden rounded-lg border border-slate-800">
                    <div className="grid grid-cols-12 bg-slate-900/90 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        <div className="col-span-4">İsim</div>
                        <div className="col-span-3">Müdür</div>
                        <div className="col-span-3">Saha Sorumlusu</div>
                        <div className="col-span-2 text-center">İşlem</div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="px-3 py-6 text-sm text-slate-400 text-center">Kayıt yok.</div>
                    ) : (
                        filtered.map((it) => {
                            const nameClass = it.isActive ? "text-emerald-300" : "text-rose-300/60 line-through";
                            const managerName = it.managerUserId ? (userById.get(it.managerUserId) ?? it.managerUserId) : "-";
                            const fmNames = (it.fieldManagerUserIds ?? [])
                                .map((id) => userById.get(id) ?? id)
                                .join(", ") || "-";

                            return (
                                <div
                                    key={it.id}
                                    className="grid grid-cols-12 items-center gap-2 border-t border-slate-800/80 px-3 py-2"
                                >
                                    <div className={`col-span-4 text-sm font-semibold ${nameClass}`} title={it.isActive ? "Aktif" : "Pasif"}>
                                        {it.name}
                                        {!it.isActive && (
                                            <span className="ml-2 text-[11px] font-medium text-slate-500 no-underline">(Pasif)</span>
                                        )}
                                    </div>

                                    <div className="col-span-3 text-xs text-slate-300 truncate" title={managerName}>
                                        {managerName}
                                    </div>

                                    <div className="col-span-3 text-xs text-slate-300 truncate" title={fmNames}>
                                        {fmNames}
                                    </div>

                                    <div className="col-span-2 flex justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openEdit(it)}
                                            title="Düzenle"
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onDelete(it.id)}
                                            title="Sil"
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-rose-300/80 hover:bg-rose-500/10 hover:text-rose-200"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        Aktif
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-rose-400/70" />
                        Pasif
                    </span>
                </div>
            </div>

            <Modal
                open={open}
                title={mode === "create" ? "Yeni Lokasyon" : "Lokasyonu Düzenle"}
                description="Müdür tekil, saha sorumlusu birden fazla seçilebilir."
                onClose={() => setOpen(false)}
                footer={
                    <>
                        <SecondaryButton onClick={() => setOpen(false)}>Vazgeç</SecondaryButton>
                        <PrimaryButton onClick={submit} disabled={!normalizeName(name)}>
                            Kaydet
                        </PrimaryButton>
                    </>
                }
            >
                <div className="space-y-4 text-xs">
                    <div>
                        <label className="mb-1 block font-medium text-slate-300">İsim <span className="text-rose-400">*</span></label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>

                    {mode === "edit" ? (
                        <div>
                            <label className="mb-1 block font-medium text-slate-300">Aktiflik</label>
                            <Select
                                value={isActive ? "active" : "passive"}
                                onChange={(e) => setIsActive(e.target.value === "active")}
                            >
                                <option value="active">Aktif</option>
                                <option value="passive">Pasif</option>
                            </Select>
                        </div>
                    ) : null}

                    <div>
                        <label className="mb-1 block font-medium text-slate-300">Müdür</label>
                        <Select
                            value={managerUserId}
                            onChange={(e) => setManagerUserId(e.target.value)}
                        >
                            <option value="">{usersLoading ? "Yükleniyor..." : "Seçiniz (opsiyonel)"}</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </Select>
                    </div>

                    <div>
                        <label className="mb-1 block font-medium text-slate-300">
                            Saha Sorumluları <span className="text-slate-500">(birden fazla seçilebilir)</span>
                        </label>
                        {usersLoading ? (
                            <p className="text-slate-500 text-[11px]">Kullanıcılar yükleniyor...</p>
                        ) : users.length === 0 ? (
                            <p className="text-slate-500 text-[11px]">Kullanıcı bulunamadı.</p>
                        ) : (
                            <div className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/40 p-2">
                                {users.map((u) => {
                                    const checked = fieldManagerUserIds.includes(u.id);
                                    return (
                                        <label
                                            key={u.id}
                                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-900/60"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleFieldManager(u.id)}
                                                className="h-4 w-4 rounded border-slate-600 bg-slate-950/70 text-sky-400 focus:ring-sky-500/40"
                                            />
                                            <span className="text-xs text-slate-200">{u.name}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                        {fieldManagerUserIds.length > 0 && (
                            <p className="mt-1 text-[11px] text-slate-500">
                                Seçili: {fieldManagerUserIds.map((id) => userById.get(id) ?? id).join(", ")}
                            </p>
                        )}
                    </div>

                    {error ? (
                        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                            {error}
                        </div>
                    ) : null}
                </div>
            </Modal>
        </section>
    );
}
