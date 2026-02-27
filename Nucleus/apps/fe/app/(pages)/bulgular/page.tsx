"use client";

import { useEffect, useMemo, useState } from "react";
import { useGenericApiActions } from "@/app/_hooks/UseGenericApiStore";
import { useUploadAnswerPhoto } from "./hooks/useUploadAnswersPhoto";

type FindingStatus = "open" | "in_progress" | "closed";

type PhotoItem = {
    file_id?: string | null;
    url?: string | null;
};

type FiveSFinding = {
    id: string;
    audit_id: string;
    finding_no: number;
    detected_date: string; // ISO / YYYY-MM-DD
    location_name: string;
    finding_type: string;
    status: FindingStatus;
    description?: string | null;
    action_to_take?: string | null;
    due_date?: string | null;
    responsible_name?: string | null;

    // legacy
    photo_before_file_id?: string | null;
    photo_before_url?: string | null;
    photo_after_file_id?: string | null;
    photo_after_url?: string | null;

    // NEW (jsonb array)
    photo_before_files?: PhotoItem[] | null;
    photo_after_files?: PhotoItem[] | null;

    form_title?: string | null;
    created_at?: string;
};

type PaginationInfo = {
    page: number;
    limit: number;
    totalCount: number;
    pageCount: number;
};

function formatDate(value?: string | null) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.valueOf())) return value;
    return d.toLocaleDateString("tr-TR");
}

function statusBadgeClass(status: string) {
    switch (status) {
        case "open":
            return "bg-rose-500/10 text-rose-300 border border-rose-500/40";
        case "in_progress":
            return "bg-amber-500/10 text-amber-300 border border-amber-500/40";
        case "closed":
            return "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40";
        default:
            return "bg-slate-700/40 text-slate-200 border border-slate-600/60";
    }
}

const FILE_API_BASE_URL =
    process.env.NEXT_PUBLIC_FILE_API_URL ??
    process.env.NEXT_PUBLIC_AUTH_API_URL ??
    "http://localhost:1001";

function buildFileUrl(fileId: string) {
    return `${FILE_API_BASE_URL.replace(/\/+$/, "")}/files/${fileId}`;
}

function extractUuidMaybe(input: string): string | null {
    const m =
        input.match(
            /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
        ) ?? null;
    return m?.[0] ?? null;
}

function resolvePhotoUrl(p: PhotoItem) {
    if (p?.file_id) return buildFileUrl(p.file_id);

    const u = (p?.url ?? "").trim();
    if (u) {
        const uuid = extractUuidMaybe(u);
        if (uuid) return buildFileUrl(uuid);

        if (u.startsWith("http")) return u;
        if (u.startsWith("/")) return `${FILE_API_BASE_URL.replace(/\/+$/, "")}${u}`;
        return u;
    }

    return null;
}

function normalizePhotos(f: FiveSFinding): { before: PhotoItem[]; after: PhotoItem[] } {
    const beforeArr = Array.isArray(f.photo_before_files) ? f.photo_before_files : [];
    const afterArr = Array.isArray(f.photo_after_files) ? f.photo_after_files : [];

    const beforeFromLegacy =
        !beforeArr.length && (f.photo_before_file_id || f.photo_before_url)
            ? [{ file_id: f.photo_before_file_id ?? null, url: f.photo_before_url ?? null }]
            : [];

    const afterFromLegacy =
        !afterArr.length && (f.photo_after_file_id || f.photo_after_url)
            ? [{ file_id: f.photo_after_file_id ?? null, url: f.photo_after_url ?? null }]
            : [];

    const clean = (arr: PhotoItem[]) => (arr ?? []).filter((x) => x?.file_id || x?.url);

    return {
        before: clean(beforeArr.length ? beforeArr : beforeFromLegacy),
        after: clean(afterArr.length ? afterArr : afterFromLegacy),
    };
}

