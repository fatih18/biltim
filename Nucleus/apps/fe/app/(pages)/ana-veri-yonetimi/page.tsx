"use client";

import React from "react";
import {
    AuditPlannerPanel,
    MasterDataPanel,
    SegmentedTabs,
    nowIso,
    uid,
    type Audit,
    type MasterEntity,
    type User,
} from "./components";
import { useGenericApiActions } from "@/app/_hooks/UseGenericApiStore";
import { TeamsTab } from "./components/TeamsTab";

/** ---------------------------
 * MASTER API KEYS
 * -------------------------- */
type MasterKind = "actions" | "findingTypes" | "locations";

const API_KEYS: Record<
    MasterKind,
    { GET: string; ADD: string; UPDATE: string; DELETE: string }
> = {
    actions: {
        GET: "GET_FIVE_S_ACTIONS",
        ADD: "ADD_FIVE_S_ACTION",
        UPDATE: "UPDATE_FIVE_S_ACTION",
        DELETE: "DELETE_FIVE_S_ACTION",
    },
    findingTypes: {
        GET: "GET_FIVE_S_FINDING_TYPES",
        ADD: "ADD_FIVE_S_FINDING_TYPE",
        UPDATE: "UPDATE_FIVE_S_FINDING_TYPE",
        DELETE: "DELETE_FIVE_S_FINDING_TYPE",
    },
    locations: {
        GET: "GET_FIVE_S_LOCATIONS",
        ADD: "ADD_FIVE_S_LOCATION",
        UPDATE: "UPDATE_FIVE_S_LOCATION",
        DELETE: "DELETE_FIVE_S_LOCATION",
    },
};

/** ---------------------------
 * PLANNING API KEYS
 * -------------------------- */
const PLAN_KEYS = {
    GET: "GET_FIVE_S_AUDIT_PLANS",
    ADD: "ADD_FIVE_S_AUDIT_PLAN",
    UPDATE: "UPDATE_FIVE_S_AUDIT_PLAN",
    DELETE: "DELETE_FIVE_S_AUDIT_PLAN",
} as const;

const GET_USERS_KEY = "GET_USERS";

const TEAM_KEYS = {
    GET: "GET_FIVE_S_AUDIT_TEAMS",
} as const;

function safeStart(A: any, key: string) {
    const entry = A?.[key];
    if (!entry?.start) {
        console.warn(`[Page] action not found: ${key}`);
        return null as null | ((args: any) => void);
    }
    return entry.start as (args: any) => void;
}

/** ---------------------------
 * Helpers
 * -------------------------- */
function toMasterEntity(row: any): MasterEntity {
    const id = row?.id ?? row?._id ?? row?.data?.id;
    const name = row?.name ?? row?.title ?? "";
    const isActive = row?.is_active ?? true;
    const createdAt = row?.createdAt ?? row?.created_at ?? nowIso();

    return {
        id: String(id ?? uid()),
        name: String(name ?? ""),
        description: row?.description ?? row?.desc ?? "",
        isActive: Boolean(isActive),
        createdAt: String(createdAt),
    };
}

function extractArray(res: any): any[] {
    const candidates = [
        res?.response?.data,
        res?.data?.data,
        res?.data,
        res,
    ];

    for (const c of candidates) {
        if (Array.isArray(c)) return c;
        if (Array.isArray(c?.data)) return c.data;
    }
    return [];
}

function toUserFromGetUsersRow(row: any): User {
    const id = String(row?.id ?? uid());

    const first = row?.profile?.first_name ?? "";
    const last = row?.profile?.last_name ?? "";
    const fullName = `${first} ${last}`.trim();

    const name =
        fullName ||
        row?.name ||
        row?.full_name ||
        row?.display_name ||
        row?.email ||
        "Kullanıcı";

    return {
        id,
        name: String(name),
        email: String(row?.email ?? ""),
        roles: Array.isArray(row?.roles) ? row.roles : [],
    } as any;
}

type AuditTeamLite = {
    id: string;
    name?: string | null;
    leaderUserId?: string | null;
    isActive: boolean;
    createdAt?: string;
};

function toTeamLite(row: any): AuditTeamLite {
    return {
        id: String(row?.id ?? row?._id ?? uid()),
        name: row?.name ?? null,
        leaderUserId: row?.leader_user_id ?? row?.leaderUserId ?? null,
        isActive: Boolean(row?.is_active ?? row?.isActive ?? true),
        createdAt: String(row?.created_at ?? row?.createdAt ?? nowIso()),
    };
}

