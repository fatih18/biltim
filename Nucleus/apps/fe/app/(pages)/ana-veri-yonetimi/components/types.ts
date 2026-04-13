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
  dateChangeCount?: number;

  parentPlanId?: string | null;
  quarter?: string | null;
  dateRangeStart?: string | null;
  dateRangeEnd?: string | null;
  title?: string | null;
};
export type User = { id: string; name: string; roles?: { name: string }[] };

export type LocationEntity = MasterEntity & {
    managerUserId?: string | null;
    fieldManagerUserIds?: string[];
};