function mergeFilesUnique(prev: File[], incoming: File[]) {
    const key = (f: File) => `${f.name}__${f.size}__${f.lastModified}`;
    const seen = new Set(prev.map(key));
    const next = [...prev];

    for (const f of incoming) {
        const k = key(f);
        if (!seen.has(k)) {
            next.push(f);
            seen.add(k);
        }
    }
    return next;
}

export default function FiveSFindingsListPage() {
    const actions = useGenericApiActions();
    const { uploadAnswerPhoto } = useUploadAnswerPhoto();

    const [findings, setFindings] = useState<FiveSFinding[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo>({
        page: 1,
        limit: 20,
        totalCount: 0,
        pageCount: 1,
    });

    // Filters (UI state)
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<FindingStatus | "">("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    // Filters (applied state)
    const [appliedSearch, setAppliedSearch] = useState("");
    const [appliedStatus, setAppliedStatus] = useState<FindingStatus | "">("");
    const [appliedDateFrom, setAppliedDateFrom] = useState("");
    const [appliedDateTo, setAppliedDateTo] = useState("");

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [uploadingFindingId, setUploadingFindingId] = useState<string | null>(null);
    const [savingDueForId, setSavingDueForId] = useState<string | null>(null);
    const [savingStatusForId, setSavingStatusForId] = useState<string | null>(null);

    // multi upload queue
    const [afterUploadQueue, setAfterUploadQueue] = useState<Record<string, File[]>>({});

    const [expanded, setExpanded] = useState<{
        kind: "before" | "after" | null;
        findingId: string | null;
    }>({ kind: null, findingId: null });

    const listState = actions.GET_FIVE_S_FINDINGS?.state;
    const loading = listState?.isPending ?? false;

    const fetchFindings = () => {
        if (!actions.GET_FIVE_S_FINDINGS) return;
        setErrorMsg(null);

        actions.GET_FIVE_S_FINDINGS.start({
            payload: {
                page: pagination.page,
                limit: pagination.limit,

                // ✅ Kısmi arama: "dil" -> "Dilovası"
                search: appliedSearch || undefined,

                orderBy: "detected_date",
                orderDirection: "desc",
                filters: {
                    status: appliedStatus || undefined,
                    detected_date_gte: appliedDateFrom || undefined,
                    detected_date_lte: appliedDateTo || undefined,

                    // ❌ kaldırıldı: location_name (eşitlik gibi davranabiliyor)
                    // location_name: appliedSearch ? appliedSearch : undefined,
                },
            },
            onAfterHandle: (resp) => {
                const root = (resp as any)?.data;
                const dataArr: FiveSFinding[] = root?.data ?? (Array.isArray(root) ? root : []);
                const pag = root?.pagination ?? {
                    page: root?.page ?? pagination.page,
                    limit: root?.limit ?? pagination.limit,
                    totalCount: root?.totalCount ?? dataArr.length,
                    pageCount:
                        root?.pageCount ??
                        Math.max(
                            1,
                            Math.ceil((root?.totalCount ?? dataArr.length) / (root?.limit ?? pagination.limit))
                        ),
                };

                setFindings(dataArr);
                setPagination({
                    page: pag.page ?? 1,
                    limit: pag.limit ?? 20,
                    totalCount: pag.totalCount ?? dataArr.length,
                    pageCount: pag.pageCount ?? 1,
                });
            },
            onErrorHandle: (err) => {
                // eslint-disable-next-line no-console
                console.error("GET_FIVE_S_FINDINGS error", err);
                setErrorMsg("Bulgular yüklenirken bir hata oluştu.");
            },
        });
    };

    useEffect(() => {
        fetchFindings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page, pagination.limit, appliedSearch, appliedStatus, appliedDateFrom, appliedDateTo]);

    const handleApplyFilters = () => {
        // apply
        setAppliedSearch(search);
        setAppliedStatus(statusFilter);
        setAppliedDateFrom(dateFrom);
        setAppliedDateTo(dateTo);

        // reset page
        setPagination((prev) => ({ ...prev, page: 1 }));

        // ✅ UI filtrelerini temizle (applied filtreler aktif kalır)
        setSearch("");
        setStatusFilter("");
        setDateFrom("");
        setDateTo("");
    };

    const handleClearFilters = () => {
        setSearch("");
        setStatusFilter("");
        setDateFrom("");
        setDateTo("");

        setAppliedSearch("");
        setAppliedStatus("");
        setAppliedDateFrom("");
        setAppliedDateTo("");
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    const canPrev = pagination.page > 1;
    const canNext = pagination.page < pagination.pageCount;

    // due_date update
    const handleDueDateChange = (finding: FiveSFinding, value: string) => {
        const newDate = value || null;
        setFindings((prev) => prev.map((f) => (f.id === finding.id ? { ...f, due_date: newDate } : f)));

        if (!actions.UPDATE_FIVE_S_FINDING) return;
        setSavingDueForId(finding.id);

        actions.UPDATE_FIVE_S_FINDING.start({
            payload: { _id: finding.id, due_date: newDate },
            onAfterHandle: () => setSavingDueForId(null),
            onErrorHandle: (err) => {
                // eslint-disable-next-line no-console
                console.error("UPDATE_FIVE_S_FINDING (due_date) error", err);
                setSavingDueForId(null);
                fetchFindings();
            },
        });
    };

    // status update
    const handleStatusChange = (finding: FiveSFinding, value: string) => {
        const newStatus = (value as FindingStatus) || "open";
        setFindings((prev) => prev.map((f) => (f.id === finding.id ? { ...f, status: newStatus } : f)));

        if (!actions.UPDATE_FIVE_S_FINDING) return;
        setSavingStatusForId(finding.id);

        actions.UPDATE_FIVE_S_FINDING.start({
            payload: { _id: finding.id, status: newStatus },
            onAfterHandle: () => setSavingStatusForId(null),
            onErrorHandle: (err) => {
                // eslint-disable-next-line no-console
                console.error("UPDATE_FIVE_S_FINDING (status) error", err);
                setSavingStatusForId(null);
                fetchFindings();
            },
        });
    };

    // queue select
    const handleAfterPhotosSelect = (findingId: string, files: FileList | null) => {
        if (!files || files.length === 0) return;
        const incoming = Array.from(files);
        setAfterUploadQueue((prev) => ({
            ...prev,
            [findingId]: mergeFilesUnique(prev[findingId] ?? [], incoming),
        }));
    };

    const handleAfterPhotosUpload = async (finding: FiveSFinding) => {
        if (!uploadAnswerPhoto) return;

        const queue = afterUploadQueue[finding.id] ?? [];
        if (queue.length === 0) return;

        try {
            setUploadingFindingId(finding.id);

            const { after } = normalizePhotos(finding);
            const nextAfter: PhotoItem[] = [...after];

            for (const file of queue) {
                try {
                    const uploaded = await uploadAnswerPhoto({ file });
                    if (uploaded?.fileId) {
                        nextAfter.push({ file_id: uploaded.fileId, url: null });
                    } else if (uploaded?.fileUrl) {
                        const uuid = extractUuidMaybe(uploaded.fileUrl);
                        nextAfter.push({ file_id: uuid, url: uploaded.fileUrl });
                    }
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error("AFTER PHOTO UPLOAD error", err);
                }
            }

            const last = nextAfter[nextAfter.length - 1] ?? null;
            const lastFileId = last?.file_id ?? null;

            setFindings((prev) =>
                prev.map((f) =>
                    f.id === finding.id
                        ? {
                            ...f,
                            photo_after_files: nextAfter,
                            photo_after_file_id: lastFileId ?? null,
                            photo_after_url: lastFileId ? buildFileUrl(lastFileId) : null,
                        }
                        : f
                )
            );

            actions.UPDATE_FIVE_S_FINDING?.start({
                payload: {
                    _id: finding.id,
                    photo_after_files: nextAfter,
                    photo_after_file_id: lastFileId ?? null,
                    photo_after_url: lastFileId ? buildFileUrl(lastFileId) : null,
                },
                onAfterHandle: () => {
                    setUploadingFindingId(null);
                    setAfterUploadQueue((prev) => ({ ...prev, [finding.id]: [] }));
                },
                onErrorHandle: (err) => {
                    // eslint-disable-next-line no-console
                    console.error("UPDATE_FIVE_S_FINDING (after photos) error", err);
                    setUploadingFindingId(null);
                    fetchFindings();
                },
            });
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error("handleAfterPhotosUpload error", err);
            setUploadingFindingId(null);
        }
    };

    // remove photo
    const handleRemovePhoto = async (finding: FiveSFinding, kind: "before" | "after", index: number) => {
        if (!actions.UPDATE_FIVE_S_FINDING) return;

        const { before, after } = normalizePhotos(finding);
        const nextBefore = [...before];
        const nextAfter = [...after];
        if (kind === "before") nextBefore.splice(index, 1);
        else nextAfter.splice(index, 1);

        const legacyBeforePrimary = nextBefore[0] ?? null;
        const legacyAfterPrimary = nextAfter[nextAfter.length - 1] ?? null;

        const beforePrimaryId = legacyBeforePrimary?.file_id ?? null;
        const afterPrimaryId = legacyAfterPrimary?.file_id ?? null;

        setFindings((prev) =>
            prev.map((f) =>
                f.id === finding.id
                    ? {
                        ...f,
                        photo_before_files: nextBefore,
                        photo_after_files: nextAfter,
                        photo_before_file_id: beforePrimaryId,
                        photo_before_url: beforePrimaryId ? buildFileUrl(beforePrimaryId) : null,
                        photo_after_file_id: afterPrimaryId,
                        photo_after_url: afterPrimaryId ? buildFileUrl(afterPrimaryId) : null,
                    }
                    : f
            )
        );

        actions.UPDATE_FIVE_S_FINDING.start({
            payload: {
                _id: finding.id,
                photo_before_files: nextBefore,
                photo_after_files: nextAfter,
                photo_before_file_id: beforePrimaryId,
                photo_before_url: beforePrimaryId ? buildFileUrl(beforePrimaryId) : null,
                photo_after_file_id: afterPrimaryId,
                photo_after_url: afterPrimaryId ? buildFileUrl(afterPrimaryId) : null,
            },
            onAfterHandle: () => { },
            onErrorHandle: (err) => {
                // eslint-disable-next-line no-console
                console.error("UPDATE_FIVE_S_FINDING (remove photo) error", err);
                fetchFindings();
            },
        });
    };

    const rows = useMemo(() => {
        return findings.map((f) => {
            const { before, after } = normalizePhotos(f);
            return { f, before, after };
        });
    }, [findings]);

    const toggleExpanded = (kind: "before" | "after", findingId: string) => {
        setExpanded((prev) => {
            if (prev.kind === kind && prev.findingId === findingId) return { kind: null, findingId: null };
            return { kind, findingId };
        });
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-6 md:px-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <header className="flex flex-col gap-3 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold md:text-2xl">5S Bulguları</h1>
                        <p className="mt-1 text-sm text-slate-400">
                            Denetimlerde tespit edilen bulguların listesini burada görüntüleyebilirsiniz.
                        </p>
                    </div>

                    <div className="flex flex-col items-start gap-1 text-xs text-slate-400 md:items-end">
                        <span>Toplam Bulgu: {pagination.totalCount}</span>
                        <span>
                            Sayfa {pagination.page} / {pagination.pageCount}
                        </span>
                    </div>
                </header>

                {/* Filtreler */}
                <section className="rounded-2xl bg-slate-900/60 p-4 shadow-lg shadow-slate-950/50 space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 flex-1">
                            <div className="space-y-1">
                                <label className="block text-[11px] font-medium text-slate-300">
                                    Arama (Lokasyon / Açıklama)
                                </label>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Örn: Bakım Atölyesi"
                                    className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[11px] font-medium text-slate-300">Durum</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as FindingStatus | "")}
                                    className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                                >
                                    <option value="">Tümü</option>
                                    <option value="open">Açık</option>
                                    <option value="in_progress">Devam ediyor</option>
                                    <option value="closed">Kapandı</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[11px] font-medium text-slate-300">
                                    Tespit Tarihi (Başlangıç)
                                </label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="date-dark w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[11px] font-medium text-slate-300">
                                    Tespit Tarihi (Bitiş)
                                </label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="date-dark w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                                />
                            </div>
                        </div>

                        <div className="md:w-40 space-y-2">
                            {/* Üst sıra: Filtrele + Yenile */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleApplyFilters}
                                    className="flex-1 rounded-md bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400"
                                >
                                    Filtreleri Uygula
                                </button>

                                <button
                                    type="button"
                                    onClick={() => fetchFindings()}
                                    disabled={loading}
                                    className="flex-1 rounded-md border border-slate-600 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-60"
                                >
                                    {loading ? "Yükleniyor..." : "Yenile"}
                                </button>
                            </div>

                            {/* Alt sıra: Temizle */}
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="w-full rounded-md border border-slate-600 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
                            >
                                Temizle
                            </button>
                        </div>
                    </div>
                </section>

                {/* Liste */}
                <section className="rounded-2xl bg-slate-900/60 p-4 shadow-lg shadow-slate-950/50 space-y-4">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                        <span>{loading ? "Yükleniyor..." : `${pagination.totalCount} bulgu listeleniyor`}</span>
                        <div className="flex items-center gap-2">
                            <span>Sayfa başına:</span>
                            <select
                                value={pagination.limit}
                                onChange={(e) =>
                                    setPagination((prev) => ({
                                        ...prev,
                                        page: 1,
                                        limit: Number(e.target.value) || 20,
                                    }))
                                }
                                className="rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="rounded-md border border-rose-600/60 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
                            {errorMsg}
                        </div>
                    )}

                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                        <table className="min-w-full text-left text-xs text-slate-100">
                            <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wide text-slate-400">
                                <tr>
                                    <th className="px-4 py-2">No</th>
                                    <th className="px-4 py-2">Tespit Tarihi</th>
                                    <th className="px-4 py-2">Lokasyon</th>
                                    <th className="px-4 py-2">Tip</th>
                                    <th className="px-4 py-2">Durum</th>
                                    <th className="px-4 py-2">Faaliyet</th>
                                    <th className="px-4 py-2">Termin</th>
                                    <th className="px-4 py-2">Sorumlu</th>
                                    <th className="px-4 py-2">Foto (Önce)</th>
                                    <th className="px-4 py-2">Foto (Sonra)</th>
                                </tr>
                            </thead>

                            <tbody>
                                {rows.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-6 text-center text-xs text-slate-400">
                                            Gösterilecek bulgu bulunamadı.
                                        </td>
                                    </tr>
                                )}

                                {rows.map(({ f, before, after }) => {
                                    const beforeCount = before.length;
                                    const afterCount = after.length;

                                    const isBeforeOpen = expanded.kind === "before" && expanded.findingId === f.id;
                                    const isAfterOpen = expanded.kind === "after" && expanded.findingId === f.id;

                                    const beforeSingleUrl = beforeCount === 1 ? resolvePhotoUrl(before[0]!) : null;
                                    const afterSingleUrl = afterCount === 1 ? resolvePhotoUrl(after[0]!) : null;

                                    return (
                                        <tr key={f.id} className="border-t border-slate-800/80 hover:bg-slate-900/80 align-top">
                                            <td className="px-4 py-2 text-[11px] text-slate-400">{f.finding_no ?? "-"}</td>
                                            <td className="px-4 py-2 text-[11px]">{formatDate(f.detected_date)}</td>

                                            <td className="px-4 py-2 text-xs">
                                                <div className="max-w-[180px] truncate">{f.location_name}</div>
                                                {f.form_title && (
                                                    <div className="mt-0.5 text-[10px] text-slate-500 truncate max-w-[220px]">
                                                        {f.form_title}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-4 py-2 text-[11px] text-sky-300">{f.finding_type}</td>

                                            {/* Durum */}
                                            <td className="px-4 py-2">
                                                <div className="flex flex-col gap-1">
                                                    <select
                                                        value={f.status || "open"}
                                                        onChange={(e) => handleStatusChange(f, e.target.value)}
                                                        disabled={savingStatusForId === f.id}
                                                        className={`w-full rounded-md px-2 py-1 text-[11px] outline-none ring-sky-500/30 focus:ring-2 ${statusBadgeClass(
                                                            f.status
                                                        )}`}
                                                    >
                                                        <option value="open">Açık</option>
                                                        <option value="in_progress">Devam ediyor</option>
                                                        <option value="closed">Kapandı</option>
                                                    </select>
                                                    {savingStatusForId === f.id && (
                                                        <span className="text-[10px] text-slate-500">Kaydediliyor...</span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-4 py-2 text-[11px]">
                                                <div className="max-w-[220px] truncate">{f.action_to_take || "-"}</div>
                                            </td>

                                            {/* Termin */}
                                            <td className="px-4 py-2 text-[11px]">
                                                <input
                                                    type="date"
                                                    value={f.due_date ? f.due_date.slice(0, 10) : ""}
                                                    onChange={(e) => handleDueDateChange(f, e.target.value)}
                                                    className="date-dark w-full rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1 text-[11px] outline-none ring-sky-500/30 focus:border-sky-400 focus:ring-2"
                                                />
                                                {savingDueForId === f.id && (
                                                    <span className="mt-1 block text-[10px] text-slate-500">Kaydediliyor...</span>
                                                )}
                                            </td>

                                            <td className="px-4 py-2 text-[11px]">{f.responsible_name || "-"}</td>

                                            {/* Foto (Önce) */}
                                            <td className="px-4 py-2 text-[11px]">
                                                {beforeCount === 0 ? (
                                                    <span className="text-slate-500 text-[10px]"> </span>
                                                ) : beforeCount === 1 ? (
                                                    <a
                                                        href={beforeSingleUrl ?? "#"}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="rounded-md border border-sky-500/60 bg-sky-500/10 px-2 py-1 text-[10px] text-sky-300 hover:bg-sky-500/20"
                                                    >
                                                        Görüntüle
                                                    </a>
                                                ) : (
                                                    <div className="flex flex-col gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleExpanded("before", f.id)}
                                                            className="rounded-md border border-sky-500/60 bg-sky-500/10 px-2 py-1 text-[10px] text-sky-300 hover:bg-sky-500/20 text-left"
                                                        >
                                                            Görüntüle ({beforeCount})
                                                        </button>

                                                        {isBeforeOpen && (
                                                            <div className="mt-1 rounded-md border border-slate-800 bg-slate-950/40 p-2 space-y-1">
                                                                {before.map((p, idx) => {
                                                                    const url = resolvePhotoUrl(p);
                                                                    return (
                                                                        <div
                                                                            key={`${p.file_id ?? p.url ?? "x"}-${idx}`}
                                                                            className="flex items-center justify-between gap-2"
                                                                        >
                                                                            <a
                                                                                href={url ?? "#"}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="truncate text-[10px] text-sky-300 hover:underline"
                                                                            >
                                                                                {idx + 1}. {p.file_id ?? extractUuidMaybe(p.url ?? "") ?? "foto"}
                                                                            </a>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRemovePhoto(f, "before", idx)}
                                                                                className="rounded-md border border-slate-700 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-slate-800"
                                                                            >
                                                                                Sil
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Foto (Sonra) + Upload */}
                                            <td className="px-4 py-2 text-[11px]">
                                                <div className="flex flex-col ">
                                                    {afterCount === 0 ? (
                                                        <span className="text-slate-500 text-[10px]"> </span>
                                                    ) : afterCount === 1 ? (
                                                        <a
                                                            href={afterSingleUrl ?? "#"}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="rounded-md border border-emerald-500/60 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/20"
                                                        >
                                                            Görüntüle
                                                        </a>
                                                    ) : (
                                                        <div className="flex flex-col gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleExpanded("after", f.id)}
                                                                className="rounded-md border border-emerald-500/60 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/20 text-left"
                                                            >
                                                                Görüntüle ({afterCount})
                                                            </button>

                                                            {isAfterOpen && (
                                                                <div className="mt-1 rounded-md border border-slate-800 bg-slate-950/40 p-2 space-y-1">
                                                                    {after.map((p, idx) => {
                                                                        const url = resolvePhotoUrl(p);
                                                                        return (
                                                                            <div
                                                                                key={`${p.file_id ?? p.url ?? "x"}-${idx}`}
                                                                                className="flex items-center justify-between gap-2"
                                                                            >
                                                                                <a
                                                                                    href={url ?? "#"}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className="truncate text-[10px] text-emerald-300 hover:underline"
                                                                                >
                                                                                    {idx + 1}. {p.file_id ?? extractUuidMaybe(p.url ?? "") ?? "foto"}
                                                                                </a>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleRemovePhoto(f, "after", idx)}
                                                                                    className="rounded-md border border-slate-700 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-slate-800"
                                                                                >
                                                                                    Sil
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* MULTI UPLOAD */}
                                                    <div className="flex flex-col gap-1">
                                                        <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-slate-600 bg-slate-950/70 px-2 py-1 text-[10px] hover:bg-slate-800">
                                                            {uploadingFindingId === f.id ? "Yükleniyor..." : "Fotoğraf(lar) Seç"}
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                multiple
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    handleAfterPhotosSelect(f.id, e.target.files);
                                                                    e.currentTarget.value = "";
                                                                }}
                                                                disabled={uploadingFindingId === f.id}
                                                            />
                                                        </label>

                                                        {(afterUploadQueue[f.id]?.length ?? 0) > 0 && (
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-[10px] text-slate-400">
                                                                    Seçilen: {afterUploadQueue[f.id]!.length} dosya
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    disabled={uploadingFindingId === f.id}
                                                                    onClick={() => handleAfterPhotosUpload(f)}
                                                                    className="rounded-md bg-emerald-500 px-2 py-1 text-[10px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                                                                >
                                                                    Yükle
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between gap-3 pt-2 text-xs text-slate-400">
                        <span>
                            {(pagination.page - 1) * pagination.limit + 1} -{" "}
                            {Math.min(pagination.page * pagination.limit, pagination.totalCount)} arası gösteriliyor
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={!canPrev || loading}
                                onClick={() =>
                                    setPagination((prev) => ({
                                        ...prev,
                                        page: Math.max(1, prev.page - 1),
                                    }))
                                }
                                className={`rounded-md border px-3 py-1 text-xs ${canPrev && !loading
                                    ? "border-slate-600 text-slate-100 hover:bg-slate-800"
                                    : "border-slate-800 text-slate-600 cursor-not-allowed"
                                    }`}
                            >
                                Önceki
                            </button>
                            <button
                                type="button"
                                disabled={!canNext || loading}
                                onClick={() =>
                                    setPagination((prev) => ({
                                        ...prev,
                                        page: Math.min(prev.pageCount, prev.page + 1),
                                    }))
                                }
                                className={`rounded-md border px-3 py-1 text-xs ${canNext && !loading
                                    ? "border-slate-600 text-slate-100 hover:bg-slate-800"
                                    : "border-slate-800 text-slate-600 cursor-not-allowed"
                                    }`}
                            >
                                Sonraki
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
