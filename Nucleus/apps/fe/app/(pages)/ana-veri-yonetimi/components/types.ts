export type MasterEntity = {
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
    createdAt: string; // ISO
};

export type AuditStatus = "planned" | "cancelled" | "completed";

export type Audit = {
    id: string;
    auditDate: string; // YYYY-MM-DD
    locationId: string;
    assignedUserId: string;
    note?: string;
    status: AuditStatus;
    createdAt: string;
};
export type User = { id: string; name: string; roles?: { name: string }[] }

