"use client";

import { useMemo } from "react";
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
    const store = useStore();
 
    const roles = useMemo(() => {
        const u: any = store.user;
        const data = u?.data ?? u;
        const rawRoles: any[] = data?.roles ?? [];

        const mapped: UserRole[] = rawRoles
            .map((x: any) => {
                const id = String(x?.id ?? x?.role_id ?? "");
                const name = String(x?.name ?? x?.role_name ?? "");
                if (!id && !name) return null;
                return { id, name };
            })
            .filter(Boolean) as UserRole[];

        const uniq = new Map<string, UserRole>();
        for (const r of mapped) {
            const key = r.id || r.name;
            if (!uniq.has(key)) uniq.set(key, r);
        }
        return Array.from(uniq.values());
    }, [store.user]);

    const isLoading = !store.isLoginChecked;
    const role = useMemo(() => roles[0] ?? null, [roles]);
    const roleName = role?.name ?? null;
    const roleId = role?.id ?? null;

    return {
        role,
        roleName,
        roleId,
        roles,
        isLoading,
        error: null,
        refetch: () => {},
    };
}
