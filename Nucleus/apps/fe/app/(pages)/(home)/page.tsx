"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useGenericApiActions } from "@/app/_hooks/UseNucleusApi";
import { useGetUserRole } from "@/app/_hooks/user/useGetUserRole";

import { HomeAuditListPanel } from "./components/HomeAuditListPanel";
import { EditAuditModal, type EditableAudit } from "./components/EditAuditModal";
import { ReportsDashboard } from "@/app/_components/ReportsDashboard";
import { uid } from "../ana-veri-yonetimi/components";

/** Keys */
const PLAN_KEYS = {
  GET: "GET_FIVE_S_AUDIT_PLANS",
  UPDATE: "UPDATE_FIVE_S_AUDIT_PLAN", // <-- sende farklıysa değiştir
} as const;

const LOC_KEYS = { GET: "GET_FIVE_S_LOCATIONS" } as const;
const AUDIT_KEYS = { GET: "GET_FIVE_S_AUDITS", UPDATE: "UPDATE_FIVE_S_AUDIT" } as const;
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
  const [locations, setLocations] = React.useState<LocationLite[]>([]);
  const [teams, setTeams] = React.useState<AuditTeamLite[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMemberRow[]>([]);
  const [users, setUsers] = React.useState<UserLite[]>([]);
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
        if (uidVal) setCurrentUserId(String(uidVal));
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

    run(startPlans, {
      payload: {
        page: 1,
        limit: 500,
        orderBy: "planned_date",
        orderDirection: "desc",
        filters: { is_active: true },
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
      },
      onErrorHandle: (e: any) => console.error(`${PLAN_KEYS.GET} error`, e),
    });

    run(startLocs, {
      payload: { page: 1, limit: 200, orderBy: "created_at", orderDirection: "desc" },
      onAfterHandle: (res: any) => setLocations(extractArray(res).map(toLocationLite)),
      onErrorHandle: (e: any) => console.error(`${LOC_KEYS.GET} error`, e),
    });

    run(startTeams, {
      payload: { page: 1, limit: 1000, orderBy: "created_at", orderDirection: "desc" },
      onAfterHandle: (res: any) => setTeams(extractArray(res).map(toTeamLite)),
      onErrorHandle: (e: any) => console.error(`${TEAM_KEYS.GET} error`, e),
    });

    run(startMembers, {
      payload: { page: 1, limit: 5000, orderBy: "created_at", orderDirection: "desc" },
      onAfterHandle: (res: any) => setTeamMembers(extractArray(res).map(toTeamMemberLite)),
      onErrorHandle: (e: any) => console.error(`${TEAM_MEMBER_KEYS.GET} error`, e),
    });

    run(startUsers, {
      payload: { page: 1, limit: 2000 },
      onAfterHandle: (res: any) => setUsers(extractArray(res).map(toUserLite)),
      onErrorHandle: (e: any) => console.error(`${GET_USERS_KEY} error`, e),
    });

    if (!startPlans && !startLocs && !startTeams && !startMembers && !startUsers) {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchMeOnce();
    fetchAll();
  }, [fetchAll, fetchMeOnce]);

  const parentPlanRangeById = React.useMemo((): Map<string, { start: string; end: string; quarter: string | null; title: string | null }> => {
    const map = new Map<string, { start: string; end: string; quarter: string | null; title: string | null }>();
    for (const p of plans) {
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
  }, [plans]);

  const locInfoById = React.useMemo((): Map<string, LocInfo> => {
    const userNameById = new Map(users.map((u) => [u.id, u.name]));
    const map = new Map<string, LocInfo>();
    for (const loc of locations) {
      if (!loc.isActive) continue;
      map.set(loc.id, {
        name: loc.name,
        managerName: loc.managerUserId
          ? (userNameById.get(loc.managerUserId) ?? null)
          : null,
        fieldManagerNames: loc.fieldManagerUserIds
          .map((id) => userNameById.get(id))
          .filter((n): n is string => !!n),
      });
    }
    return map;
  }, [locations, users]);

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
    return map;
  }, [users, teamMembers, teams]);

  // Madde 6: Denetçi / Saha Sorumlusu ana sayfada sadece kendi denetimlerini görsün
  const { roleName, roles, isLoading: isRoleLoading } = useGetUserRole();

  const isPrivilegedUser = React.useMemo(() => {
    const names = [roleName ?? "", ...(roles ?? []).map((r: any) => r?.name ?? "")]
      .filter(Boolean)
      .map((x) => String(x).trim().toLowerCase().replace(/\s+/g, " "));
    return names.some(
      (n) =>
        n === "super admin" ||
        n === "manager" ||
        (n.includes("content manager") && n.includes("core team"))
    );
  }, [roleName, roles]);

  const visiblePlans = React.useMemo(() => {
    if (isRoleLoading) return [];
    if (isPrivilegedUser) return plans;
    if (!currentUserId) return plans;

    // Kullanıcının dahil olduğu ekipler (üye veya lider)
    const myTeamIds = new Set<string>();
    for (const m of teamMembers) {
      if (m.is_active && String(m.user_id) === String(currentUserId)) myTeamIds.add(m.team_id);
    }
    for (const t of teams) {
      if (t.leaderUserId && String(t.leaderUserId) === String(currentUserId)) myTeamIds.add(t.id);
    }

    // Kullanıcının sorumlu olduğu lokasyonlar (müdür veya saha sorumlusu)
    const myLocationIds = new Set<string>();
    for (const l of locations) {
      if (
        (l.managerUserId && String(l.managerUserId) === String(currentUserId)) ||
        l.fieldManagerUserIds.some((id) => String(id) === String(currentUserId))
      ) {
        myLocationIds.add(l.id);
      }
    }

    return plans.filter(
      (p) =>
        !p.location_id || // ana planlar (quarter) görünür kalsın (dönem bilgisi için)
        myTeamIds.has(p.assigned_team_id) ||
        myLocationIds.has(p.location_id)
    );
  }, [plans, teams, teamMembers, locations, currentUserId, isPrivilegedUser, isRoleLoading]);

  // Madde 7: Ana sayfadan denetim başlatma
  const startAudit = React.useCallback(
    (planId: string) => {
      router.push(`/denetim?planId=${encodeURIComponent(planId)}`);
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
          alert("Denetim kaydı bulunamadı.");
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
        alert("Denetim kaydı yüklenemedi.");
      },
    });
  }, []);

  const saveAuditEdit = React.useCallback((next: EditableAudit) => {
    const A = actionsRef.current as any;
    const startUpdate = safeStart(A, AUDIT_KEYS.UPDATE);
    if (!startUpdate) return;

    setAuditSaving(true);
    startUpdate({
      payload: {
        _id: next.id,
        auditor_name: next.auditor_name.trim(),
        audit_date: new Date(`${next.audit_date}T00:00:00`),
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
        alert("Denetim kaydı güncellendi.");
      },
      onErrorHandle: (e: any) => {
        console.error(`${AUDIT_KEYS.UPDATE} error`, e);
        setAuditSaving(false);
        alert("Denetim güncellenemedi. Yetkinizi kontrol edin (sadece Merkez Ekip).");
      },
    });
  }, []);

  const MAX_DATE_CHANGES = 2;

  const canEditPlan = React.useCallback(
    (plan: AuditPlanRow) => {
      if (!currentUserId) return false;
      // Sadece atanan ekibin lideri düzenleyebilir
      const team = teams.find((t) => t.id === plan.assigned_team_id);
      if (!team?.leaderUserId) return false;
      if (String(team.leaderUserId) !== String(currentUserId)) return false;
      // Maksimum 2 düzenleme hakkı
      if ((plan.date_change_count ?? 0) >= MAX_DATE_CHANGES) return false;
      return true;
    },
    [teams, currentUserId]
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

      // 3) Saha sorumlusu başka bir lokasyonun denetiminde
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
    [plans, teams, locations, users]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <HomeAuditListPanel
          plans={visiblePlans}
          onStartAudit={startAudit}
          currentUserId={currentUserId}
          locInfoById={locInfoById}
          parentPlanRangeById={parentPlanRangeById}
          teams={teams.filter((t) => t.isActive)}
          teamInfoById={teamInfoById}
          loading={loading}
          onRefresh={fetchAll}

          canEditPlan={canEditPlan}
          onUpdatePlanDate={updatePlanDate}
          getDateConflicts={getDateConflicts}
          onEditCompletedAudit={isPrivilegedUser ? openAuditEdit : undefined}
        />

        {isPrivilegedUser && (
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100">5S Rapor Özeti</h2>
              <a href="/raporlar" className="text-xs text-sky-300 hover:text-sky-200 underline">
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
