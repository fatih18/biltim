"use client";

import React from "react";
import { DateInput } from "@/app/_components/DateInput";

export type EditableAudit = {
    id: string;
    department_name: string;
    auditor_name: string;
    audit_date: string; // YYYY-MM-DD
    total_score: string;
    target_score: string;
    score_s1: string;
    score_s2: string;
    score_s3: string;
    score_s4: string;
    score_s5: string;
};

export function EditAuditModal(props: {
    audit: EditableAudit;
    saving: boolean;
    onSave: (next: EditableAudit) => void;
    onClose: () => void;
}) {
    const { audit, saving, onSave, onClose } = props;
    const [form, setForm] = React.useState<EditableAudit>(audit);

    const set = <K extends keyof EditableAudit>(key: K, value: EditableAudit[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const scoreFields: Array<{ key: keyof EditableAudit; label: string }> = [
        { key: "total_score", label: "Toplam Puan" },
        { key: "score_s1", label: "S1 Puanı" },
        { key: "score_s2", label: "S2 Puanı" },
        { key: "score_s3", label: "S3 Puanı" },
        { key: "score_s4", label: "S4 Puanı" },
        { key: "score_s5", label: "S5 Puanı" },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl md:p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-100">Tamamlanmış Denetimi Düzenle</h3>
                        <p className="mt-1 text-[11px] text-slate-400">
                            {audit.department_name} — sadece Merkez Ekip düzenleyebilir.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-sm text-slate-400 hover:text-slate-200"
                    >
                        ✕
                    </button>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                    <div>
                        <label className="mb-1 block font-medium text-slate-300">Denetimi Yapan</label>
                        <input
                            type="text"
                            value={form.auditor_name}
                            onChange={(e) => set("auditor_name", e.target.value)}
                            className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block font-medium text-slate-300">Denetim Tarihi</label>
                        <DateInput
                            value={form.audit_date}
                            onChange={(value) => set("audit_date", value)}
                            className="date-dark w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {scoreFields.map(({ key, label }) => (
                            <div key={key}>
                                <label className="mb-1 block font-medium text-slate-300">{label}</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={form[key]}
                                    onChange={(e) => set(key, e.target.value)}
                                    className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-5 flex justify-end gap-2 text-xs">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-slate-600 px-4 py-1.5 text-slate-200 hover:bg-slate-800"
                    >
                        İptal
                    </button>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => onSave(form)}
                        className="rounded-md bg-sky-500 px-4 py-1.5 font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
                    >
                        {saving ? "Kaydediliyor..." : "Kaydet"}
                    </button>
                </div>
            </div>
        </div>
    );
}
