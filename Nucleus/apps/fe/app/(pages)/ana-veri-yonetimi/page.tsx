"use client";

import React from "react";
import {
    AuditPlannerPanel,
    LocationsPanel,
    MasterDataPanel,
    QuestionsPanel,
    SegmentedTabs,
    nowIso,
    uid,
    type Audit,
    type LocationEntity,
    type MasterEntity,
    type User,
} from "./components";
import { useGenericApiActions } from "@/app/_hooks/UseNucleusApi";
import { readListResponse } from "@/app/_hooks/UseServerList";
import { TeamsTab } from "./components/TeamsTab";
import { toast } from "sonner";
import { useGetUserRole } from "@/app/_hooks/user/useGetUserRole";
import { ADMIN_ROLES, hasPrivilege } from "@/app/_utils/routeAccess";
import { confirmDialog } from "@/app/_components/Global/ConfirmDialog";

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

const PLAN_KEYS = {
    GET: "GET_FIVE_S_AUDIT_PLANS",
    ADD: "ADD_FIVE_S_AUDIT_PLAN",
    UPDATE: "UPDATE_FIVE_S_AUDIT_PLAN",
    DELETE: "DELETE_FIVE_S_AUDIT_PLAN",
} as const;

const GET_USERS_KEY = "GET_USERS";

const TEAM_KEYS = {
    GET: "GET_FIVE_S_AUDIT_TEAMS",
    MEMBERS: "GET_FIVE_S_AUDIT_TEAM_MEMBERS",
} as const;

/** What the server said, for a toast; the generic text when it said nothing. */
function serverMessage(error: any, fallback: string): string {
    const m = (Array.isArray(error) ? error[0]?.message : error?.message) ?? null;
    return m ? `${fallback} ${m}` : fallback;
}

function safeStart(A: any, key: string) {
    const entry = A?.[key];
    if (!entry?.start) {
        console.warn(`[Page] action not found: ${key}`);
        return null as null | ((args: any) => void);
    }
    return entry.start as (args: any) => void;
}

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

/** Kroki koordinatı: 0–100 arası tam sayı, yoksa null. */
function percentOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Math.min(100, Math.max(0, Math.round(n)));
}

function toLocationEntity(row: any): LocationEntity {
    return {
        ...toMasterEntity(row),
        managerUserId: row?.manager_user_id ?? null,
        fieldManagerUserIds: Array.isArray(row?.field_manager_user_ids)
            ? row.field_manager_user_ids
            : [],
        departmentName: row?.department_name ?? row?.departmentName ?? null,
        mapX: percentOrNull(row?.map_x ?? row?.mapX),
        mapY: percentOrNull(row?.map_y ?? row?.mapY),
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
        dateChangeCount: row?.date_change_count ?? row?.dateChangeCount ?? 0,
        parentPlanId: row?.parent_plan_id ?? null,
        quarter: row?.quarter ?? null,
        dateRangeStart: row?.date_range_start ?? null,
        dateRangeEnd: row?.date_range_end ?? null,
        title: row?.title ?? null,
    } as any;
}

/** nucleus clamps every list `limit` to this, whatever is asked for. */
const PLAN_PAGE_SIZE = 200;
/** 200 × 100 plans under one period is far past any real quarter; a guard, not a limit. */
const MAX_CHILD_PAGES = 100;

/**
 * Every plan under a period plan, by id, paged until the server says there is
 * no more. `null` when any page fails or the guard is hit — the caller must
 * not read a partial list as the whole one.
 */
