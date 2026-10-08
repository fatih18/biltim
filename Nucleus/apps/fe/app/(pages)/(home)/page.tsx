"use client";

import { atUtcMidnight } from "@/app/_utils/auditDate";
import React from "react";
import { useRouter } from "next/navigation";
import { useGenericApiActions } from "@/app/_hooks/UseNucleusApi";
import { useGetUserRole } from "@/app/_hooks/user/useGetUserRole";
import { useMyScope } from "@/app/_hooks/user/useMyScope";
import { CENTRAL_ROLES, hasPrivilege } from "@/app/_utils/routeAccess";
import { confirmDialog } from "@/app/_components/Global/ConfirmDialog";

import { HomeAuditListPanel } from "./components/HomeAuditListPanel";
import { EditAuditModal, type EditableAudit } from "./components/EditAuditModal";
import { ReportsDashboard } from "@/app/_components/ReportsDashboard";
import { uid } from "../ana-veri-yonetimi/components";
import { toast } from "sonner";

/** Keys */
const PLAN_KEYS = {
  GET: "GET_FIVE_S_AUDIT_PLANS",
  UPDATE: "UPDATE_FIVE_S_AUDIT_PLAN", // <-- sende farklıysa değiştir
  DELETE: "DELETE_FIVE_S_AUDIT_PLAN",
} as const;

const LOC_KEYS = { GET: "GET_FIVE_S_LOCATIONS" } as const;
/*
 * PATCH, not UPDATE.
 *
 * `UPDATE_*` is generated as PUT, which replaces the record and therefore
 * demands every NOT NULL column — and five_s_audits has nine, including
 * department_name, which this modal has no field for. So "Tamamlanmış Denetimi
 * Düzenle" answered 400 on every save. Measured: the modal closed, no row was
 * touched, and the only trace was a console line.
 */
const AUDIT_KEYS = { GET: "GET_FIVE_S_AUDITS", UPDATE: "PATCH_FIVE_S_AUDIT" } as const;
const TEAM_KEYS = { GET: "GET_FIVE_S_AUDIT_TEAMS" } as const;
const TEAM_MEMBER_KEYS = { GET: "GET_FIVE_S_AUDIT_TEAM_MEMBERS" } as const;
const GET_USERS_KEY = "GET_USERS";
const ME_KEY = "GET_ME_V2";
function safeStart(A: any, key: string) {
  const entry = A?.[key];
  if (!entry?.start) {
    console.warn(`[Page] action not found: ${key}`);
    return null as null | ((args: any) => void);
  }
  return entry.start as (args: any) => void;
}

function extractArray(res: any): any[] {
  const candidates = [res?.response?.data, res?.data?.data, res?.data, res];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
    if (Array.isArray(c?.data)) return c.data;
  }
  return [];
}

type Dict = Record<string, unknown>;

/*
 * Three tabs, three server questions. "Onay Bekleyen" is new (#28): the
 * auditor's submission puts a plan there, and only Merkez Ekip's "Onayla"
 * moves it to "Tamamlanan".
 */
export type HomeTab = "upcoming" | "approval" | "completed";

const STATUS_BY_TAB: Record<HomeTab, Dict> = {
  upcoming: { field: "status", operator: "notIn", value: ["completed", "pending_approval"] },
  approval: { field: "status", operator: "in", value: ["pending_approval"] },
  completed: { field: "status", operator: "in", value: ["completed"] },
};

/** The conditions for one tab, or null when this person has no plans at all. */
function planFilters(tab: HomeTab, access: "all" | "none" | Dict): Dict[] | null {
  if (access === "none") return null;
  const conditions: Dict[] = [
    { field: "is_active", operator: "eq", value: true },
    { field: "location_id", operator: "isNotNull", value: true },
    STATUS_BY_TAB[tab],
  ];
  if (access !== "all") conditions.push(access);
  return conditions;
}

export type DateEditRule = {
  allowed: boolean;
  /** Whether saving uses up one of the plan's two changes. */
  spends: boolean;
  /** Changes left; null when the rule does not count them. */
  remaining: number | null;
  /** The person could move it, but the changes are used up. */
  locked?: boolean;
};

export type AuditPlanRow = {
  id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  planned_date: string;
  location_id: string;
  assigned_team_id: string;
  status: string;
  audit_id: string | null;
  date_change_count: number;
  parent_plan_id: string | null;
  date_range_start: string | null;
  date_range_end: string | null;
  quarter: string | null;
  title: string | null;
};

type AuditTeamLite = {
  id: string;
  name?: string | null;
  leaderUserId?: string | null;
  isActive: boolean;
};

function toTeamLite(row: any): AuditTeamLite {
  return {
    id: String(row?.id ?? row?._id ?? uid()),
    name: row?.name ?? null,
    leaderUserId: row?.leader_user_id ?? row?.leaderUserId ?? null,
    isActive: Boolean(row?.is_active ?? row?.isActive ?? true),
  };
}

type TeamMemberRow = {
  id: string;
  team_id: string;
  user_id: string;
  is_active: boolean;
};

