"use client";

import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { MasterEntity } from "./types";
import { isNameTaken, normalizeName } from "./utils";
import { Modal } from "./Modal";
import { Input, PrimaryButton, SecondaryButton, Select } from "./ui";

export function MasterDataPanel(props: {
    title: string;
    items: MasterEntity[];
    onCreate: (data: Pick<MasterEntity, "name">) => void;
    onUpdate: (id: string, data: Pick<MasterEntity, "name" | "isActive">) => void;
    onDelete: (id: string) => void;
}) {
    const { title, items, onCreate, onUpdate, onDelete } = props;

    const [q, setQ] = React.useState("");
    const [open, setOpen] = React.useState(false);
    const [mode, setMode] = React.useState<"create" | "edit">("create");
    const [editingId, setEditingId] = React.useState<string | null>(null);

    const [name, setName] = React.useState("");
    const [isActive, setIsActive] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const filtered = React.useMemo(() => {
        const query = normalizeName(q).toLowerCase();
        if (!query) return items;
        return items.filter((x) =>
            normalizeName(x.name).toLowerCase().includes(query)
        );
    }, [items, q]);

    function openCreate() {
        setMode("create");
        setEditingId(null);
        setName("");
        setIsActive(true);
        setError(null);
        setOpen(true);
    }

    function openEdit(it: MasterEntity) {
        setMode("edit");
        setEditingId(it.id);
        setName(it.name);
        setIsActive(it.isActive);
        setError(null);
        setOpen(true);
    }

    function submit() {
        const n = normalizeName(name);
        if (!n) return setError("İsim zorunlu.");

        if (mode === "create") {
            if (isNameTaken(items, n)) return setError("Bu isim zaten var.");
            onCreate({ name: n });
            setOpen(false);
            return;
        }

        if (mode === "edit" && editingId) {
            if (isNameTaken(items, n, editingId))
                return setError("Bu isim zaten var.");
            onUpdate(editingId, { name: n, isActive });
            setOpen(false);
        }
    }

    return (
        <section className="rounded-xl border border-slate-800 bg-slate-900/80">
            <div className="border-b border-slate-800 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
                        <p className="mt-1 text-xs text-slate-400"></p>
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
                    {/* HEADER */}
                    <div className="grid grid-cols-12 bg-slate-900/90 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        <div className="col-span-10 text-center">İsim</div>
                        <div className="col-span-2 text-center">İşlem</div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="px-3 py-6 text-sm text-slate-400 text-center">
                            Kayıt yok.
                        </div>
                    ) : (
                        filtered.map((it) => {
                            const nameClass = it.isActive
                                ? "text-emerald-300"
                                : "text-rose-300/60 line-through";

                            return (
                                <div
                                    key={it.id}
                                    className="grid grid-cols-12 items-center gap-2 border-t border-slate-800/80 px-3 py-2"
                                >
                                    {/* NAME */}
                                    <div
                                        className={`col-span-10 text-center text-sm font-semibold ${nameClass}`}
                                        title={it.isActive ? "Aktif" : "Pasif"}
                                    >
                                        {it.name}
                                        {!it.isActive ? (
                                            <span className="ml-2 text-[11px] font-medium text-slate-500 no-underline">
                                                (Pasif)
                                            </span>
                                        ) : null}
                                    </div>

                                    {/* ACTIONS (icon-only, no border) */}
                                    <div className="col-span-2 flex justify-center">
                                        <div className="flex items-center gap-2">
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
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Legend */}
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
                title={mode === "create" ? "Yeni Kayıt" : "Kaydı Düzenle"}
                description=""
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
                        <label className="mb-1 block font-medium text-slate-300">İsim</label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>

                    {mode === "edit" ? (
                        <div>
                            <label className="mb-1 block font-medium text-slate-300">
                                Aktiflik
                            </label>
                            <Select
                                value={isActive ? "active" : "passive"}
                                onChange={(e) => setIsActive(e.target.value === "active")}
                            >
                                <option value="active">Aktif</option>
                                <option value="passive">Pasif</option>
                            </Select>
                        </div>
                    ) : null}

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
