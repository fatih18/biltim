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
	planned_date: string;
	location_id: string;
	assigned_team_id: string;
	note?: string;
	status: AuditStatus;
	audit_id?: string;
};
export type User = { id: string; name: string; roles?: { name: string }[] };
