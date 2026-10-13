"use client";
import { useServerList } from '@/app/_hooks/UseServerList'
import { InfiniteScroll } from '@/app/_components/Global/InfiniteScroll'
import { ScrollableTable } from '@/app/_components/Global/ScrollableTable'
import { confirmDialog } from '@/app/_components/Global/ConfirmDialog'

import { useEffect, useMemo, useState } from "react";
import { useGenericApiActions } from "@/app/_hooks/UseNucleusApi";
import { useGetUserRole } from "@/app/_hooks/user/useGetUserRole";
import { useUploadAnswerPhoto } from "./hooks/useUploadAnswersPhoto";
import { DateInput } from "@/app/_components/DateInput";
import { Camera, Eye, FileSpreadsheet, ImageIcon, Loader2, Trash2, Upload, X, ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/app/_components/Global/Skeleton";
import { buildFileUrl } from "@/app/_utils/photos";
import { ClipboardCheck } from "lucide-react";
import { EmptyState } from "@/app/_components/Global/EmptyState";
import { ADMIN_ROLES, CENTRAL_ROLES, hasPrivilege } from "@/app/_utils/routeAccess";
import { useMyScope } from "@/app/_hooks/user/useMyScope";
import { toast } from "sonner";
import { readServerReasons } from "@/app/_components/Global/PasswordRules";

type FindingStatus = "open" | "in_progress" | "closed";

type PhotoItem = {
  file_id?: string | null;
  url?: string | null;
};

type FiveSFinding = {
  id: string;
  audit_id: string;
  finding_no: number;
  question_id?: string | null;
  step_code?: string | null;
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
  auditor_name?: string | null;
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
      return "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/40";
    case "in_progress":
      return "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/40";
    case "closed":
      return "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40";
    default:
      return "bg-slate-700/40 text-slate-800 dark:text-slate-200 border border-slate-600/60";
  }
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
  const { roles: userRoles, isGod, isLoading: rolesLoading } = useGetUserRole();
  const { scope, failed: scopeFailed } = useMyScope();

  /*
   * Through hasPrivilege, so the install's root account is admitted whatever
   * the list says. Written out by hand, none of these three mentioned godmin —
   * so a godmin could not close a finding or delete one.
   */
  const myRoleNames = userRoles.map((r) => r.name);
  const OVERRIDE_ROLES = ["super admin", "manager", "content manager core team", "field manager"];
  const hasAuditor = userRoles.some((r) => r.name.toLowerCase() === "auditor");
  const hasOverrideRole = hasPrivilege(myRoleNames, OVERRIDE_ROLES);
  const isAuditor = hasAuditor && !hasOverrideRole;
  const CLOSE_ALLOWED_ROLES = ["field manager", "super admin", "manager"];
  const canCloseFinding = hasPrivilege(myRoleNames, CLOSE_ALLOWED_ROLES);
  // Madde 5: Sadece Merkez Ekip / Manager / Super Admin bulgu silebilir
  const DELETE_ALLOWED_ROLES = ["super admin", "manager", "content manager core team"];
  const canDeleteFinding = hasPrivilege(myRoleNames, DELETE_ALLOWED_ROLES);
  // #31: evidence on a closed finding is removed only by Merkez Ekip / Super Admin.
  const canRemoveClosedPhotos = hasPrivilege(myRoleNames, ADMIN_ROLES, isGod);
  // Reopening a closed finding is the same circle's; the server refuses anyone else.
  const canReopenFinding = canRemoveClosedPhotos;
  const canRemovePhotosOf = (f: { status?: string | null }) => f.status !== "closed" || canRemoveClosedPhotos;
  /*
   * #7/#24: a field manager sees the findings of the locations they are
   * responsible for, not the plant's. Narrowed on the server, so the total
   * and the rows agree; Merkez Ekip and above keep the whole register.
   */
  const isScopedToMyLocations =
    hasPrivilege(myRoleNames, ["field manager"]) && !hasPrivilege(myRoleNames, CENTRAL_ROLES, isGod);
  const [deletingFindingId, setDeletingFindingId] = useState<string | null>(null);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  /** One page. Infinite scroll asks for the next when the end comes into view. */
  const PAGE_SIZE = 25;

  const [findings, setFindings] = useState<FiveSFinding[]>([]);

  // Locations
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  // Filters
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<FindingStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // #3: findings raised during an audit, or on their own with the single-finding form.
  const [sourceFilter, setSourceFilter] = useState<"" | "audit" | "single">("");
  /*
   * #22 (Foto 2): the register's order is the user's to choose. It was fixed
   * to newest number first, which reads as "not sorted" to anyone looking for
   * a date or a due date; the column headers now sort.
   */
  const [sortField, setSortField] = useState<"finding_no" | "detected_date" | "due_date" | "location_name" | "status">("finding_no");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir(field === "location_name" || field === "status" ? "asc" : "desc");
    }
  };
  const sortMark = (field: typeof sortField) => (sortField === field ? (sortDir === "asc" ? " ▲" : " ▼") : "");

  // Lokasyonları mount'ta çek
  useEffect(() => {
    const locAction = (actions as any).GET_FIVE_S_LOCATIONS;
    if (!locAction?.start) return;
    locAction.start({
      payload: { page: 1, limit: 500, orderBy: "name", orderDirection: "asc" },
      onAfterHandle: (res: any) => {
        const arr: any[] =
          res?.data?.data ?? (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
        setLocations(
          arr
            .map((l) => ({ id: String(l.id ?? l._id ?? ""), name: String(l.name ?? "").trim() }))
            .filter((l) => l.name)
        );
      },
      onErrorHandle: () => {},
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const hasAfterPhoto = (finding: FiveSFinding) => {
    const { after } = normalizePhotos(finding);
    return after.length > 0;
  };

  /*
   * The field manager's locations, as a filter. A chosen location inside them
   * narrows further; one outside them, or none at all, matches nothing — an
   * empty list in this filter dialect means "no filter", which here would
   * have meant every finding.
   */
  const scopedLocationFilter = useMemo((): unknown => {
    if (!isScopedToMyLocations) return null;
    const mine = scope?.fieldManagerLocationNames ?? [];
    const pick = locationFilter
      ? mine.filter((n) => n.trim().toLocaleLowerCase("tr") === locationFilter.trim().toLocaleLowerCase("tr"))
      : mine;
    // Every finding carries a location (the server requires one), so this is "none".
    return pick.length > 0 ? pick : { operator: "isNull", value: true };
  }, [isScopedToMyLocations, scope, locationFilter]);

  /*
   * One server-driven list. The screen used to hold its own page state, build
   * its own payload and read its own envelope; all three now live in
   * useServerList, and the criteria below are the only thing this screen owns.
   */
  const listFilters = useMemo(
    () => ({
      /*
       * Location is an exact match on a column, not a free-text search.
       *
       * It used to go out as `search` with no `searchFields`, which the server
       * REFUSES outright — "A 'search' needs 'searchFields' naming the columns
       * to search ... without it the term would be ignored and every row
       * returned." The refusal was swallowed and the screen kept showing the
       * unfiltered list, so choosing a location did nothing at all. Measured:
       * 73 findings before and 73 after, where the correct filter returns 2.
       */
      location_name: scopedLocationFilter ?? (locationFilter || undefined),
      status: statusFilter || undefined,
      detected_date_gte: dateFrom || undefined,
      detected_date_lte: dateTo || undefined,
      /*
       * "Denetim bulguları" is everything that is not a single finding — and
       * that includes rows with NO form_title. A bare `neq` became SQL `<>`,
       * which is never true for NULL, so those audit findings vanished from
       * the audit filter while still showing under "Tümü".
       *
       * Sent as an `or` group. The map dialect has no way to spell OR, but the
       * translation passes an explicit operator through unchanged, and nucleus
       * reads an `or`/`and` condition by its `value` alone (the `field` the
       * map key adds is ignored for a group; the nested fields are the ones
       * it checks and resolves).
       */
      form_title:
        sourceFilter === "single"
          ? "Tekil Bulgu"
          : sourceFilter === "audit"
            ? {
                operator: "or",
                value: [
                  { field: "form_title", operator: "neq", value: "Tekil Bulgu" },
                  { field: "form_title", operator: "isNull", value: true },
                ],
              }
            : undefined,
    }),
    [locationFilter, statusFilter, dateFrom, dateTo, sourceFilter, scopedLocationFilter]
  );

  /*
   * Ties broken by creation time, always. Finding numbers repeated after the
   * numbering sequence was reset (#22, Foto 2: two #1, two #2) and with
   * finding_no alone the repeats came back in arbitrary order — the list
   * "was not sorted". The backend now keeps new numbers unique.
   */
  const listSort = useMemo(
    () =>
      sortField === "finding_no"
        ? [
            { field: "finding_no", direction: sortDir },
            { field: "created_at", direction: sortDir },
          ]
        : [
            { field: sortField, direction: sortDir },
            { field: "finding_no", direction: "desc" as const },
            { field: "created_at", direction: "desc" as const },
          ],
    [sortField, sortDir]
  );

  const serverList = useServerList<FiveSFinding>({
    action: actions.GET_FIVE_S_FINDINGS,
    pageSize: PAGE_SIZE,
    sort: listSort,
    filters: listFilters,
    // Not before we know whose findings to ask for.
    enabled: !rolesLoading && (!isScopedToMyLocations || !!scope || scopeFailed),
  });

  /*
   * The rows are mirrored into local state because this screen edits them in
   * place — a delete removes one, a photo upload rewrites one — and those edits
   * must survive until the next read rather than being undone by a re-render.
   */
  useEffect(() => {
    setFindings(serverList.rows);
  }, [serverList.rows]);

  useEffect(() => {
    setErrorMsg(serverList.error ? "Bulgular yüklenirken bir hata oluştu." : null);
  }, [serverList.error]);

  const handleApplyFilters = () => {
    serverList.reload();
  };

  const handleClearFilters = () => {
    setLocationFilter("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setSourceFilter("");
  };

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
        console.error("UPDATE_FIVE_S_FINDING (due_date) error", err);
        setSavingDueForId(null);
        serverList.reload();
      },
    });
  };

  // status update
  const handleStatusChange = (finding: FiveSFinding, value: string) => {
    if (isAuditor) return;

    const newStatus = (value as FindingStatus) || "open";

    if (finding.status === "closed" && newStatus !== "closed" && !canReopenFinding) {
      setErrorMsg("Kapanmış bulguyu yalnızca Merkez Ekip yeniden açabilir.");
      return;
    }

    if (newStatus === "closed" && !canCloseFinding) {
      setErrorMsg("Bulgu kapatma işlemi yalnızca Saha Sorumlusu tarafından yapılabilir.");
      return;
    }

    if (newStatus === "closed" && !hasAfterPhoto(finding)) {
      setErrorMsg("Bulgu kapatmak için \"Sonrası Fotoğraf\" yüklemek zorunludur.");
      return; // state değiştirme -> select eski halinde kalır
    }

    setFindings((prev) => prev.map((f) => (f.id === finding.id ? { ...f, status: newStatus } : f)));

    if (!actions.UPDATE_FIVE_S_FINDING) return;
    setSavingStatusForId(finding.id);

    actions.UPDATE_FIVE_S_FINDING.start({
      payload: { _id: finding.id, status: newStatus },
      onAfterHandle: () => setSavingStatusForId(null),
      onErrorHandle: (err) => {
        console.error("UPDATE_FIVE_S_FINDING (status) error", err);
        setSavingStatusForId(null);
        // The select snaps back on reload; say why instead of leaving it silent.
        const reasons = readServerReasons(err);
        toast.error(reasons.length > 0 ? reasons.join(" ") : "Bulgu durumu değiştirilemedi.");
        serverList.reload();
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
      /*
       * Which files of THIS batch actually reached storage. A failed upload
       * used to be logged and forgotten: the queue was cleared anyway and, if
       * the finding already had an older after photo, "Kaydet" closed it on
       * the strength of evidence nobody had just added.
       */
      const uploadedFiles = new Set<File>();

      for (const file of queue) {
        try {
          const uploaded = await uploadAnswerPhoto({ file });
          if (uploaded?.fileId) {
            nextAfter.push({ file_id: uploaded.fileId, url: null });
            uploadedFiles.add(file);
          } else if (uploaded?.fileUrl) {
            const uuid = extractUuidMaybe(uploaded.fileUrl);
            nextAfter.push({ file_id: uuid, url: uploaded.fileUrl });
            uploadedFiles.add(file);
          }
        } catch (err) {
          console.error("AFTER PHOTO UPLOAD error", err);
        }
      }

      const failedCount = queue.length - uploadedFiles.size;

      // Nothing of this batch landed: the finding is unchanged, so there is
      // nothing to save and certainly nothing to close. The files stay queued
      // for another try.
      if (uploadedFiles.size === 0) {
        setUploadingFindingId(null);
        toast.error(
          queue.length === 1
            ? "Fotoğraf yüklenemedi. Lütfen tekrar deneyin."
            : `${queue.length} fotoğrafın hiçbiri yüklenemedi. Lütfen tekrar deneyin.`
        );
        return;
      }

      const last = nextAfter[nextAfter.length - 1] ?? null;
      const lastFileId = last?.file_id ?? null;

      /*
       * #30: the field manager's "Kaydet" with an after photo closes the
       * finding — the photo IS the evidence that it is resolved, and choosing
       * "Kapandı" from a second control afterwards was the step people
       * missed. More photos can still be added to a closed finding.
       *
       * Only a photo uploaded by this "Kaydet" counts; reaching here means at
       * least one did.
       */
      const autoClose = canCloseFinding && !isAuditor && finding.status !== "closed";

      setFindings((prev) =>
        prev.map((f) =>
          f.id === finding.id
            ? {
                ...f,
                photo_after_files: nextAfter,
                photo_after_file_id: lastFileId ?? null,
                photo_after_url: lastFileId ? buildFileUrl(lastFileId) : null,
                ...(autoClose ? { status: "closed" as FindingStatus } : {}),
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
          ...(autoClose ? { status: "closed" } : {}),
        },
        onAfterHandle: () => {
          setUploadingFindingId(null);
          // Only the files that were saved leave the queue; a failed one stays
          // so "Kaydet" can be pressed again for it.
          setAfterUploadQueue((prev) => ({
            ...prev,
            [finding.id]: (prev[finding.id] ?? []).filter((f) => !uploadedFiles.has(f)),
          }));
          setErrorMsg(null);
          if (autoClose) toast.success(`#${finding.finding_no ?? ""} bulgusu kapatıldı.`);
          if (failedCount > 0) {
            toast.error(
              `${failedCount} fotoğraf yüklenemedi; listede bırakıldı, tekrar "Kaydet" ile deneyebilirsiniz.`
            );
          }
        },
        onErrorHandle: (err) => {
          console.error("UPDATE_FIVE_S_FINDING (after photos) error", err);
          setUploadingFindingId(null);
          // This save can also close the finding; a refusal says why.
          const reasons = readServerReasons(err);
          toast.error(
            reasons.length > 0
              ? `Fotoğraflar bulguya kaydedilemedi: ${reasons.join(" ")}`
              : "Fotoğraflar bulguya kaydedilemedi. Lütfen tekrar deneyin."
          );
          serverList.reload();
        },
      });
    } catch (err) {
      console.error("handleAfterPhotosUpload error", err);
      setUploadingFindingId(null);
    }
  };

  // Madde 5: bulgu silme (sadece Merkez Ekip)
  const handleDeleteFinding = async (finding: FiveSFinding) => {
    if (!canDeleteFinding) return;
    const del = (actions as any).DELETE_FIVE_S_FINDING;
    if (!del?.start) return;

    const ok = await confirmDialog({
      title: 'Bulguyu sil',
      message: `#${finding.finding_no} numaralı bulgu kalıcı olarak silinecek. Bu işlem geri alınamaz.`,
      confirmLabel: 'Sil',
      tone: 'danger',
    });
    if (!ok) return;

    setDeletingFindingId(finding.id);
    del.start({
      payload: { _id: finding.id },
      onAfterHandle: () => {
        setDeletingFindingId(null);
        setFindings((prev) => prev.filter((f) => f.id !== finding.id));
      },
      onErrorHandle: (err: any) => {
        console.error("DELETE_FIVE_S_FINDING error", err);
        setDeletingFindingId(null);
        setErrorMsg("Bulgu silinemedi. Yetkinizi kontrol edin.");
      },
    });
  };

  // Madde 15: Açık bulgu Excel raporu indir
  const handleDownloadExcel = async () => {
    try {
      setDownloadingExcel(true);
      // The register as filtered on screen; a field manager's export is
      // narrowed to their locations by the server, as the list is.
      const params = new URLSearchParams();
      if (locationFilter) params.set("location_name", locationFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (sourceFilter) params.set("source", sourceFilter === "single" ? "single_finding" : "audit");
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      const qs = params.toString();
      const res = await fetch(`/reports/findings.xlsx${qs ? `?${qs}` : ""}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Excel indirme hatası (${res.status})`);
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const nameMatch = cd.match(/filename="?([^";]+)"?/);
      const filename = nameMatch?.[1] ?? `5s-bulgu-raporu-${new Date().toISOString().slice(0, 10)}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Excel download error", err);
      setErrorMsg("Excel raporu indirilemedi.");
    } finally {
      setDownloadingExcel(false);
    }
  };

  // Madde 2: tüm sonrası fotoğrafları sil
  const handleRemoveAllAfterPhotos = async (finding: FiveSFinding) => {
    if (!actions.UPDATE_FIVE_S_FINDING) return;
    const ok = await confirmDialog({
      title: 'Sonrası fotoğraflarını sil',
      message: "Bu bulgunun tüm 'Sonrası' fotoğrafları silinecek. Bu işlem geri alınamaz.",
      confirmLabel: 'Sil',
      tone: 'danger',
    });
    if (!ok) return;

    setFindings((prev) =>
      prev.map((f) =>
        f.id === finding.id
          ? {
              ...f,
              photo_after_files: [],
              photo_after_file_id: null,
              photo_after_url: null,
            }
          : f
      )
    );

    actions.UPDATE_FIVE_S_FINDING.start({
      payload: {
        _id: finding.id,
        photo_after_files: [],
        photo_after_file_id: null,
        photo_after_url: null,
      },
      onAfterHandle: () => {},
      onErrorHandle: (err) => {
        console.error("UPDATE_FIVE_S_FINDING (remove all after photos) error", err);
        serverList.reload();
      },
    });
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
      onAfterHandle: () => {},
      onErrorHandle: (err) => {
        console.error("UPDATE_FIVE_S_FINDING (remove photo) error", err);
        serverList.reload();
      },
    });
  };

  // Madde 1: Aynı soruya + lokasyona ait mükerrer, kapanmamış (açık ya da devam eden)
  // bulguları tek satırda göster. Denetim ekranı ikisini de açık sayıyor; yalnız
  // 'open' birleşince ikizlerden biri 'Devam ediyor' olduğu an iki satır geri geliyordu.
  const rows = useMemo(() => {
    const questionIdOf = (f: FiveSFinding) => {
      const fromField = (f.question_id ?? "").toString().trim();
      if (fromField) return fromField;
      const desc = f.description ?? "";
      return (
        desc.match(/Soru ID:\s*(\S+)/)?.[1] ??
        desc.match(/Bağlı Soru:\s*(\S+)/)?.[1] ??
        ""
      );
    };

    const seen = new Map<string, number>(); // dedupe key -> ilk satırın indexi
    const result: Array<{
      f: FiveSFinding;
      before: PhotoItem[];
      after: PhotoItem[];
      duplicateCount: number;
    }> = [];

    for (const f of findings) {
      const qid = questionIdOf(f);
      const notClosed = f.status !== "closed";
      const key =
        notClosed && qid
          ? `${qid}__${(f.location_name ?? "").trim().toLocaleLowerCase("tr")}`
          : "";

      if (key && seen.has(key)) {
        const idx = seen.get(key)!;
        result[idx]!.duplicateCount += 1;
        continue;
      }

      const { before, after } = normalizePhotos(f);
      if (key) seen.set(key, result.length);
      result.push({ f, before, after, duplicateCount: 0 });
    }

    return result;
  }, [findings]);

  const toggleExpanded = (kind: "before" | "after", findingId: string) => {
    setExpanded((prev) => {
      if (prev.kind === kind && prev.findingId === findingId) return { kind: null, findingId: null };
      return { kind, findingId };
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-3 rounded-2xl p-4 border-b border-slate-300 dark:border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">5S Bulguları</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Denetimlerde tespit edilen bulguların listesini burada görüntüleyebilirsiniz.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 text-xs text-slate-600 dark:text-slate-400 md:items-end">
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={downloadingExcel}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-emerald-600/60 bg-emerald-100 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 disabled:opacity-50 dark:bg-emerald-950/30 dark:text-emerald-200 hover:dark:bg-emerald-950/60"
            >
              {downloadingExcel ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={13} />
              )}
              {downloadingExcel ? "Hazırlanıyor..." : "Bulgu Raporu (Excel)"}
            </button>
            <span>Toplam Bulgu: {serverList.total ?? findings.length}</span>
            <span>
              {findings.length} kayıt yüklendi
            </span>
          </div>
        </header>

        {/* Filtreler */}
        <section className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-4 shadow-lg shadow-slate-950/50 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 flex-1">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300">Lokasyon</label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                >
                  <option value="">{isScopedToMyLocations ? "Sorumlu olduğum lokasyonlar" : "Tümü"}</option>
                  {/* A field manager is offered only their own locations. */}
                  {(isScopedToMyLocations
                    ? locations.filter((loc) =>
                        (scope?.fieldManagerLocationNames ?? []).some(
                          (n) => n.trim().toLocaleLowerCase("tr") === loc.name.trim().toLocaleLowerCase("tr")
                        )
                      )
                    : locations
                  ).map((loc) => (
                    <option key={loc.id} value={loc.name}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300">Kaynak</label>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value as "" | "audit" | "single")}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                >
                  <option value="">Tümü</option>
                  <option value="audit">Denetim bulguları</option>
                  <option value="single">Tekil bulgular</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300">Durum</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as FindingStatus | "")}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                >
                  <option value="">Tümü</option>
                  <option value="open">Açık</option>
                  <option value="in_progress">Devam ediyor</option>
                  <option value="closed">Kapandı</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                  Tespit Tarihi (Başlangıç)
                </label>
                <DateInput
                  value={dateFrom}
                  onChange={(value) => setDateFrom(value)}
                  className="date-dark w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                  Tespit Tarihi (Bitiş)
                </label>
                <DateInput
                  value={dateTo}
                  onChange={(value) => setDateTo(value)}
                  className="date-dark w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                />
              </div>
            </div>

            <div className="space-y-2 md:w-auto">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-sky-700 px-4 text-xs font-semibold text-white hover:bg-sky-500"
                >
                  Filtreleri Uygula
                </button>

                <button
                  type="button"
                  onClick={() => serverList.reload()}
                  disabled={loading}
                  className="inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-slate-300 px-4 text-xs font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 hover:dark:bg-slate-800"
                >
                  {loading ? "Yükleniyor..." : "Yenile"}
                </button>
              </div>

              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex h-9 w-full items-center justify-center whitespace-nowrap rounded-md border border-slate-300 px-4 text-xs font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 hover:dark:bg-slate-800"
              >
                Temizle
              </button>
            </div>
          </div>
        </section>

        {/* Liste */}
        <section className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-4 shadow-lg shadow-slate-950/50 space-y-4">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span>
              {serverList.isLoading
                ? "Yükleniyor..."
                : `${serverList.total ?? findings.length} bulgu · ${findings.length} tanesi yüklendi`}
            </span>
          </div>

          {errorMsg && (
            <div className="rounded-md border border-rose-600/60 bg-rose-200 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-200">
              {errorMsg}
            </div>
          )}

          <ScrollableTable className="rounded-xl border border-slate-300 dark:border-slate-800">
            <table className="min-w-full text-left text-xs text-slate-900 dark:text-slate-100">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2">
                    <button type="button" onClick={() => toggleSort("finding_no")} className="uppercase hover:underline">No{sortMark("finding_no")}</button>
                  </th>
                  <th className="px-4 py-2">Ana Denetim</th>
                  <th className="px-4 py-2">
                    <button type="button" onClick={() => toggleSort("detected_date")} className="uppercase hover:underline">Tespit Tarihi{sortMark("detected_date")}</button>
                  </th>
                  <th className="px-4 py-2">
                    <button type="button" onClick={() => toggleSort("location_name")} className="uppercase hover:underline">Lokasyon{sortMark("location_name")}</button>
                  </th>
                  <th className="px-4 py-2">Tip</th>
                  <th className="px-4 py-2">
                    <button type="button" onClick={() => toggleSort("status")} className="uppercase hover:underline">Durum{sortMark("status")}</button>
                  </th>
                  <th className="px-4 py-2">Faaliyet</th>
                  <th className="px-4 py-2">
                    <button type="button" onClick={() => toggleSort("due_date")} className="uppercase hover:underline">Termin{sortMark("due_date")}</button>
                  </th>
                  <th className="px-4 py-2">Sorumlu</th>
                  <th className="px-4 py-2">Denetçi</th>
                  <th className="px-4 py-2">Foto (Önce)</th>
                  <th className="px-4 py-2">Foto (Sonra)</th>
                  {canDeleteFinding && <th className="px-4 py-2">Sil</th>}
                </tr>
              </thead>

              <tbody>
                {/*
                  While the list is on its way the table used to render nothing
                  at all: `rows.length === 0 && !loading` is false during the
                  fetch, so the body was empty and the screen read as "there are
                  no findings" until the answer arrived (§8.1).
                */}
                {loading &&
                  rows.length === 0 &&
                  Array.from({ length: 6 }, (_, r) => (
                    <tr key={`skeleton-${r}`} className="border-b border-slate-100 dark:border-slate-800/60">
                      {Array.from({ length: canDeleteFinding ? 13 : 12 }, (_, c) => (
                        <td key={`skeleton-${r}-${c}`} className="px-4 py-3">
                          <Skeleton shape="text" className="h-3 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))}

                {rows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={canDeleteFinding ? 13 : 12} className="px-4">
                      <EmptyState
                        icon={ClipboardCheck}
                        title="Gösterilecek bulgu yok"
                        description="Seçili filtrelere uyan bir bulgu bulunmuyor. Filtreleri genişletmeyi deneyin ya da denetim yapıldıkça bulgular burada toplanır."
                      />
                    </td>
                  </tr>
                )}

                {rows.map(({ f, before, after, duplicateCount }) => {
                  const beforeCount = before.length;
                  const afterCount = after.length;

                  const isBeforeOpen = expanded.kind === "before" && expanded.findingId === f.id;
                  const isAfterOpen = expanded.kind === "after" && expanded.findingId === f.id;

                  const beforeSingleUrl = beforeCount === 1 ? resolvePhotoUrl(before[0]!) : null;
                  const afterSingleUrl = afterCount === 1 ? resolvePhotoUrl(after[0]!) : null;

                  const canClose = hasAfterPhoto(f);
                  // A closed finding is reopened only by Merkez Ekip / Super Admin / godmin.
                  const reopenLocked = f.status === "closed" && !canReopenFinding;

                  return (
                    <tr
                      key={f.id}
                      className="border-t border-slate-300 dark:border-slate-800/80 hover:bg-slate-50 hover:dark:bg-slate-900/80 align-top"
                    >
                      <td className="px-4 py-2 text-[11px] text-slate-600 dark:text-slate-400">{f.finding_no ?? "-"}</td>
                      <td className="px-4 py-2 text-[11px]">
                        {f.form_title === "Tekil Bulgu" ? (
                          <span className="inline-flex rounded border border-amber-600/50 bg-amber-100 dark:bg-amber-950/30 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">
                            Tekil Bulgu
                          </span>
                        ) : (
                          <span className="block max-w-[200px] truncate" title={f.form_title ?? ""}>
                            {f.form_title || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-[11px]">{formatDate(f.detected_date)}</td>

                      <td className="px-4 py-2 text-xs">
                        <div className="max-w-[180px] truncate">{f.location_name}</div>
                      </td>

                      <td className="px-4 py-2 text-[11px] text-sky-700 dark:text-sky-300">
                        {f.finding_type}
                        {duplicateCount > 0 && (
                          <span
                            className="ml-1 inline-flex items-center rounded-sm bg-amber-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
                            title="Aynı soru ve lokasyon için tekrar eden açık bulgular tekilleştirildi"
                          >
                            +{duplicateCount} tekrar
                          </span>
                        )}
                      </td>

                      {/* Durum */}
                      {/*
                        min-w: the select is w-full, and with no floor the auto
                        table layout squeezed this column to 51px — narrower
                        than its own longest option ("Devam ediyor" needs 103),
                        so the control rendered as "De". The floor is the widest
                        option plus the chevron.
                      */}
                      <td className="px-4 py-2 min-w-[9.5rem] align-top">
                        <div className="flex flex-col gap-1">
                          <select
                            value={f.status || "open"}
                            onChange={(e) => handleStatusChange(f, e.target.value)}
                            disabled={savingStatusForId === f.id || isAuditor || reopenLocked}
                            title={
                              isAuditor
                                ? "Denetçi rolüyle bulgu durumu güncellenemez."
                                : reopenLocked
                                  ? "Kapanmış bulguyu yalnızca Merkez Ekip yeniden açabilir."
                                  : !canCloseFinding
                                    ? "Bulgu kapatma işlemi yalnızca Saha Sorumlusu tarafından yapılabilir."
                                    : !canClose
                                      ? "Kapatmak için \"Sonrası Fotoğraf\" yükleyin."
                                      : undefined
                            }
                            className={`w-full truncate rounded-md px-2 py-1 text-[11px] outline-none ring-sky-500/30 focus:ring-2 ${statusBadgeClass( f.status )} ${isAuditor || reopenLocked ? "cursor-not-allowed opacity-50" : ""}`}
                          >
                            <option value="open">Açık</option>
                            <option value="in_progress">Devam ediyor</option>
                            <option value="closed" disabled={!canClose || !canCloseFinding}>
                              Kapandı
                            </option>
                          </select>

                          {!isAuditor && f.status !== "closed" && canCloseFinding && !canClose && (
                            <span className="text-[11px] leading-tight text-rose-700 dark:text-rose-300">
                              Kapatmak için "Sonrası Fotoğraf" zorunlu.
                            </span>
                          )}
                          {!isAuditor && f.status !== "closed" && !canCloseFinding && (
                            <span className="text-[11px] leading-tight text-slate-600 dark:text-slate-400">
                              Yalnızca Saha Sorumlusu kapatabilir.
                            </span>
                          )}

                          {savingStatusForId === f.id && (
                            <span className="text-[11px] leading-tight text-slate-600 dark:text-slate-400">Kaydediliyor...</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-2 text-[11px]">
                        <div className="max-w-[220px] truncate">{f.action_to_take || "-"}</div>
                      </td>

                      {/* Termin */}
                      <td className="px-4 py-2 text-[11px]">
                        <DateInput
                          value={f.due_date ? f.due_date.slice(0, 10) : ""}
                          onChange={(value) => handleDueDateChange(f, value)}
                          className="date-dark w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/70 px-3 py-2 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                        />
                        {savingDueForId === f.id && (
                          <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">Kaydediliyor...</span>
                        )}
                      </td>

                      <td className="px-4 py-2 text-[11px]">{f.responsible_name || "-"}</td>

                      <td className="px-4 py-2 text-[11px] text-slate-700 dark:text-slate-300">{f.auditor_name || "-"}</td>

                      {/* Foto (Önce) */}
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1.5 min-w-[96px]">
                          {/* Mevcut fotoğraflar */}
                          {beforeCount === 1 && (
                            <a
                              href={beforeSingleUrl ?? "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 transition-colors"
                            >
                              <Eye size={11} />
                              Görüntüle
                            </a>
                          )}
                          {beforeCount > 1 && (
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => toggleExpanded("before", f.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 transition-colors"
                              >
                                <Eye size={11} />
                                {beforeCount} Foto
                                {isBeforeOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                              </button>
                              {isBeforeOpen && (
                                <div className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-1.5 space-y-0.5">
                                  {before.map((p, idx) => {
                                    const url = resolvePhotoUrl(p);
                                    return (
                                      <div key={`${p.file_id ?? p.url ?? "x"}-${idx}`} className="flex items-center gap-1">
                                        <a
                                          href={url ?? "#"}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex flex-1 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-sky-700 dark:text-sky-300 hover:bg-slate-200 hover:dark:bg-slate-800"
                                        >
                                          <ImageIcon size={9} />
                                          Foto {idx + 1}
                                        </a>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      </td>

                      {/* Foto (Sonra) + Upload */}
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1.5 min-w-[96px]">
                          {f.status === "closed" && afterCount === 0 && (
                            <div className="rounded-lg border border-rose-500/40 bg-rose-100 dark:bg-rose-500/10 px-2 py-1 text-[11px] text-rose-700 dark:text-rose-300">
                              Sonrası foto zorunlu
                            </div>
                          )}

                          {/* Mevcut fotoğraflar */}
                          {afterCount === 1 && (
                            <a
                              href={afterSingleUrl ?? "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-100 dark:bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                            >
                              <Eye size={11} />
                              Görüntüle
                            </a>
                          )}
                          {afterCount > 1 && (
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => toggleExpanded("after", f.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-100 dark:bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                              >
                                <Eye size={11} />
                                {afterCount} Foto
                                {isAfterOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                              </button>
                              {isAfterOpen && (
                                <div className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-1.5 space-y-0.5">
                                  {after.map((p, idx) => {
                                    const url = resolvePhotoUrl(p);
                                    return (
                                      <div key={`${p.file_id ?? p.url ?? "x"}-${idx}`} className="flex items-center gap-1">
                                        <a
                                          href={url ?? "#"}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex flex-1 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300 hover:bg-slate-200 hover:dark:bg-slate-800"
                                        >
                                          <ImageIcon size={9} />
                                          Foto {idx + 1}
                                        </a>
                                        {canRemovePhotosOf(f) && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemovePhoto(f, "after", idx)}
                                            className="rounded p-0.5 text-slate-500 dark:text-slate-400 hover:text-rose-400 hover:bg-rose-100 hover:dark:bg-rose-500/10 transition-colors"
                                          >
                                            <X size={11} />
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Upload */}
                          <label
                            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${ uploadingFindingId === f.id ?"border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                : "border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:border-emerald-500/50 hover:text-emerald-700 hover:dark:text-emerald-300 hover:bg-emerald-100 hover:dark:bg-emerald-500/10"
                            }`}
                          >
                            {uploadingFindingId === f.id ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <Camera size={11} />
                            )}
                            {uploadingFindingId === f.id ? "Yükleniyor..." : "Ekle"}
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => { handleAfterPhotosSelect(f.id, e.target.files); e.currentTarget.value = ""; }}
                              disabled={uploadingFindingId === f.id}
                            />
                          </label>

                          {(afterUploadQueue[f.id]?.length ?? 0) > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                                {afterUploadQueue[f.id]!.length} seçildi
                              </span>
                              <button
                                type="button"
                                disabled={uploadingFindingId === f.id}
                                onClick={() => handleAfterPhotosUpload(f)}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition-colors"
                              >
                                <Upload size={10} />
                                Kaydet
                              </button>
                            </div>
                          )}

                          {afterCount > 0 && canRemovePhotosOf(f) && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAllAfterPhotos(f)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-600/40 bg-rose-950/20 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-950/50 transition-colors"
                              title="Tüm sonrası fotoğrafları sil"
                            >
                              <X size={10} />
                              Tümünü Sil
                            </button>
                          )}
                        </div>
                      </td>

                      {canDeleteFinding && (
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteFinding(f)}
                            disabled={deletingFindingId === f.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-600/50 bg-rose-100 dark:bg-rose-950/30 px-2.5 py-1 text-[11px] font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-300 hover:dark:bg-rose-950/60 disabled:opacity-50 transition-colors"
                            title="Bulguyu sil (Merkez Ekip)"
                          >
                            {deletingFindingId === f.id ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <Trash2 size={11} />
                            )}
                            Sil
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollableTable>

          <InfiniteScroll
            hasMore={serverList.hasMore}
            isLoadingMore={serverList.isLoadingMore}
            onLoadMore={serverList.loadMore}
            endLabel={
              findings.length > 0
                ? `${findings.length} bulgunun tamamı gösteriliyor`
                : undefined
            }
          />

        </section>
      </div>

    </div>
  );
}