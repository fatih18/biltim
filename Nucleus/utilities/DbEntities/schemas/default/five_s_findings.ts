// src/db/tables/five_s_findings.ts

import type { HybridSearchConfig } from "@monorepo/generics";
import type { InferSelectModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
	type PgColumn,
	type pgSchema,
	pgTable,
	text,
	uuid,
	date,
	integer,
	jsonb,
	index,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
	DefaultFilter,
	DefaultOmitted,
	DefaultOrderBy,
	GenericMethods,
	InferSerializedSelectModel,
	OrderDirection,
	Pagination,
} from "../../types/shared";
import { base } from "./base";

export const tablename = "five_s_findings";

export const available_schemas = ["*"];
export const available_app_ids = ["default_be"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export type FindingPhoto = {
	file_id?: string | null;
	url?: string | null;
};

export const columns = {
	...base,

	audit_id: uuid("audit_id"),

	answer_id: uuid("answer_id"),

	client_finding_id: uuid("client_finding_id"),

	client_submission_id: uuid("client_submission_id"),

	finding_no: integer("finding_no").generatedByDefaultAsIdentity().notNull(),

	detected_date: date("detected_date"),

	location_name: text("location_name"),

	finding_type: text("finding_type"),

	description: text("description"),

	photo_before_file_id: uuid("photo_before_file_id"),

	photo_before_url: text("photo_before_url"),

	photo_before_files: jsonb("photo_before_files")
		.$type<FindingPhoto[]>()
		.notNull()
		.default(sql`'[]'::jsonb`),

	photo_after_file_id: uuid("photo_after_file_id"),
	photo_after_url: text("photo_after_url"),

	photo_after_files: jsonb("photo_after_files")
		.$type<FindingPhoto[]>()
		.notNull()
		.default(sql`'[]'::jsonb`),

	action_to_take: text("action_to_take"),

	due_date: date("due_date"),

	completed_at: date("completed_at"),

	// Saha sorumlusu — bulguyı kapatacak kişi (lokasyondan otomatik doldurulur)
	responsible_name: text("responsible_name"),
	responsible_user_id: uuid("responsible_user_id"),

	// Denetimi yapan kişi (audit ekibinden)
	auditor_name: text("auditor_name"),
	auditor_user_id: uuid("auditor_user_id"),

	status: text("status").notNull().default("open"),

	form_title: text("form_title"),
};

export const indexes = (_table: {
	is_active: PgColumn;
	created_at: PgColumn;
	audit_id: PgColumn;
	detected_date: PgColumn;
	status: PgColumn;
	client_finding_id: PgColumn;
	client_submission_id: PgColumn;
}) => [
	uniqueIndex("five_s_findings_client_finding_id_ux").on(
		_table.client_finding_id,
	),

	index("five_s_findings_client_submission_id_idx").on(
		_table.client_submission_id,
	),

	// index("five_s_findings_audit_idx").on(_table.audit_id),
	// index("five_s_findings_date_idx").on(_table.detected_date),
	// index("five_s_findings_status_idx").on(_table.status),
];

export const T_FiveSFindings = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type FiveSFinding = InferSelectModel<typeof T_FiveSFindings>;
export type FiveSFindingJSON = InferSerializedSelectModel<
	typeof T_FiveSFindings
>;

export type Create = Omit<FiveSFinding, DefaultOmitted>;

export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?:
		| DefaultOrderBy
		| "detected_date"
		| "finding_no"
		| "status"
		| "location_name";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		audit_id?: string | string[];
		status?: string | string[];
		finding_type?: string | string[];
		location_name?: string | string[];
		detected_date_gte?: string;
		detected_date_lte?: string;
		responsible_user_id?: string | string[];
		auditor_user_id?: string | string[];

		// ✅ Opsiyonel: offline debug/filtre
		client_submission_id?: string | string[];
		client_finding_id?: string | string[];
	};
};

export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };

export type ListReturn = {
	data: FiveSFindingJSON[];
	pagination: Pagination;
};

export const store: FiveSFindingJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig = {
	table_name: "T_FiveSFindings",
	fields: {
		id: {
			column: "id",
			type: "string",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["eq", "in"],
		},
		is_active: {
			column: "is_active",
			type: "boolean",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["eq"],
		},
		created_at: {
			column: "created_at",
			type: "date",
			searchable: false,
			filterable: true,
			sortable: true,
			operators: ["gte", "lte", "gt", "lt"],
		},
		updated_at: {
			column: "updated_at",
			type: "date",
			searchable: false,
			filterable: true,
			sortable: true,
			operators: ["gte", "lte", "gt", "lt"],
		},
		audit_id: {
			column: "audit_id",
			type: "string",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["eq", "in"],
		},

		/**  Offline idempotency  */
		client_submission_id: {
			column: "client_submission_id",
			type: "string",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["eq", "in"],
		},
		client_finding_id: {
			column: "client_finding_id",
			type: "string",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["eq", "in"],
		},

		finding_no: {
			column: "finding_no",
			type: "number",
			searchable: false,
			filterable: true,
			sortable: true,
			operators: ["eq", "gte", "lte", "gt", "lt"],
		},
		detected_date: {
			column: "detected_date",
			type: "date",
			searchable: false,
			filterable: true,
			sortable: true,
			operators: ["gte", "lte", "gt", "lt"],
		},
		location_name: {
			column: "location_name",
			type: "string",
			searchable: true,
			filterable: true,
			sortable: true,
			operators: ["ilike", "eq", "in"],
		},
		finding_type: {
			column: "finding_type",
			type: "string",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["eq", "in"],
		},
		status: {
			column: "status",
			type: "string",
			searchable: false,
			filterable: true,
			sortable: true,
			operators: ["eq", "in"],
		},
		responsible_name: {
			column: "responsible_name",
			type: "string",
			searchable: true,
			filterable: true,
			sortable: false,
			operators: ["like", "eq", "in"],
		},
		detected_date_gte: {
			column: "detected_date",
			type: "date",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["gte"],
		},
		detected_date_lte: {
			column: "detected_date",
			type: "date",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["lte"],
		},

		// photo_before_files: { ... }
		// photo_after_files: { ... }
	},
	relations: [],
	fieldSelection: {},
	defaultOrderBy: "detected_date",
	defaultOrderDirection: "desc",
	maxLimit: 200,
	useDrizzleQuery: true,
};
