"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useGenericApiActions } from "@/app/_hooks/UseGenericApiStore";

type DecisionStatus = "open" | "in_progress" | "done" | "cancelled";

type BoardMeetingDecision = {
    id: string;
    meeting_date: string;
    item_no: number;
    item_description: string;
    status: DecisionStatus;
    assigned_user_id?: string | null;
    created_at?: string;
};

type RoleLite = {
    id: string;
    name?: string | null;
};

type UserLite = {
    id: string;
    email?: string;
    name?: string;
    roles?: (string | RoleLite | any)[];
    profile?: { first_name?: string; last_name?: string };
};

const STATUS_OPTIONS: { value: DecisionStatus; label: string }[] = [
    { value: "open", label: "Açık" },
    { value: "in_progress", label: "Devam Ediyor" },
    { value: "done", label: "Tamamlandı" },
    { value: "cancelled", label: "İptal" },
];

function userDisplay(u: UserLite | undefined | null) {
    if (!u) return "Kullanıcı";
    const fn = u?.profile?.first_name ?? "";
    const ln = u?.profile?.last_name ?? "";
    const full = `${fn} ${ln}`.trim();
    return full || u?.name || u?.email || "Kullanıcı";
}

function getRoleNames(u: UserLite): string[] {
    const roles = u.roles ?? [];
    return roles
        .map((r) => {
            if (!r) return null;
            if (typeof r === "string") return r;
            if (typeof r === "object" && "name" in r) return (r as any).name;
            return (r as any)?.name ?? null;
        })
        .filter(Boolean)
        .map((x) => String(x));
}

function hasRole(u: UserLite, roleName: string) {
    const want = roleName.toLowerCase().trim();
    return getRoleNames(u).some((r) => String(r).toLowerCase().trim() === want);
}

const emptyForm = () => ({
    meetingDate: new Date().toISOString().slice(0, 10),
    itemDescription: "",
    status: "open" as DecisionStatus,
    assignedUserId: "",
});

