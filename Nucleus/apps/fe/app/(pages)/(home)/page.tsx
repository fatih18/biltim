"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useGenericApiActions } from "@/app/_hooks/UseGenericApiStore";

import { HomeAuditListPanel } from "./components/HomeAuditListPanel";
import { uid } from "../ana-veri-yonetimi/components";

/** Keys */
const PLAN_KEYS = {
  GET: "GET_FIVE_S_AUDIT_PLANS",
  UPDATE: "UPDATE_FIVE_S_AUDIT_PLAN", // <-- sende farklıysa değiştir
} as const;

const LOC_KEYS = { GET: "GET_FIVE_S_LOCATIONS" } as const;
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
      disableAutoRedirect: true,
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
      payload: { page: 1, limit: 500, orderBy: "planned_date", orderDirection: "desc" },
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <HomeAuditListPanel
          plans={plans}
          locInfoById={locInfoById}
          parentPlanRangeById={parentPlanRangeById}
          teams={teams.filter((t) => t.isActive)}
          teamInfoById={teamInfoById}
          loading={loading}
          onRefresh={fetchAll}

          canEditPlan={canEditPlan}
          onUpdatePlanDate={updatePlanDate}
        />
      </div>
    </div>
  );
}