function toTeamMemberLite(row: any): TeamMemberRow {
  return {
    id: String(row?.id ?? row?._id ?? uid()),
    team_id: String(row?.team_id ?? row?.teamId ?? ""),
    user_id: String(row?.user_id ?? row?.userId ?? ""),
    is_active: Boolean(row?.is_active ?? row?.isActive ?? true),
  };
}

type UserLite = { id: string; name: string; email?: string };

function toUserLite(row: any): UserLite {
  const id = String(row?.id ?? uid());
  const first = row?.profile?.first_name ?? "";
  const last = row?.profile?.last_name ?? "";
  const full = `${first} ${last}`.trim();

  return {
    id,
    name: String(full || row?.name || row?.email || "Kullanıcı"),
    email: row?.email ?? "",
  };
}

export type TeamInfo = {
  teamId: string;
  leaderName: string;
  memberNames: string[];
};

type LocationLite = {
  id: string;
  name: string;
  isActive: boolean;
  managerUserId: string | null;
  fieldManagerUserIds: string[];
};

function toLocationLite(row: any): LocationLite {
  return {
    id: String(row?.id ?? uid()),
    name: String(row?.name ?? ""),
    isActive: Boolean(row?.is_active ?? true),
    managerUserId: row?.manager_user_id ?? null,
    fieldManagerUserIds: Array.isArray(row?.field_manager_user_ids)
      ? row.field_manager_user_ids
      : [],
  };
}

export type LocInfo = {
  name: string;
  managerName: string | null;
  fieldManagerNames: string[];
};

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

