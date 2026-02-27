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
  createdAt: string;
  status: AuditStatus;

  plannedDate: string;
  locationId: string;
  assignedTeamId: string;

  auditId?: string | null;
  note?: string;
};
export type User = { id: string; name: string; roles?: { name: string }[] };
