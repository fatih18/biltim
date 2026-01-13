"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useGenericApiActions } from "@/app/_hooks/UseGenericApiStore";
import { useStore } from "@store/globalStore";

type UserRole = { id: string; name: string };

type UseGetUserRoleResult = {
    role: UserRole | null;
    roleName: string | null;
    roleId: string | null;
    roles: UserRole[];
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
};

export function useGetUserRole(): UseGetUserRoleResult {
    const actions = useGenericApiActions();
    const store = useStore();

    const [roles, setRoles] = useState<UserRole[]>([]);
    const [error, setError] = useState<string | null>(null);

    const isFetchingRef = useRef(false);
    const lastUserIdRef = useRef<string | null>(null);

    const rolesLoading = !!actions.GET_USER_ROLES?.state?.isPending;
    const isLoading = rolesLoading;

    const role = useMemo(() => roles[0] ?? null, [roles]);
    const roleName = role?.name ?? null;
    const roleId = role?.id ?? null;

    const userId = useMemo(() => {
        const u: any = store.user;
        const data = u?.data ?? u;
        return (data?.sub ?? data?.userId ?? data?.id ?? null) as string | null;
    }, [store.user]);

    const fetchRoles = useCallback(
        (uid: string) => {
            const rolesAction = actions.GET_USER_ROLES;

            if (!rolesAction) {
                setError("GET_USER_ROLES action bulunamadı.");
                return;
            }

            if (isFetchingRef.current) return;

            isFetchingRef.current = true;
            setError(null);

            rolesAction.start({
                payload: {
                    page: 1,
                    limit: 50,
                    filters: {
                        user_id: uid,
                    },
                },
                onAfterHandle: (resp: any) => {
                    const root = resp?.data ?? resp;
                    const arr = root?.data ?? (Array.isArray(root) ? root : []);

                    const mapped: UserRole[] = (arr ?? [])
                        .map((x: any) => {
                            const roleObj = x?.role ?? x?.role_info ?? null;
                            const idRaw = roleObj?.id ?? x?.role_id ?? x?.roleId ?? null;
                            const nameRaw = roleObj?.name ?? x?.role_name ?? x?.roleName ?? null;

                            if (!idRaw && !nameRaw) return null;

                            const id = idRaw ? String(idRaw) : "";
                            const name = nameRaw ? String(nameRaw) : "";

                            if (!id && !name) return null;
                            return { id, name };
                        })
                        .filter(Boolean) as UserRole[];

                    // uniq
                    const uniq = new Map<string, UserRole>();
                    for (const r of mapped) {
                        const key = r.id || r.name;
                        if (!uniq.has(key)) uniq.set(key, r);
                    }

                    setRoles(Array.from(uniq.values()));
                    isFetchingRef.current = false;
                },
                onErrorHandle: (err: any) => {
                    console.error("[useGetUserRole] GET_USER_ROLES error raw:", err);
                    console.error("[useGetUserRole] GET_USER_ROLES error cause:", err?.cause);
                    setError(err?.cause?.message ?? err?.message ?? "Kullanıcı rolleri alınamadı.");
                    setRoles([]);
                    isFetchingRef.current = false;
                },
            });
        },
        [actions.GET_USER_ROLES]
    );

    // userId gelince sadece 1 kere fetchRoles
    useEffect(() => {
        if (!userId) return;

        // aynı kullanıcı için tekrar atma
        if (lastUserIdRef.current === userId) return;

        lastUserIdRef.current = userId;
        fetchRoles(userId);
    }, [userId, fetchRoles]);

    const refetch = useCallback(() => {
        setError(null);
        lastUserIdRef.current = null;
        if (userId) fetchRoles(userId);
    }, [userId, fetchRoles]);

    return {
        role,
        roleName,
        roleId,
        roles,
        isLoading,
        error,
        refetch,
    };
}