async function fetchChildPlanIds(A: any, parentId: string): Promise<string[] | null> {
    const start = safeStart(A, PLAN_KEYS.GET);
    if (!start) return null;

    const ids = new Set<string>();
    for (let page = 1; page <= MAX_CHILD_PAGES; page++) {
        const result = await new Promise<{ items: any[]; hasNext: boolean } | null>((resolve) =>
            start({
                payload: {
                    page,
                    limit: PLAN_PAGE_SIZE,
                    filters: [{ field: "parent_plan_id", operator: "eq", value: parentId }],
                    // A fixed order, so no row moves between pages while they are read.
                    orderBy: [
                        { column: "created_at", direction: "asc" },
                        { column: "id", direction: "asc" },
                    ],
                },
                onAfterHandle: (res: any) => resolve(readListResponse<any>(res)),
                onErrorHandle: (error: any) => {
                    console.error(`${PLAN_KEYS.GET} (children) error`, error);
                    resolve(null);
                },
            })
        );
        if (!result) return null;
        for (const row of result.items) {
            const childId = String(row?.id ?? row?._id ?? "");
            if (childId) ids.add(childId);
        }
        // A short page is the last one, whether or not the meta says so.
        if (result.items.length === 0 || (!result.hasNext && result.items.length < PLAN_PAGE_SIZE)) {
            return [...ids];
        }
    }
    return null;
}