export default function Page() {
  const actions = useGenericApiActions();
  const router = useRouter();

  const actionsRef = React.useRef(actions);
  React.useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  const [plans, setPlans] = React.useState<AuditPlanRow[]>([]);
  const [parentPlans, setParentPlans] = React.useState<AuditPlanRow[]>([]);
  /*
   * Which tab is showing, and what the server says each one holds.
   *
   * The tab lives here rather than inside the panel because it decides which
   * query runs. It is mirrored into a ref so `fetchAll` — which is a
   * dependency-free callback on purpose, since action objects change identity
   * on every render — can read the current value without being rebuilt.
   */
  // Kim olduğumuz, bağımlılıksız fetchAll'ın okuyabileceği yerde.
  const benRef = React.useRef<string>("");
  const [tab, setTab] = React.useState<HomeTab>("upcoming");
  const tabRef = React.useRef(tab);
  const [counts, setCounts] = React.useState<Record<HomeTab, number | null>>({
    upcoming: null,
    approval: null,
    completed: null,
  });
  /*
   * Whose plans this screen may list, decided by the server's scope answer.
   * `null` = not decided yet (nothing is fetched), `"all"` = Merkez Ekip and
   * above, otherwise the condition that narrows the query to this person.
   */
  const accessRef = React.useRef<"all" | "none" | Dict | null>(null);
  const [locations, setLocations] = React.useState<LocationLite[]>([]);
  const [teams, setTeams] = React.useState<AuditTeamLite[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMemberRow[]>([]);
  const [users, setUsers] = React.useState<UserLite[]>([]);
  // Planın gösterdiği ama sunucunun artık döndürmediği kayıtlar: silinmişler.
  // Ayrı tutuluyor ki ekran "yükleniyor"u "yok"tan ayırabilsin.
  const [missingLocIds, setMissingLocIds] = React.useState<string[]>([]);
  const [missingTeamIds, setMissingTeamIds] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  const [currentUserId, setCurrentUserId] = React.useState<string>("");

  const fetchMeOnce = React.useCallback(() => {
    const A = actionsRef.current as any;
    const startMe = safeStart(A, ME_KEY);
    if (!startMe) return;

    startMe({
      payload: {},
      onAfterHandle: (resp: any) => {
        const data = resp?.data ?? resp?.response?.data ?? resp;
        const uidVal = data?.sub ?? data?.userId ?? data?.id ?? "";
        if (uidVal) {
          benRef.current = String(uidVal);
          setCurrentUserId(String(uidVal));
        }
      },
      onErrorHandle: (e: any) => {
        console.error(`${ME_KEY} error`, e);
      },
    });
  }, []);

  const fetchAll = React.useCallback(() => {
    const A = actionsRef.current as any;

    const startPlans = safeStart(A, PLAN_KEYS.GET);
    const startLocs = safeStart(A, LOC_KEYS.GET);
    const startTeams = safeStart(A, TEAM_KEYS.GET);
    const startMembers = safeStart(A, TEAM_MEMBER_KEYS.GET);
    const startUsers = safeStart(A, GET_USERS_KEY);

    let pending = 0;
    const begin = () => {
      pending += 1;
      setLoading(true);
    };
    const end = () => {
      pending -= 1;
      if (pending <= 0) setLoading(false);
    };

    const run = (starter: any, args: any) => {
      if (!starter) return;
      begin();
      starter({
        ...args,
        onAfterHandle: (res: any) => {
          args.onAfterHandle?.(res);
          end();
        },
        onErrorHandle: (e: any) => {
          args.onErrorHandle?.(e);
          end();
        },
      });
    };

    /*
     * Five reads populate this screen. Each one used to swallow its failure
     * into console.error, so a dashboard that could not be READ looked exactly
     * like a dashboard with nothing IN it. They report through one shared
     * notice rather than five toasts, because when the backend is unreachable
     * every one of them fails at once.
     */
    let readFailed = false
    const reportReadFailure = (key: string, e: unknown) => {
      console.error(`${key} error`, e)
      if (readFailed) return
      readFailed = true
      toast.error('Ana sayfa verileri yüklenemedi. Sayfayı yenilemeyi deneyin.')
    }

    /*
     * One tab, one query.
     *
     * This used to read 500 plans and let the panel split them with .filter(),
     * so the tab counts were the counts of what had been loaded rather than of
     * what exists, and a plant with more plans than the ceiling would quietly
     * lose the oldest ones. The server can answer each tab exactly — measured
     * against the live API, `status notIn ['completed']` returns 1 and
     * `status in ['completed']` returns 6, which is what the labels show — and
     * it returns the total alongside the page.
     *
     * The same holds for WHOSE plans. An auditor or field manager used to get
     * the plant's totals on the tabs and only their own rows underneath — the
     * screen hid the rest after the server had counted them (#23). The
     * narrowing is now part of the query, so the count is of their rows.
     */
    const access = accessRef.current;
    if (access === null) return;
    const currentTab = tabRef.current;
    const filters = planFilters(currentTab, access);
    if (!filters) {
      setPlans([]);
      setCounts({ upcoming: 0, approval: 0, completed: 0 });
      setLoading(false);
      return;
    }
    run(startPlans, {
      payload: {
        page: 1,
        limit: 50,
        sort: [{ field: "planned_date", direction: currentTab === "upcoming" ? "asc" : "desc" }],
        filters,
      },
      onAfterHandle: (res: any) => {
        const arr = extractArray(res) as any[];
        const mapped = (arr ?? []).map((p: any) => ({
          ...p,
          planned_date: normalizeDateYYYYMMDD(p?.planned_date),
          parent_plan_id: p?.parent_plan_id ?? null,
          date_range_start: normalizeDateYYYYMMDD(p?.date_range_start ?? "") || null,
          date_range_end: normalizeDateYYYYMMDD(p?.date_range_end ?? "") || null,
          quarter: p?.quarter ?? null,
          title: p?.title ?? null,
        }));
        setPlans(mapped as AuditPlanRow[]);
        okuIlgili(mapped);
        const meta = (res?.pagination ?? res?.meta ?? res?.data?.meta) as
          | { totalItems?: number; total?: number }
          | undefined;
        const toplam = meta?.totalItems ?? meta?.total ?? null;
        setCounts((prev) => ({ ...prev, [currentTab]: toplam }));
      },
      onErrorHandle: (e: any) => reportReadFailure(`${PLAN_KEYS.GET}`, e),
    });

    // The other tabs' counts, without their rows — the labels have to be
    // right before anyone clicks them.
    for (const other of (Object.keys(STATUS_BY_TAB) as HomeTab[]).filter((t) => t !== currentTab)) {
      run(startPlans, {
        payload: { page: 1, limit: 1, filters: planFilters(other, access) },
        onAfterHandle: (res: any) => {
          const meta = (res?.pagination ?? res?.meta ?? res?.data?.meta) as
            | { totalItems?: number; total?: number }
            | undefined;
          const toplam = meta?.totalItems ?? meta?.total ?? null;
          setCounts((prev) => ({ ...prev, [other]: toplam }));
        },
        onErrorHandle: () => {},
      });
    }

    /*
     * The supporting rows, asked for by id.
     *
     * These four reads used to pull the tables whole — 200 locations, 1000
     * teams, 5000 team members and 2000 users on every visit, roughly 8 700
     * rows to render a page that shows at most fifty — and every one of those
     * ceilings was a limit nobody would notice passing: the 5001st membership
     * simply would not exist as far as this screen was concerned.
     *
     * Now each is narrowed to what the plans on screen actually reference,
     * plus the current user's own memberships, which is what decides whose
     * plans they may see.
     */
    /*
     * Kişiler birleştirilerek tutuluyor, değiştirilmeyerek değil: ekip
     * liderleri ile lokasyon müdürleri iki ayrı okumadan geliyor ve biri
     * ötekini silmemeli.
     */
    const kisileriOku = (ids: unknown[]) => {
      const uniq = [...new Set(ids.filter(Boolean).map(String))];
      if (uniq.length === 0) return;
      run(startUsers, {
        payload: { page: 1, limit: 200, filters: { id: uniq } },
        onAfterHandle: (u: any) => {
          const gelen = extractArray(u).map(toUserLite);
          setUsers((prev) => {
            const byId = new Map(prev.map((x) => [x.id, x]));
            for (const x of gelen) byId.set(x.id, x);
            return [...byId.values()];
          });
        },
        onErrorHandle: (e: any) => reportReadFailure(`${GET_USERS_KEY}`, e),
      });
    };

    const okuIlgili = (planRows: any[]) => {
      const lokIds = [...new Set(planRows.map((p) => p?.location_id).filter(Boolean).map(String))];

      /*
       * Dönem planları. "Dönem" sütunu üst planın çeyreğini ve aralığını
       * gösteriyor, ama liste yalnız lokasyonlu (alt) planları okuduğu için üst
       * planlar hiç yüklenmiyordu ve sütun her satırda "—" kalıyordu.
       */
      const ustIds = [...new Set(planRows.map((p) => p?.parent_plan_id).filter(Boolean).map(String))];
      if (ustIds.length > 0) {
        run(startPlans, {
          payload: { page: 1, limit: 200, filters: [{ field: "id", operator: "in", value: ustIds }] },
          onAfterHandle: (res: any) => {
            setParentPlans(
              extractArray(res).map((p: any) => ({
                ...p,
                planned_date: normalizeDateYYYYMMDD(p?.planned_date ?? ""),
                date_range_start: normalizeDateYYYYMMDD(p?.date_range_start ?? "") || null,
                date_range_end: normalizeDateYYYYMMDD(p?.date_range_end ?? "") || null,
                quarter: p?.quarter ?? null,
                title: p?.title ?? null,
              })) as AuditPlanRow[]
            );
          },
          onErrorHandle: (e: any) => reportReadFailure(`${PLAN_KEYS.GET}`, e),
        });
      } else {
        setParentPlans([]);
      }
      const ekipIds = [
        ...new Set(planRows.map((p) => p?.assigned_team_id).filter(Boolean).map(String)),
      ];

      /*
       * Lokasyonlar ve onların müdür / saha sorumluları.
       *
       * Müdür adları önceden hiç okunmuyordu: kişi okuması yalnız ekip
       * liderlerini ve üyeleri istiyordu, "MÜDÜR / SAHA SOR." sütunu bu
       * yüzden her satırda "—" kalıyordu.
       */
      if (lokIds.length > 0) {
        run(startLocs, {
          payload: { page: 1, limit: 200, filters: { id: lokIds } },
          onAfterHandle: (res: any) => {
            const lokasyonlar = extractArray(res).map(toLocationLite);
            setLocations(lokasyonlar);
            const gelen = new Set(lokasyonlar.map((l) => l.id));
            setMissingLocIds(lokIds.filter((id) => !gelen.has(id)));
            kisileriOku(lokasyonlar.flatMap((l) => [l.managerUserId, ...l.fieldManagerUserIds]));
          },
          onErrorHandle: (e: any) => reportReadFailure(`${LOC_KEYS.GET}`, e),
        });
      } else {
        setLocations([]);
        setMissingLocIds([]);
      }

      /*
       * Ekipler: ekrandakiler ve bu kişinin lideri/üyesi olduklarını —
       * hangi planları görebileceğine onlar karar veriyor.
       *
       * İkisi TEK okumada (team_id IN … VEYA user_id = ben). Önceden kişi
       * belliyse yalnız kendi üyelikleri okunuyordu ve bu, ekrandaki
       * ekiplerin üyelerinin yerine geçiyordu: "Üyeler" açılır kutusu yalnız
       * lideri gösteriyordu.
       */
      const ben = benRef.current;
      const uyeFiltresi =
        ekipIds.length > 0 && ben
          ? [
              {
                operator: "or",
                value: [
                  { field: "team_id", operator: "in", value: ekipIds },
                  { field: "user_id", operator: "eq", value: ben },
                ],
              },
            ]
          : ekipIds.length > 0
            ? { team_id: ekipIds }
            : ben
              ? { user_id: ben }
              : null;

      if (!uyeFiltresi) {
        setTeamMembers([]);
        setTeams([]);
        setMissingTeamIds([]);
        return;
      }

      run(startMembers, {
        payload: { page: 1, limit: 200, filters: uyeFiltresi },
        onAfterHandle: (res: any) => {
          const uyeler = extractArray(res).map(toTeamMemberLite);
          setTeamMembers(uyeler);
          const hepsi = [
            ...new Set([...ekipIds, ...uyeler.map((m: any) => String(m.team_id))].filter(Boolean)),
          ];
          if (hepsi.length === 0) {
            setTeams([]);
            setMissingTeamIds([]);
            return;
          }
          run(startTeams, {
            payload: { page: 1, limit: 200, filters: { id: hepsi } },
            onAfterHandle: (r: any) => {
              const ekipler = extractArray(r).map(toTeamLite);
              setTeams(ekipler);
              const gelen = new Set(ekipler.map((t) => t.id));
              setMissingTeamIds(ekipIds.filter((id) => !gelen.has(id)));
              kisileriOku([
                ...ekipler.map((t: any) => t.leaderUserId),
                ...uyeler.map((m: any) => m.user_id),
                benRef.current,
              ]);
            },
            onErrorHandle: (e: any) => reportReadFailure(`${TEAM_KEYS.GET}`, e),
          });
        },
        onErrorHandle: (e: any) => reportReadFailure(`${TEAM_MEMBER_KEYS.GET}`, e),
      });
    };

    if (!startPlans && !startLocs && !startTeams && !startMembers && !startUsers) {
      setLoading(false);
    }
  }, []);

  // Madde 6: Denetçi / Saha Sorumlusu ana sayfada sadece kendi denetimlerini görsün
  const { roleName, roles, isGod, isLoading: isRoleLoading } = useGetUserRole();
  const { scope, failed: scopeFailed } = useMyScope();

  const roleNames = React.useMemo(
    () => [roleName ?? "", ...(roles ?? []).map((r: any) => r?.name ?? "")].filter(Boolean),
    [roleName, roles]
  );
  // The godmin is included through `isGod`: left out, it saw the audit list and
  // nothing else — no report summary — on an otherwise empty home screen.
  const isPrivilegedUser = React.useMemo(
    () => hasPrivilege(roleNames, CENTRAL_ROLES, isGod),
    [roleNames, isGod]
  );

  /*
   * Decide whose plans to ask for, then ask. Merkez Ekip and above see every
   * plan; anyone else sees the plans of their teams and of the locations they
   * answer for — the same rule the screen applied after loading, now applied
   * by the server so the counts agree with the rows.
   */
  React.useEffect(() => {
    if (isRoleLoading) return;
    if (isPrivilegedUser) {
      accessRef.current = "all";
    } else if (scope) {
      const branches: Dict[] = [];
      if (scope.teamIds.length > 0)
        branches.push({ field: "assigned_team_id", operator: "in", value: scope.teamIds });
      if (scope.locationIds.length > 0)
        branches.push({ field: "location_id", operator: "in", value: scope.locationIds });
      accessRef.current = branches.length === 0 ? "none" : { operator: "or", value: branches };
    } else if (scopeFailed) {
      accessRef.current = "none";
      toast.error("Size atanan denetimler okunamadı. Sayfayı yenilemeyi deneyin.");
    } else {
      return;
    }
    fetchAll();
  }, [isRoleLoading, isPrivilegedUser, scope, scopeFailed, fetchAll]);

  // Switching tabs re-runs the query rather than re-slicing what is in memory.
  const firstTabRun = React.useRef(true);
  React.useEffect(() => {
    tabRef.current = tab;
    if (firstTabRun.current) {
      firstTabRun.current = false;
      return;
    }
    fetchAll();
  }, [tab, fetchAll]);

  React.useEffect(() => {
    fetchMeOnce();
  }, [fetchMeOnce]);

  const parentPlanRangeById = React.useMemo((): Map<string, { start: string; end: string; quarter: string | null; title: string | null }> => {
    const map = new Map<string, { start: string; end: string; quarter: string | null; title: string | null }>();
    for (const p of [...plans, ...parentPlans]) {
      if (p.date_range_start && p.date_range_end) {
        map.set(p.id, {
          start: p.date_range_start,
          end: p.date_range_end,
          quarter: p.quarter ?? null,
          title: p.title ?? null,
        });
      }
    }
    return map;
  }, [plans, parentPlans]);

  const locInfoById = React.useMemo((): Map<string, LocInfo> => {
    const userNameById = new Map(users.map((u) => [u.id, u.name]));
    const map = new Map<string, LocInfo>();
    for (const loc of locations) {
      // Pasif lokasyon atlanmıyor: plan hâlâ ona bağlı, ad görünmeli.
      map.set(loc.id, {
        name: loc.isActive ? loc.name : `${loc.name} (pasif)`,
        managerName: loc.managerUserId
          ? (userNameById.get(loc.managerUserId) ?? null)
          : null,
        fieldManagerNames: loc.fieldManagerUserIds
          .map((id) => userNameById.get(id))
          .filter((n): n is string => !!n),
      });
    }
    for (const id of missingLocIds) {
      if (!map.has(id)) map.set(id, { name: "Silinmiş lokasyon", managerName: null, fieldManagerNames: [] });
    }
    return map;
  }, [locations, users, missingLocIds]);

  const teamInfoById = React.useMemo(() => {
    const userName = new Map(users.map((u) => [u.id, u.name || u.email || "Kullanıcı"]));

    const membersByTeam = new Map<string, string[]>();
    for (const m of teamMembers) {
      if (!m.is_active) continue;
      if (!m.team_id) continue;
      const arr = membersByTeam.get(m.team_id) ?? [];
      arr.push(userName.get(m.user_id) ?? m.user_id);
      membersByTeam.set(m.team_id, arr);
    }

    const map = new Map<string, TeamInfo>();
    for (const t of teams) {
      const leaderName =
        (t.leaderUserId ? userName.get(String(t.leaderUserId)) : undefined) ||
        (t.name ? String(t.name) : "Ekip");

      let memberNames = membersByTeam.get(t.id) ?? [];

      if (leaderName && !memberNames.includes(leaderName)) {
        memberNames = [leaderName, ...memberNames];
      }

      map.set(t.id, { teamId: t.id, leaderName, memberNames });
    }
    for (const id of missingTeamIds) {
      if (!map.has(id)) map.set(id, { teamId: id, leaderName: "Silinmiş ekip", memberNames: [] });
    }
    return map;
  }, [users, teamMembers, teams, missingTeamIds]);

  /*
   * Nobody audits the place they are responsible for (#27). Someone who is an
   * auditor on one team and the field manager of this location used to get
   * "Denetimi Başlat" on it; the server now refuses that audit too.
   */
  const canStartPlan = React.useCallback(
    (plan: AuditPlanRow) => {
      if (plan.status !== "planned") return false;
      if (isPrivilegedUser) return true;
      return !(scope?.fieldManagerLocationIds ?? []).includes(String(plan.location_id));
    },
    [isPrivilegedUser, scope]
  );

  // Madde 7: Ana sayfadan denetim başlatma
  const startAudit = React.useCallback(
    (planId: string) => {
      router.push(`/denetim?planId=${encodeURIComponent(planId)}`);
    },
    [router]
  );

  /*
   * Merkez Ekip approves what the auditor sent (#28). Until then the plan sits
   * in "Onay Bekleyen"; approving moves it to "Tamamlanan". The server refuses
   * this for anyone else.
   */
  const [approvingId, setApprovingId] = React.useState<string | null>(null);
  const approvePlan = React.useCallback(
    (plan: AuditPlanRow) => {
      const startUpdate = safeStart(actionsRef.current as any, PLAN_KEYS.UPDATE);
      if (!startUpdate) return;
      setApprovingId(plan.id);
      startUpdate({
        payload: { _id: plan.id, status: "completed" },
        onAfterHandle: () => {
          setApprovingId(null);
          toast.success("Denetim onaylandı.");
          fetchAll();
        },
        onErrorHandle: (e: any) => {
          setApprovingId(null);
          const sunucu = (Array.isArray(e) ? e[0]?.message : e?.message) ?? null;
          toast.error(sunucu ? `Onaylanamadı: ${sunucu}` : "Denetim onaylanamadı.");
        },
      });
    },
    [fetchAll]
  );

  /*
   * Merkez Ekip can delete a plan from here (#19), including one whose
   * location or team has since been deleted — those could not be reached
   * from the planner, which lists plans under the location they belong to.
   */
  const deletePlan = React.useCallback(
    async (plan: AuditPlanRow) => {
      const ok = await confirmDialog({
        title: "Denetim planı silinsin mi?",
        message:
          plan.status === "planned"
            ? "Plan kalıcı olarak silinir."
            : "Bu plan için yapılmış denetim kaydı ve bulguları silinmez; yalnız plan satırı kaldırılır.",
        confirmLabel: "Sil",
        cancelLabel: "Vazgeç",
        tone: "danger",
      });
      if (!ok) return;
      const del = safeStart(actionsRef.current as any, PLAN_KEYS.DELETE);
      if (!del) return;
      del({
        payload: { _id: plan.id },
        onAfterHandle: () => {
          toast.success("Plan silindi.");
          fetchAll();
        },
        onErrorHandle: (e: any) => {
          const sunucu = (Array.isArray(e) ? e[0]?.message : e?.message) ?? null;
          toast.error(sunucu ? `Plan silinemedi: ${sunucu}` : "Plan silinemedi.");
        },
      });
    },
    [fetchAll]
  );

  /*
   * Madde 8 / #12: Merkez Ekip corrects a carried-out audit on the same
   * question-and-answer screen the auditor used (Foto 7), not only its five
   * totals. The score modal below stays for a quick total correction.
   */
  const openAuditAnswersEdit = React.useCallback(
    (plan: AuditPlanRow) => {
      if (!plan.audit_id) return;
      router.push(
        `/denetim?editAuditId=${encodeURIComponent(plan.audit_id)}&planId=${encodeURIComponent(plan.id)}`
      );
    },
    [router]
  );

  // Madde 8: Tamamlanmış denetimi Merkez Ekip güncelleyebilsin
  const [editingAudit, setEditingAudit] = React.useState<EditableAudit | null>(null);
  const [auditSaving, setAuditSaving] = React.useState(false);

  const openAuditEdit = React.useCallback((plan: AuditPlanRow) => {
    if (!plan.audit_id) return;
    const A = actionsRef.current as any;
    const startGet = safeStart(A, AUDIT_KEYS.GET);
    if (!startGet) return;

    startGet({
      payload: { page: 1, limit: 1, filters: { id: plan.audit_id } },
      onAfterHandle: (res: any) => {
        const arr = extractArray(res);
        const a = arr?.[0];
        if (!a) {
          toast.error("Denetim kaydı bulunamadı.");
          return;
        }
        setEditingAudit({
          id: String(a.id),
          department_name: String(a.department_name ?? ""),
          auditor_name: String(a.auditor_name ?? ""),
          audit_date: normalizeDateYYYYMMDD(String(a.audit_date ?? "")),
          total_score: String(a.total_score ?? "0"),
          target_score: String(a.target_score ?? "75"),
          score_s1: String(a.score_s1 ?? "0"),
          score_s2: String(a.score_s2 ?? "0"),
          score_s3: String(a.score_s3 ?? "0"),
          score_s4: String(a.score_s4 ?? "0"),
          score_s5: String(a.score_s5 ?? "0"),
        });
      },
      onErrorHandle: (e: any) => {
        console.error(`${AUDIT_KEYS.GET} error`, e);
        toast.error("Denetim kaydı yüklenemedi.");
      },
    });
  }, []);

  const saveAuditEdit = React.useCallback((next: EditableAudit) => {
    const A = actionsRef.current as any;
    const startUpdate = safeStart(A, AUDIT_KEYS.UPDATE);
    if (!startUpdate) return;

    /*
     * The fields already say max="100" and the browser marks 150 invalid — but
     * the form submitted anyway, and the audit was stored with a score of 150
     * out of 100. Every figure the customer reads comes off these columns, so
     * the check happens before the request, and the server refuses it too.
     */
    const puanlar: Array<[string, unknown]> = [
      ["Toplam Puan", next.total_score],
      ["S1 Puanı", next.score_s1],
      ["S2 Puanı", next.score_s2],
      ["S3 Puanı", next.score_s3],
      ["S4 Puanı", next.score_s4],
      ["S5 Puanı", next.score_s5],
    ];
    for (const [ad, ham] of puanlar) {
      const n = Number(ham);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        toast.error(`${ad} 0 ile 100 arasında olmalıdır.`);
        return;
      }
    }

    setAuditSaving(true);
    startUpdate({
      payload: {
        _id: next.id,
        auditor_name: next.auditor_name.trim(),
        // Local midnight is read in the browser's zone, which in Turkey files
        // the audit on the previous day.
        audit_date: atUtcMidnight(next.audit_date),
        total_score: Number(next.total_score).toFixed(2),
        score_s1: Number(next.score_s1).toFixed(2),
        score_s2: Number(next.score_s2).toFixed(2),
        score_s3: Number(next.score_s3).toFixed(2),
        score_s4: Number(next.score_s4).toFixed(2),
        score_s5: Number(next.score_s5).toFixed(2),
      },
      onAfterHandle: () => {
        setAuditSaving(false);
        setEditingAudit(null);
        toast.success("Denetim kaydı güncellendi.");
      },
      onErrorHandle: (e: any) => {
        console.error(`${AUDIT_KEYS.UPDATE} error`, e);
        setAuditSaving(false);
        /*
         * Say what the server said. The message used to blame permissions
         * unconditionally ("sadece Merkez Ekip"), which sent whoever read it
         * looking for a role problem while the actual answer was a rejected
         * field.
         */
        const sunucu =
          (Array.isArray(e) ? e[0]?.message : e?.message) ?? null;
        toast.error(
          sunucu
            ? `Denetim güncellenemedi: ${sunucu}`
            : "Denetim güncellenemedi. Yetkiniz olmayabilir (Merkez Ekip)."
        );
      },
    });
  }, []);

  const MAX_DATE_CHANGES = 2;

  /*
   * Who may move a plan's date, and whether doing so spends one of its two
   * changes. The server applies the same rule (businessRules.ts).
   *
   *  - planned: the team leader, or Merkez Ekip, while changes remain;
   *  - done (sent or approved): Merkez Ekip only, as a correction that does
   *    not spend a change (#16) — the leader could rewrite the date of an
   *    audit that had already been carried out;
   *  - the godmin: any plan, any number of times, nothing spent (#32).
   */
  const dateEditRule = React.useCallback(
    (plan: AuditPlanRow): DateEditRule => {
      const used = plan.date_change_count ?? 0;
      const left = Math.max(0, MAX_DATE_CHANGES - used);
      const done = plan.status === "completed" || plan.status === "pending_approval";
      if (isGod) return { allowed: true, spends: false, remaining: null };
      if (done) return { allowed: isPrivilegedUser, spends: false, remaining: null };
      const team = teams.find((t) => t.id === plan.assigned_team_id);
      const isLeader =
        !!currentUserId && !!team?.leaderUserId && String(team.leaderUserId) === String(currentUserId);
      if (!isLeader && !isPrivilegedUser) return { allowed: false, spends: true, remaining: left };
      return { allowed: left > 0, spends: true, remaining: left, locked: left === 0 };
    },
    [teams, currentUserId, isGod, isPrivilegedUser]
  );

  const updatePlanDate = React.useCallback((planId: string, dateYYYYMMDD: string, newCount: number) => {
    const A = actionsRef.current as any;
    const startUpdate = safeStart(A, PLAN_KEYS.UPDATE);
    if (!startUpdate) return;

    startUpdate({
      payload: {
        _id: planId,
        planned_date: dateYYYYMMDD,
        date_change_count: newCount,
      },
      onAfterHandle: (_res: any) => {
        setPlans((prev) =>
          prev.map((p) =>
            p.id === planId
              ? { ...p, planned_date: dateYYYYMMDD, date_change_count: newCount }
              : p
          )
        );
      },
      onErrorHandle: (e: any) => {
        console.error(`${PLAN_KEYS.UPDATE} error`, e);
        // The server says why (no changes left, completed audit, ...); a
        // silent failure left the old date on screen with no explanation.
        const sunucu = (Array.isArray(e) ? e[0]?.message : e?.message) ?? null;
        toast.error(sunucu ? `Tarih değiştirilemedi: ${sunucu}` : "Tarih değiştirilemedi.");
      },
    });
  }, []);

  // Aynı tarihte çakışan denetim uyarıları (ekip / ekip lideri / saha sorumlusu)
  const getDateConflicts = React.useCallback(
    (planId: string, newDate: string): string[] => {
      if (!newDate) return [];
      const plan = plans.find((p) => p.id === planId);
      if (!plan) return [];

      const teamId = plan.assigned_team_id;
      const locId = plan.location_id;
      const same = plans.filter(
        (a) =>
          a.id !== planId &&
          a.status !== "cancelled" &&
          normalizeDateYYYYMMDD(a.planned_date) === newDate
      );
      if (same.length === 0) return [];

      const userNameById = new Map(users.map((u) => [u.id, u.name]));
      const locName = (id: string) => locations.find((l) => l.id === id)?.name ?? "-";
      const warns: string[] = [];

      const selTeam = teams.find((t) => t.id === teamId);

      // 1) Aynı ekip aynı tarihte başka denetimde
      const teamConflict = same.find((a) => a.assigned_team_id === teamId);
      if (teamConflict) {
        const tName = selTeam?.name ?? teamId;
        warns.push(`"${tName}" ekibi bu tarihte "${locName(teamConflict.location_id)}" denetiminde görevli.`);
      }

      // 2) Aynı ekip lideri farklı bir ekibin denetiminde
      const leaderId = selTeam?.leaderUserId;
      if (leaderId) {
        const leaderConflict = same.find(
          (a) =>
            a.assigned_team_id !== teamId &&
            String(teams.find((t) => t.id === a.assigned_team_id)?.leaderUserId ?? "") === String(leaderId)
        );
        if (leaderConflict) {
          const leaderName = userNameById.get(String(leaderId)) ?? String(leaderId);
          const cTeam = teams.find((t) => t.id === leaderConflict.assigned_team_id)?.name ?? "-";
          warns.push(`Ekip lideri (${leaderName}) bu tarihte "${locName(leaderConflict.location_id)}" denetiminde (${cTeam}) görevli.`);
        }
      }

      // 3) Aynı denetçi (ekip üyesi) bu tarihte başka bir ekibin denetiminde (#26)
      const kadro = (id: string) => {
        const lead = teams.find((t) => t.id === id)?.leaderUserId;
        return new Set(
          [lead, ...teamMembers.filter((m) => m.is_active && m.team_id === id).map((m) => m.user_id)]
            .filter(Boolean)
            .map(String)
        );
      };
      const benimKadro = kadro(teamId);
      for (const a of same) {
        if (a.assigned_team_id === teamId) continue;
        const ortak = [...kadro(a.assigned_team_id)].filter(
          (id) => benimKadro.has(id) && id !== String(leaderId ?? "")
        );
        if (ortak.length > 0) {
          const names = ortak.map((id) => userNameById.get(id) ?? id).join(", ");
          warns.push(`Denetçi (${names}) bu tarihte "${locName(a.location_id)}" denetiminde de görevli.`);
        }
      }

      // 4) Saha sorumlusu başka bir lokasyonun denetiminde
      const selFM = locations.find((l) => l.id === locId)?.fieldManagerUserIds ?? [];
      if (selFM.length > 0) {
        for (const a of same) {
          if (a.location_id === locId) continue;
          const pLoc = locations.find((l) => l.id === a.location_id);
          const pFM = pLoc?.fieldManagerUserIds ?? [];
          const overlap = selFM.filter((id) => pFM.includes(id));
          if (overlap.length > 0) {
            const names = overlap.map((uid) => userNameById.get(uid) ?? uid).join(", ");
            warns.push(`Saha sorumlusu (${names}) bu tarihte "${pLoc?.name ?? "-"}" denetiminde görevli.`);
          }
        }
      }

      return warns;
    },
    [plans, teams, teamMembers, locations, users]
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <HomeAuditListPanel
          plans={plans}
          onStartAudit={startAudit}
          canStartPlan={canStartPlan}
          onApprovePlan={isPrivilegedUser ? approvePlan : undefined}
          approvingId={approvingId}
          onDeletePlan={isPrivilegedUser ? deletePlan : undefined}
          currentUserId={currentUserId}
          locInfoById={locInfoById}
          parentPlanRangeById={parentPlanRangeById}
          teams={teams.filter((t) => t.isActive)}
          teamInfoById={teamInfoById}
          loading={loading}
          onRefresh={fetchAll}

          dateEditRule={dateEditRule}
          onUpdatePlanDate={updatePlanDate}
          getDateConflicts={getDateConflicts}
          onEditCompletedAudit={isPrivilegedUser ? openAuditAnswersEdit : undefined}
          onEditScores={isPrivilegedUser ? openAuditEdit : undefined}
          tab={tab}
          onTabChange={setTab}
          counts={counts}
        />

        {isPrivilegedUser && (
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">5S Rapor Özeti</h2>
              <a href="/raporlar" className="text-xs text-sky-700 dark:text-sky-300 hover:text-sky-700 hover:dark:text-sky-200 underline">
                Tüm raporlar →
              </a>
            </div>
            <ReportsDashboard compact />
          </section>
        )}
      </div>

      {editingAudit && (
        <EditAuditModal
          audit={editingAudit}
          saving={auditSaving}
          onSave={saveAuditEdit}
          onClose={() => setEditingAudit(null)}
        />
      )}
    </div>
  );
}
