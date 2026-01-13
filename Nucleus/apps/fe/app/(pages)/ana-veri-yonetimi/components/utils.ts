import type { MasterEntity } from "./types";

export function uid() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = (globalThis as any)?.crypto;
    if (c?.randomUUID) return c.randomUUID();
    return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function nowIso() {
    return new Date().toISOString();
}

export function normalizeName(v: string) {
    return String(v ?? "").trim().replace(/\s+/g, " ");
}

export function isNameTaken(list: MasterEntity[], name: string, exceptId?: string) {
    const n = normalizeName(name).toLowerCase();
    return list.some(
        (x) => x.id !== exceptId && normalizeName(x.name).toLowerCase() === n
    );
}