function planRowToAuditLike(row: any): Audit {
    return {
        id: String(row?.id ?? row?._id ?? uid()),
        createdAt: String(row?.created_at ?? nowIso()),
        plannedDate: row?.planned_date ?? row?.plannedDate,
        status: row?.status ?? "planned",
        locationId: row?.location_id ?? row?.locationId,

        assignedTeamId:
            row?.assigned_team_id ??
            row?.assignedTeamId ??
            row?.assigned_user_id ??
            row?.assignedUserId ??
            "",

        auditId: row?.audit_id ?? row?.auditId ?? null,
        note: row?.note ?? row?.remarks ?? undefined,
    } as any;
}

export default function Page() {
    const actions = useGenericApiActions();

    const actionsRef = React.useRef(actions);
    React.useEffect(() => {
        actionsRef.current = actions;
    }, [actions]);

    /** ---------------------------
     * TAB
     * -------------------------- */
    const [tab, setTab] = React.useState<"master" | "planning" | "teams">("master");

    /** ---------------------------
     * USERS
     * -------------------------- */
    const [users, setUsers] = React.useState<User[]>([]);
    const [usersLoading, setUsersLoading] = React.useState(false);

    const fetchUsers = React.useCallback(() => {
        const A = actionsRef.current as any;
        const start = safeStart(A, GET_USERS_KEY);
        if (!start) {
            setUsers([]);
            return;
        }

        setUsersLoading(true);

        start({
            payload: { page: 1, limit: 500 },
            onAfterHandle: (res: any) => {
                const rows = extractArray(res);
                const mapped = rows.map(toUserFromGetUsersRow);

                setUsers(mapped);
                setUsersLoading(false);
            },
            onErrorHandle: (error: any) => {
                if (error?.name === "AbortError") {
                    setUsersLoading(false);
                    return;
                }
                console.error("GET_USERS error", error);
                setUsersLoading(false);

            },
        });
    }, []);

    /** ---------------------------
     * TEAMS (planning dropdown)
     * -------------------------- */
    const [teams, setTeams] = React.useState<AuditTeamLite[]>([]);
    const [teamsLoading, setTeamsLoading] = React.useState(false);

    const fetchTeams = React.useCallback(() => {
        const A = actionsRef.current as any;
        const key = TEAM_KEYS.GET;
        const start = safeStart(A, key);
        if (!start) {
            setTeams([]);
            return;
        }

        setTeamsLoading(true);

        start({
            payload: { page: 1, limit: 1000, orderBy: "created_at", orderDirection: "desc" },
            onAfterHandle: (res: any) => {
                const rows = extractArray(res);
                const mapped = rows.map(toTeamLite);
                setTeams(mapped);
                setTeamsLoading(false);
            },
            onErrorHandle: (error: any) => {
                if (error?.name === "AbortError") {
                    setTeamsLoading(false);
                    return;
                }
                console.error(`${key} error`, error);
                setTeamsLoading(false);

            },
        });
    }, []);

    /** ---------------------------
     * MASTER LISTS
     * -------------------------- */
    const [actionsList, setActionsList] = React.useState<MasterEntity[]>([]);
    const [findingTypes, setFindingTypes] = React.useState<MasterEntity[]>([]);
    const [locations, setLocations] = React.useState<MasterEntity[]>([]);

    const [loadingMap, setLoadingMap] = React.useState<Record<MasterKind, boolean>>({
        actions: false,
        findingTypes: false,
        locations: false,
    });

    const setLoading = React.useCallback((kind: MasterKind, v: boolean) => {
        setLoadingMap((p) => ({ ...p, [kind]: v }));
    }, []);

    const getSetter = React.useCallback((kind: MasterKind) => {
        if (kind === "actions") return setActionsList;
        if (kind === "findingTypes") return setFindingTypes;
        return setLocations;
    }, []);

    const fetchMaster = React.useCallback(
        (kind: MasterKind) => {
            const A = actionsRef.current as any;
            const key = API_KEYS[kind].GET;
            const start = safeStart(A, key);
            if (!start) return;

            const setList = getSetter(kind);
            setLoading(kind, true);

            start({
                payload: { page: 1, limit: 200, orderBy: "created_at", orderDirection: "desc" },
                onAfterHandle: (res: any) => {
                    const rows = extractArray(res);
                    const mapped = rows.map(toMasterEntity);
                    setList(mapped);
                    setLoading(kind, false);
                },
                onErrorHandle: (error: any) => {
                    if (error?.name === "AbortError") {
                        setLoading(kind, false);
                        return;
                    }
                    console.error(`${key} error`, error);
                    setLoading(kind, false);

                },
            });
        },
        [getSetter, setLoading]
    );

    React.useEffect(() => {
        fetchMaster("actions");
        fetchMaster("findingTypes");
        fetchMaster("locations");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const createEntity = React.useCallback(
        (kind: MasterKind, data: Pick<MasterEntity, "name">) => {
            const A = actionsRef.current as any;
            const key = API_KEYS[kind].ADD;
            const start = safeStart(A, key);
            if (!start) return;

            const setList = getSetter(kind);

            start({
                payload: { name: data.name, is_active: true },
                onAfterHandle: (res: any) => {
                    const createdRaw = extractArray(res)?.[0] ?? res?.data?.[0] ?? res?.data ?? res;
                    const created = toMasterEntity(createdRaw);
                    setList((prev) => [created, ...prev]);
                },
                onErrorHandle: (error: any) => {
                    if (error?.name === "AbortError") return;
                    console.error(`${key} error`, error);

                },
            });
        },
        [getSetter]
    );

    const updateEntity = React.useCallback(
        (kind: MasterKind, id: string, data: Pick<MasterEntity, "name" | "isActive">) => {
            const A = actionsRef.current as any;
            const key = API_KEYS[kind].UPDATE;
            const start = safeStart(A, key);
            if (!start) return;

            const setList = getSetter(kind);

            start({
                payload: { _id: id, name: data.name, is_active: data.isActive },
                onAfterHandle: () => {
                    setList((prev) =>
                        prev.map((x) => (x.id === id ? { ...x, name: data.name, isActive: data.isActive } : x))
                    );
                },
                onErrorHandle: (error: any) => {
                    if (error?.name === "AbortError") return;
                    console.error(`${key} error`, error);

                },
            });
        },
        [getSetter]
    );

    const deleteEntity = React.useCallback(
        (kind: MasterKind, id: string) => {
            const A = actionsRef.current as any;
            const key = API_KEYS[kind].DELETE;
            const start = safeStart(A, key);
            if (!start) return;

            const setList = getSetter(kind);

            start({
                payload: { _id: id },
                onAfterHandle: () => setList((prev) => prev.filter((x) => x.id !== id)),
                onErrorHandle: (error: any) => {
                    if (error?.name === "AbortError") return;
                    console.error(`${key} error`, error);

                },
            });
        },
        [getSetter]
    );

    /** ---------------------------
     * PLANS
     * -------------------------- */
    const [auditPlans, setAuditPlans] = React.useState<Audit[]>([]);
    const [plansLoading, setPlansLoading] = React.useState(false);

    const fetchPlans = React.useCallback(() => {
        const A = actionsRef.current as any;
        const key = PLAN_KEYS.GET;
        const start = safeStart(A, key);
        if (!start) return;

        setPlansLoading(true);

        start({
            payload: { page: 1, limit: 500, orderBy: "planned_date", orderDirection: "desc" },
            onAfterHandle: (res: any) => {
                const rows = extractArray(res);
                const mapped = rows.map(planRowToAuditLike);
                setAuditPlans(mapped);
                setPlansLoading(false);
            },
            onErrorHandle: (error: any) => {
                if (error?.name === "AbortError") {
                    setPlansLoading(false);
                    return;
                }
                console.error(`${key} error`, error);
                setPlansLoading(false);

            },
        });
    }, []);

    React.useEffect(() => {
        if (tab !== "planning" && tab !== "teams") return;
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    React.useEffect(() => {
        if (tab !== "planning") return;
        fetchPlans();
        fetchMaster("locations");
        fetchTeams();
    }, [tab, fetchPlans, fetchMaster, fetchTeams]);

    const createPlan = React.useCallback(
        (payload: { planned_date: string; location_id: string; assigned_team_id: string }) => {
            const A = actionsRef.current as any;
            const key = PLAN_KEYS.ADD;
            const start = safeStart(A, key);
            if (!start) return;
            console.log("CREATE PLAN PAYLOAD", payload);
            start({
                payload: { ...payload, status: "planned" },
                onAfterHandle: (res: any) => {
                    const createdRaw = extractArray(res)?.[0] ?? res?.data?.[0] ?? res?.data ?? res;
                    const created = planRowToAuditLike(createdRaw);
                    setAuditPlans((prev) => [created, ...prev]);
                },
                onErrorHandle: (error: any) => {
                    if (error?.name === "AbortError") return;
                    console.error(`${key} error`, error);

                },
            });
        },
        []
    );

    const updatePlanStatus = React.useCallback((id: string, status: string) => {
        const A = actionsRef.current as any;
        const key = PLAN_KEYS.UPDATE;
        const start = safeStart(A, key);
        if (!start) return;

        start({
            payload: { _id: id, status },
            onAfterHandle: () => {
                setAuditPlans((prev) => prev.map((x) => (x.id === id ? ({ ...x, status } as any) : x)));
            },
            onErrorHandle: (error: any) => {
                if (error?.name === "AbortError") return;
                console.error(`${key} error`, error);

            },
        });
    }, []);

    const deletePlan = React.useCallback((id: string) => {
        const A = actionsRef.current as any;
        const key = PLAN_KEYS.DELETE;
        const start = safeStart(A, key);
        if (!start) return;

        start({
            payload: { _id: id },
            onAfterHandle: () => setAuditPlans((prev) => prev.filter((x) => x.id !== id)),
            onErrorHandle: (error: any) => {
                if (error?.name === "AbortError") return;
                console.error(`${key} error`, error);

            },
        });
    }, []);

    /** ---------------------------
     * Render
     * -------------------------- */
    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-6 md:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <header className="border-b border-slate-800 pb-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold md:text-2xl">Ana Veri Yönetimi</h1>
                            <p className="mt-1 text-sm text-slate-400">Veriler yönetimi.</p>
                        </div>

                        <SegmentedTabs
                            value={tab}
                            onChange={setTab}
                            items={[
                                { value: "master", label: "Veri Girişi" },
                                { value: "planning", label: "Denetim Planlama" },
                                { value: "teams", label: "Denetim Ekipleri" },
                            ]}
                        />
                    </div>
                </header>

                {tab === "master" ? (
                    <div className="grid gap-4 lg:grid-cols-3">
                        <MasterDataPanel
                            title="Bulgudan Alınacak Aksiyonlar"
                            items={actionsList}
                            onCreate={(d) => createEntity("actions", d)}
                            onUpdate={(id, d) => updateEntity("actions", id, d)}
                            onDelete={(id) => deleteEntity("actions", id)}
                        />

                        <MasterDataPanel
                            title="Bulgu Tipleri"
                            items={findingTypes}
                            onCreate={(d) => createEntity("findingTypes", d)}
                            onUpdate={(id, d) => updateEntity("findingTypes", id, d)}
                            onDelete={(id) => deleteEntity("findingTypes", id)}
                        />

                        <MasterDataPanel
                            title="Lokasyonlar"
                            items={locations}
                            onCreate={(d) => createEntity("locations", d)}
                            onUpdate={(id, d) => updateEntity("locations", id, d)}
                            onDelete={(id) => deleteEntity("locations", id)}
                        />
                    </div>
                ) : tab === "planning" ? (
                    <AuditPlannerPanel
                        locations={locations.filter((x) => x.isActive)}
                        teams={teams as any}
                        audits={auditPlans}
                        onCreate={(data: any) => {
                            createPlan({
                                planned_date: data.plannedDate,
                                location_id: data.locationId,
                                assigned_team_id: data.assignedTeamId,
                            });
                        }}
                        onUpdateStatus={(id, status) => updatePlanStatus(id, status)}
                        onDelete={(id) => deletePlan(id)}
                    />
                ) : (
                    <TeamsTab
                        actionsRef={actionsRef}
                        users={users}
                        usersLoading={usersLoading}
                        fetchUsers={fetchUsers}
                    />
                )}

                {tab !== "master" ? (
                    <div className="text-[11px] text-slate-600">
                        Users: {users.length} ({String(usersLoading)}) • Teams: {teams.length} ({String(teamsLoading)}) • Plans:{" "}
                        {auditPlans.length} ({String(plansLoading)})
                    </div>
                ) : null}
            </div>
        </div>
    );
}