export default function BoardMeetingDecisionsPage() {
    const actions = useGenericApiActions();

    const [form, setForm] = useState<ReturnType<typeof emptyForm>>(emptyForm);
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(false);
    const [decisions, setDecisions] = useState<BoardMeetingDecision[]>([]);
    const [createOpen, setCreateOpen] = useState(false);

    // Users
    const [usersLoading, setUsersLoading] = useState(false);
    const [users, setUsers] = useState<UserLite[]>([]);

    const managerUsers = useMemo(() => {
        return users.filter((u) => hasRole(u, "manager"));
    }, [users]);

    const userById = useMemo(() => {
        const m = new Map<string, UserLite>();
        users.forEach((u) => m.set(u.id, u));
        return m;
    }, [users]);

    useEffect(() => {
        fetchDecisions();
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchUsers = () => {
        setUsersLoading(true);

        actions.GET_USERS?.start({
            payload: { page: 1, limit: 1000 },
            onAfterHandle: (res: any) => {
                const rows: any[] =
                    res?.response?.data ??
                    res?.data?.data ??
                    res?.data ??
                    (Array.isArray(res) ? res : []);

                setUsers(rows as UserLite[]);
                setUsersLoading(false);
            },
            onErrorHandle: (err: any) => {
                console.error("GET_USERS error", err);
                setUsersLoading(false);
            },
        });
    };

    const fetchDecisions = () => {
        setListLoading(true);

        actions.GET_BOARD_MEETING_DECISIONS?.start({
            payload: {
                orderBy: [{ column: "meeting_date", direction: "desc" }],
            },
            onAfterHandle: (data: any) => {
                const rows: BoardMeetingDecision[] = data?.data ?? data ?? [];
                setDecisions(rows);
                setListLoading(false);
            },
            onErrorHandle: (err: any) => {
                console.error("GET_BOARD_MEETING_DECISIONS error", err);
                setListLoading(false);
                alert("Toplantı kararları listelenirken bir hata oluştu.");
            },
        });
    };

    const openCreateModal = () => {
        setForm(emptyForm());
        setCreateOpen(true);
    };

    const closeCreateModal = () => {
        if (loading) return;
        setCreateOpen(false);
    };

    const handleFormChange = <K extends keyof ReturnType<typeof emptyForm>>(
        field: K,
        value: ReturnType<typeof emptyForm>[K]
    ) => setForm((prev) => ({ ...prev, [field]: value }));

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!form.meetingDate) return alert("Toplantı tarihi zorunludur.");
        if (!form.itemDescription.trim()) return alert("Madde açıklaması zorunludur.");
        if (managerUsers.length === 0) return alert("Manager rolü olan kullanıcı bulunamadı.");
        if (!form.assignedUserId) return alert("Sorumlu manager seçmelisiniz.");

        setLoading(true);

        actions.ADD_BOARD_MEETING_DECISION?.start({
            payload: {
                meeting_date: new Date(form.meetingDate),
                item_description: form.itemDescription.trim(),
                status: form.status,
                assigned_user_id: form.assignedUserId,
            },
            onAfterHandle: (data: any) => {
                setLoading(false);

                const created: BoardMeetingDecision = data?.data?.[0] ?? data?.data ?? data;

                setCreateOpen(false);
                setForm(emptyForm());

                if (created?.id) setDecisions((prev) => [created, ...prev]);
                else fetchDecisions();
            },
            onErrorHandle: (err: any) => {
                console.error("ADD_BOARD_MEETING_DECISION error", err);
                setLoading(false);
                alert("Toplantı kararı kaydedilirken bir hata oluştu.");
            },
        });
    };

    const updateStatus = (id: string, next: DecisionStatus) => {

        setDecisions((prev) => prev.map((d) => (d.id === id ? { ...d, status: next } : d)));

        actions.UPDATE_BOARD_MEETING_DECISION?.start({
            payload: { _id: id, status: next },
            onAfterHandle: () => { },
            onErrorHandle: (err: any) => {
                console.error("UPDATE_BOARD_MEETING_DECISION error", err);
                fetchDecisions();
                alert("Durum güncellenirken hata oluştu.");
            },
        });
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-6 md:px-8">
            <div className="mx-auto max-w-5xl space-y-6">
                {/* Header */}
                <header className="border-b border-slate-800 pb-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold md:text-2xl">Kurul Toplantı Kararları</h1>
                            <p className="mt-1 text-sm text-slate-400">
                                3 ayda bir yapılan kurul toplantılarında alınan kararları burada kaydedebilir ve geçmiş toplantı
                                kararlarını görüntüleyebilirsiniz.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400"
                            >
                                Yeni Karar Ekle
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    fetchUsers();
                                    fetchDecisions();
                                }}
                                disabled={listLoading || usersLoading}
                                className="rounded-md border border-slate-600 px-3 py-2 text-[11px] text-slate-200 hover:bg-slate-800 disabled:opacity-60"
                            >
                                {listLoading || usersLoading ? "Yükleniyor..." : "Yenile"}
                            </button>
                        </div>
                    </div>
                </header>

                {/* Liste */}
                <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-slate-100">Geçmiş Toplantı Kararları</h2>
                        <div className="flex items-center gap-3">
                            {usersLoading ? <span className="text-[11px] text-slate-500">Kullanıcılar…</span> : null}
                            {listLoading ? <span className="text-[11px] text-slate-400">Yükleniyor…</span> : null}
                        </div>
                    </div>

                    {decisions.length === 0 ? (
                        <p className="text-xs text-slate-400">Henüz kayıtlı kurul toplantı kararı bulunmuyor.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-xs text-slate-200">
                                <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wide text-slate-400">
                                    <tr>
                                        <th className="px-4 py-2 whitespace-nowrap">Toplantı Tarihi</th>
                                        <th className="px-4 py-2 whitespace-nowrap">Madde No</th>
                                        <th className="px-4 py-2 w-full">Madde Açıklaması</th>
                                        <th className="px-4 py-2 whitespace-nowrap">Sorumlu Müdür</th>
                                        <th className="px-4 py-2 whitespace-nowrap">Durum</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {decisions.map((row) => {
                                        const dateStr = row.meeting_date
                                            ? new Date(row.meeting_date).toLocaleDateString("tr-TR")
                                            : "-";
                                        const assignedName = row.assigned_user_id
                                            ? userDisplay(userById.get(row.assigned_user_id))
                                            : "—";

                                        return (
                                            <tr key={row.id} className="border-t border-slate-800/80 align-top">
                                                <td className="px-4 py-2 whitespace-nowrap">{dateStr}</td>
                                                <td className="px-4 py-2 whitespace-nowrap">{row.item_no ?? "-"}</td>
                                                <td className="px-4 py-2 text-[11px]">{row.item_description}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-[11px] text-slate-200">{assignedName}</td>

                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    <select
                                                        value={row.status}
                                                        onChange={(e) => updateStatus(row.id, e.target.value as DecisionStatus)}
                                                        className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-[11px] text-slate-200 outline-none hover:bg-slate-950/80 focus:border-sky-400"
                                                    >
                                                        {STATUS_OPTIONS.map((opt) => (
                                                            <option key={opt.value} value={opt.value}>
                                                                {opt.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* CREATE MODAL */}
                {createOpen ? (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                        <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-2xl md:p-6">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-sm font-semibold text-slate-100">Yeni Toplantı Kararı Ekle</h2>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Madde açıklaması, durum ve sorumlu müdür ile birlikte tarih bilgisini giriniz.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeCreateModal}
                                    className="text-sm text-slate-400 hover:text-slate-200"
                                    aria-label="Kapat"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
                                <div className="space-y-1 md:col-span-2">
                                    <label className="block text-xs font-medium text-slate-300">
                                        Toplantı Tarihi <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={form.meetingDate}
                                        onChange={(e) => handleFormChange("meetingDate", e.target.value)}
                                        className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                                    />
                                </div>

                                <div className="space-y-1 md:col-span-2">
                                    <label className="block text-xs font-medium text-slate-300">
                                        Sorumlu Müdür <span className="text-rose-400">*</span>
                                    </label>
                                    <select
                                        value={form.assignedUserId}
                                        onChange={(e) => handleFormChange("assignedUserId", e.target.value)}
                                        disabled={usersLoading || managerUsers.length === 0}
                                        className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2 disabled:opacity-60"
                                    >
                                        <option value="">
                                            {usersLoading
                                                ? "Yükleniyor..."
                                                : managerUsers.length
                                                    ? "Seç"
                                                    : "Manager rolü olan kullanıcı yok"}
                                        </option>

                                        {managerUsers.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {userDisplay(u)}
                                            </option>
                                        ))}
                                    </select>

                                    <div className="text-[11px] text-slate-500">
                                        Yalnızca rolü <span className="text-slate-300">müdür</span> olan kullanıcılar listelenir.
                                    </div>
                                </div>

                                <div className="space-y-1 md:col-span-2">
                                    <label className="block text-xs font-medium text-slate-300">
                                        Madde Açıklaması <span className="text-rose-400">*</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={form.itemDescription}
                                        onChange={(e) => handleFormChange("itemDescription", e.target.value)}
                                        className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                                        placeholder="Örn: X konusundaki süreçlerin yeniden değerlendirilmesine..."
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-slate-300">
                                        Durum <span className="text-rose-400">*</span>
                                    </label>
                                    <select
                                        value={form.status}
                                        onChange={(e) => handleFormChange("status", e.target.value as DecisionStatus)}
                                        className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                                    >
                                        {STATUS_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-end justify-end gap-2 md:col-span-2">
                                    <button
                                        type="button"
                                        onClick={closeCreateModal}
                                        disabled={loading}
                                        className="rounded-md border border-slate-600 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-60"
                                    >
                                        Vazgeç
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="inline-flex items-center justify-center rounded-md bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
                                    >
                                        {loading ? "Kaydediliyor..." : "Kararı Kaydet"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