export default function Page() {
    const actions = useGenericApiActions();

    const actionsRef = React.useRef(actions);
    React.useEffect(() => {
        actionsRef.current = actions;
    }, [actions]);

    const [tab, setTab] = React.useState<"master" | "planning" | "teams" | "questions">("master");

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

                /*
                 * /users does not return roles — not even with `with=roles`,
                 * which answers null. The teams screen needs them: it offers
                 * only auditors as team members, and its own check reads
                 * "roles yoksa FE doğrulama yapamayız" and returns true, so
                 * with roles absent the rule passed ANYONE. It showed a warning
                 * saying so and listed every user.
                 *
                 * The mapping lives in its own table, so it is read from there
                 * and attached here, once, for every screen taking `users`.
                 */
                const attachRoles = (withRoles: Map<string, string[]>) => {
                    setUsers(
                        mapped.map((u: any) => ({ ...u, roles: (withRoles.get(String(u.id)) ?? []).map((name) => ({ name })) }))
                    );
                    setUsersLoading(false);
                };

                const startRoles = safeStart(A, "GET_ROLES");
                const startUserRoles = safeStart(A, "GET_USER_ROLES");
                if (!startRoles || !startUserRoles) {
                    setUsers(mapped);
                    setUsersLoading(false);
                    return;
                }

                const asPromise = (start: any, payload: any) =>
                    new Promise<any[]>((resolve) => {
                        start({
                            payload,
                            onAfterHandle: (r: any) => resolve(extractArray(r)),
                            onErrorHandle: () => resolve([]),
                        });
                    });

                Promise.all([
                    asPromise(startRoles, { page: 1, limit: 200 }),
                    asPromise(startUserRoles, { page: 1, limit: 2000 }),
                ]).then(([roleRows, userRoleRows]) => {
                    const roleName = new Map<string, string>();
                    for (const r of roleRows) {
                        const id = String((r as any)?.id ?? "");
                        const name = String((r as any)?.name ?? "");
                        if (id && name) roleName.set(id, name);
                    }
                    const byUser = new Map<string, string[]>();
                    for (const ur of userRoleRows) {
                        const uid = String((ur as any)?.userId ?? (ur as any)?.user_id ?? "");
                        const rid = String((ur as any)?.roleId ?? (ur as any)?.role_id ?? "");
                        const name = roleName.get(rid);
                        if (!uid || !name) continue;
                        byUser.set(uid, [...(byUser.get(uid) ?? []), name]);
                    }
                    attachRoles(byUser);
                });
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

    const [teams, setTeams] = React.useState<AuditTeamLite[]>([]);
    const [teamsLoading, setTeamsLoading] = React.useState(false);
    const { isGod, roles: myRoles } = useGetUserRole();
    // Approving (Tamamlandı), reopening and re-dating a carried-out audit: not the plant manager.
    const isAdmin = React.useMemo(
        () => hasPrivilege(myRoles.map((r) => r.name), ADMIN_ROLES, isGod),
        [myRoles, isGod]
    );
    /*
     * Who is on which team, for the planner's checks: the same auditor on two
     * audits in one day (#26), and a location's field manager on the team
     * sent to audit it (#13).
     */
    const [teamMembers, setTeamMembers] = React.useState<Array<{ teamId: string; userId: string }>>([]);
    const fetchTeamMembers = React.useCallback(() => {
        const start = safeStart(actionsRef.current as any, TEAM_KEYS.MEMBERS);
        if (!start) return;
        start({
            payload: { page: 1, limit: 5000, filters: { is_active: true } },
            onAfterHandle: (res: any) => {
                setTeamMembers(
                    extractArray(res)
                        .map((m: any) => ({ teamId: String(m?.team_id ?? m?.teamId ?? ""), userId: String(m?.user_id ?? m?.userId ?? "") }))
                        .filter((m: { teamId: string; userId: string }) => m.teamId && m.userId)
                );
            },
            onErrorHandle: (error: any) => console.error(`${TEAM_KEYS.MEMBERS} error`, error),
        });
    }, []);

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

    const [actionsList, setActionsList] = React.useState<MasterEntity[]>([]);
    const [findingTypes, setFindingTypes] = React.useState<MasterEntity[]>([]);
    const [locations, setLocations] = React.useState<LocationEntity[]>([]);

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
        return setLocations as React.Dispatch<React.SetStateAction<MasterEntity[]>>;
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
                    const mapper = kind === "locations" ? toLocationEntity : toMasterEntity;
                    const mapped = rows.map(mapper);
                    setList(mapped as MasterEntity[]);
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
                payload: { name: (data as any).name, is_active: true },
                onAfterHandle: (res: any) => {
                    const createdRaw = extractArray(res)?.[0] ?? res?.data?.[0] ?? res?.data ?? res;
                    const created = kind === "locations" ? toLocationEntity(createdRaw) : toMasterEntity(createdRaw);
                    setList((prev) => [created as MasterEntity, ...prev]);
                },
                onErrorHandle: (error: any) => {
                    if (error?.name === "AbortError") return;
                    console.error(`${key} error`, error);
                    /*
                     * Measured: with the save forced to fail, the form closed,
                     * the typed name was discarded and nothing appeared. The
                     * person had every reason to believe it had saved.
                     */
                    // The underlying message is usually the framework's own
                    // ("An unexpected response was received from the server"),
                    // which tells a plant auditor nothing. Say what failed.
                    toast.error("Kayıt eklenemedi. Lütfen tekrar deneyin.");
                },
            });
        },
        [getSetter]
    );

    const createLocationEntity = React.useCallback(
        (data: { name: string; managerUserId?: string | null; fieldManagerUserIds?: string[]; departmentName?: string | null; mapX?: number | null; mapY?: number | null }) => {
            const A = actionsRef.current as any;
            const key = API_KEYS.locations.ADD;
            const start = safeStart(A, key);
            if (!start) return;

            start({
                payload: {
                    name: data.name,
                    is_active: true,
                    manager_user_id: data.managerUserId ?? null,
                    field_manager_user_ids: data.fieldManagerUserIds ?? [],
                    department_name: data.departmentName?.trim() || null,
                    map_x: percentOrNull(data.mapX),
                    map_y: percentOrNull(data.mapY),
                },
                onAfterHandle: (res: any) => {
                    const createdRaw = extractArray(res)?.[0] ?? res?.data?.[0] ?? res?.data ?? res;
                    const created = toLocationEntity(createdRaw);
                    setLocations((prev) => [created, ...prev]);
                },
                onErrorHandle: (error: any) => {
                    if (error?.name === "AbortError") return;
                    console.error(`${key} error`, error);
                    /*
                     * Measured: with the save forced to fail, the form closed,
                     * the typed name was discarded and nothing appeared. The
                     * person had every reason to believe it had saved.
                     */
                    // The underlying message is usually the framework's own
                    // ("An unexpected response was received from the server"),
                    // which tells a plant auditor nothing. Say what failed.
                    toast.error("Kayıt eklenemedi. Lütfen tekrar deneyin.");
                },
            });
        },
        []
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
                    /*
                     * Measured: with the save forced to fail, the form closed,
                     * the typed name was discarded and nothing appeared. The
                     * person had every reason to believe it had saved.
                     */
                    // The underlying message is usually the framework's own
                    // ("An unexpected response was received from the server"),
                    // which tells a plant auditor nothing. Say what failed.
                    toast.error("Kayıt eklenemedi. Lütfen tekrar deneyin.");
                },
            });
        },
        [getSetter]
    );

    const updateLocationEntity = React.useCallback(
        (id: string, data: { name: string; isActive: boolean; managerUserId?: string | null; fieldManagerUserIds?: string[]; departmentName?: string | null; mapX?: number | null; mapY?: number | null }) => {
            const A = actionsRef.current as any;
            const key = API_KEYS.locations.UPDATE;
            const start = safeStart(A, key);
            if (!start) return;

            start({
                payload: {
                    _id: id,
                    name: data.name,
                    is_active: data.isActive,
                    manager_user_id: data.managerUserId ?? null,
                    field_manager_user_ids: data.fieldManagerUserIds ?? [],
                    department_name: data.departmentName?.trim() || null,
                    map_x: percentOrNull(data.mapX),
                    map_y: percentOrNull(data.mapY),
                },
                onAfterHandle: () => {
                    setLocations((prev) =>
                        prev.map((x) =>
                            x.id === id
                                ? { ...x, name: data.name, isActive: data.isActive, managerUserId: data.managerUserId, fieldManagerUserIds: data.fieldManagerUserIds ?? [], departmentName: data.departmentName?.trim() || null, mapX: percentOrNull(data.mapX), mapY: percentOrNull(data.mapY) }
                                : x
                        )
                    );
                },
                onErrorHandle: (error: any) => {
                    if (error?.name === "AbortError") return;
                    console.error(`${key} error`, error);
                    /*
                     * Measured: with the save forced to fail, the form closed,
                     * the typed name was discarded and nothing appeared. The
                     * person had every reason to believe it had saved.
                     */
                    // The underlying message is usually the framework's own
                    // ("An unexpected response was received from the server"),
                    // which tells a plant auditor nothing. Say what failed.
                    toast.error("Kayıt eklenemedi. Lütfen tekrar deneyin.");
                },
            });
        },
        []
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
                    // A refusal says why — e.g. an open plan still uses this location (#18).
                    toast.error(serverMessage(error, "Kayıt silinemedi."));
                },
            });
        },
        [getSetter]
    );

    const [auditPlans, setAuditPlans] = React.useState<Audit[]>([]);
    const [plansLoading, setPlansLoading] = React.useState(false);

    const fetchPlans = React.useCallback(() => {
        const A = actionsRef.current as any;
        const key = PLAN_KEYS.GET;
        const start = safeStart(A, key);
        if (!start) return;

        setPlansLoading(true);

        /*
         * Page by page. nucleus caps a page at 200 whatever `limit` says, so
         * the old single request for 500 quietly dropped every plan past the
         * 200th — the oldest ones, since period plans' empty dates sort first.
         */
        const PAGE = 200;
        const collected: any[] = [];
        const readPage = (page: number) =>
            start({
                payload: { page, limit: PAGE, orderBy: "planned_date", orderDirection: "desc" },
                onAfterHandle: (res: any) => {
                    const rows = extractArray(res);
                    collected.push(...rows);
                    if (rows.length === PAGE && page < 50) {
                        readPage(page + 1);
                        return;
                    }
                    setAuditPlans(collected.map(planRowToAuditLike));
                    setPlansLoading(false);
                },
                onErrorHandle: (error: any) => handleError(error),
            });
        const handleError = (error: any) => {
                if (error?.name === "AbortError") {
                    setPlansLoading(false);
                    return;
                }
                // Swallowing this left the planning board looking empty when
                // the read had actually failed — the two are indistinguishable
                // to whoever is looking at it.
                console.error(`${key} error`, error);
                toast.error("Denetim planları yüklenirken bir hata oluştu.");
                setPlansLoading(false);
        };
        readPage(1);
    }, []);

    React.useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    React.useEffect(() => {
        if (tab !== "planning") return;
        fetchPlans();
        fetchMaster("locations");
        fetchTeams();
        fetchTeamMembers();
    }, [tab, fetchPlans, fetchMaster, fetchTeams]);

    const createParentPlan = React.useCallback(
        (payload: { quarter: string; dateRangeStart: string; dateRangeEnd: string; title?: string }) => {
            const A = actionsRef.current as any;
            const key = PLAN_KEYS.ADD;
            const start = safeStart(A, key);
            if (!start) return;
            start({
                payload: {
                    quarter: payload.quarter,
                    date_range_start: payload.dateRangeStart,
                    date_range_end: payload.dateRangeEnd,
                    title: payload.title ?? null,
                    status: "planned",
                },
                onAfterHandle: (res: any) => {
                    const createdRaw = extractArray(res)?.[0] ?? res?.data?.[0] ?? res?.data ?? res;
                    const created = planRowToAuditLike(createdRaw);
                    setAuditPlans((prev) => [created, ...prev]);
                    toast.success("Denetim planı başarıyla oluşturuldu.");
                },
                onErrorHandle: (error: any) => {
                    if (error?.name === "AbortError") return;
                    console.error(`${key} error`, error);
                    // The server says why (field manager on the team, date outside the period, ...).
                    toast.error(serverMessage(error, "Denetim planı oluşturulamadı."));
                },
            });
        },
        []
    );

    const createPlan = React.useCallback(
        (payload: { planned_date: string; location_id: string; assigned_team_id: string; parent_plan_id?: string | null }) => {
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
                    toast.success("Denetim planı başarıyla oluşturuldu.");
                },
                onErrorHandle: (error: any) => {
                    if (error?.name === "AbortError") return;
                    console.error(`${key} error`, error);
                    toast.error("Denetim planı oluşturulamadı.");
                },
            });
        },
        []
    );

    const updatePlanDate = React.useCallback((id: string, newDate: string, newCount: number) => {
        const A = actionsRef.current as any;
        const key = PLAN_KEYS.UPDATE;
        const start = safeStart(A, key);
        if (!start) return;

        start({
            payload: { _id: id, planned_date: newDate, date_change_count: newCount },
            onAfterHandle: () => {
                setAuditPlans((prev) =>
                    prev.map((x) =>
                        x.id === id ? { ...x, plannedDate: newDate, dateChangeCount: newCount } : x
                    )
                );
            },
            onErrorHandle: (error: any) => {
                if (error?.name === "AbortError") return;
                console.error(`${key} (date) error`, error);
                toast.error(serverMessage(error, "Tarih değiştirilemedi."));
            },
        });
    }, []);

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
                toast.error(serverMessage(error, "Durum değiştirilemedi."));
            },
        });
    }, []);

    /*
     * #19: deleting a period plan takes its audit plans with it. The period
     * went and its children stayed, still pointing at it, listed nowhere under
     * a period that no longer existed. The children go first, so a refusal
     * halfway leaves the period in place rather than orphans behind it.
     */
    const deletePlan = React.useCallback(async (id: string) => {
        const A = actionsRef.current as any;
        const key = PLAN_KEYS.DELETE;
        const start = safeStart(A, key);
        if (!start) return;

        /*
         * The children are read from the server, every page of them. They
         * used to be picked out of `auditPlans`, which is one capped page of
         * the whole board (the server clamps any limit to 200) — a period
         * whose plans fell outside it lost its row and left those plans
         * behind, pointing at nothing. A sub-plan has no children, so only a
         * period plan (or one this screen does not hold) is asked about.
         */
        const known = auditPlans.find((x) => x.id === id);
        const isSubPlan = !!known && (!!known.locationId || !!known.assignedTeamId);
        let children: string[] = [];
        if (!isSubPlan) {
            const found = await fetchChildPlanIds(A, id);
            if (found === null) {
                // Not knowing the children is not "no children": deleting the
                // period now would orphan whichever ones there are.
                toast.error("Bağlı denetim planları okunamadı; plan silinmedi. Lütfen tekrar deneyin.");
                return;
            }
            children = found;
        }

        const ok = await confirmDialog({
            title: "Plan silinsin mi?",
            message:
                children.length > 0
                    ? `Bu dönem planına bağlı ${children.length} denetim planı da silinecek. Yapılmış denetimlerin kayıtları ve bulguları silinmez.`
                    : "Plan kalıcı olarak silinir. Yapılmış bir denetimin kaydı ve bulguları silinmez.",
            confirmLabel: "Sil",
            cancelLabel: "Vazgeç",
            tone: "danger",
        });
        if (!ok) return;

        const remove = (planId: string) =>
            new Promise<boolean>((resolve) =>
                start({
                    payload: { _id: planId },
                    onAfterHandle: () => {
                        setAuditPlans((prev) => prev.filter((x) => x.id !== planId));
                        resolve(true);
                    },
                    onErrorHandle: (error: any) => {
                        if (error?.name !== "AbortError") {
                            console.error(`${key} error`, error);
                            toast.error(serverMessage(error, "Plan silinemedi."));
                        }
                        resolve(false);
                    },
                })
            );

        for (const childId of children) {
            if (!(await remove(childId))) return;
        }
        if (await remove(id)) toast.success(children.length > 0 ? "Dönem planı ve bağlı planlar silindi." : "Plan silindi.");
    }, [auditPlans]);

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50 px-4 py-6 md:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <header className="border-b border-slate-300 dark:border-slate-800 pb-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold md:text-2xl">Ana Veri Yönetimi</h1>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Veriler yönetimi.</p>
                        </div>

                        <SegmentedTabs
                            value={tab}
                            onChange={setTab}
                            items={[
                                { value: "master", label: "Veri Girişi" },
                                { value: "planning", label: "Denetim Planlama" },
                                { value: "teams", label: "Denetim Ekipleri" },
                                { value: "questions", label: "Sorular" },
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

                        <LocationsPanel
                            items={locations}
                            users={users}
                            usersLoading={usersLoading}
                            onCreate={createLocationEntity}
                            onUpdate={updateLocationEntity}
                            onDelete={(id) => deleteEntity("locations", id)}
                        />
                    </div>
                ) : tab === "planning" ? (
                    <AuditPlannerPanel
                        locations={locations.filter((x) => x.isActive)}
                        teams={teams as any}
                        audits={auditPlans}
                        users={users}
                        onCreateParentPlan={createParentPlan}
                        onCreate={(data: any) => {
                            createPlan({
                                planned_date: data.plannedDate,
                                location_id: data.locationId,
                                assigned_team_id: data.assignedTeamId,
                                parent_plan_id: data.parentPlanId ?? null,
                            });
                        }}
                        onUpdateStatus={(id, status) => updatePlanStatus(id, status)}
                        onUpdateDate={(id, date, count) => updatePlanDate(id, date, count)}
                        onDelete={(id) => void deletePlan(id)}
                        teamMembers={teamMembers}
                        isGod={isGod}
                        isAdmin={isAdmin}
                    />
                ) : tab === "teams" ? (
                    <TeamsTab
                        actionsRef={actionsRef}
                        users={users}
                        usersLoading={usersLoading}
                        fetchUsers={fetchUsers}
                    />
                ) : (
                    <QuestionsPanel />
                )}
            </div>
        </div>
    );
}
