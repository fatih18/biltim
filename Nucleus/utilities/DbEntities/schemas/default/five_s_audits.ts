import type { HybridSearchConfig } from "@monorepo/generics";
import type { InferSelectModel } from "drizzle-orm";
import {
	type PgColumn,
	type pgSchema,
	pgTable,
	text,
	numeric,
	uuid,
	timestamp,
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

export const tablename = "five_s_audits";

export const available_schemas = ["*"];
export const available_app_ids = ["default_be"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,

	// Header bilgileri
	department_name: text("department_name").notNull(), // Bölüm
	auditor_name: text("auditor_name").notNull(), // Denetimi Yapan
	auditor_id: uuid("auditor_id"), // users tablosuna FK olabilir

	//   Offline/Retry idempotency  submit id
	client_submission_id: uuid("client_submission_id"),

	//   Kaynak bilgisi (web/offline/mobile vs)
	source: text("source"),

	// Denetim tarihi
	audit_date: timestamp("audit_date", { withTimezone: false }).notNull(),

	// Skorlar
	total_score: numeric("total_score", { precision: 5, scale: 2 }).notNull(), // 0-100
	target_score: numeric("target_score", { precision: 5, scale: 2 })
		.notNull()
		.default("75.00"),

	score_s1: numeric("score_s1", { precision: 5, scale: 2 }).notNull(),
	score_s2: numeric("score_s2", { precision: 5, scale: 2 }).notNull(),
	score_s3: numeric("score_s3", { precision: 5, scale: 2 }).notNull(),
	score_s4: numeric("score_s4", { precision: 5, scale: 2 }).notNull(),
	score_s5: numeric("score_s5", { precision: 5, scale: 2 }).notNull(),

	location_id: uuid("location_id"), // saha / bölge FK
	period_id: uuid("period_id"), // denetim dönemi FK (Q1 2025 vb.)
};

export const indexes = (_table: {
	is_active: PgColumn;
	created_at: PgColumn;
	audit_date: PgColumn;
	department_name: PgColumn;
	client_submission_id: PgColumn;
}) => [
	//   Idempotency: aynı submit dublicate
	uniqueIndex("five_s_audits_client_submission_id_ux").on(
		_table.client_submission_id,
	),

	// Opsiyonel performans indexleri
	// index("five_s_audits_date_idx").on(_table.audit_date),
	// index("five_s_audits_department_idx").on(_table.department_name),
];

export const T_FiveSAudits = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type FiveSAudit = InferSelectModel<typeof T_FiveSAudits>;
export type FiveSAuditJSON = InferSerializedSelectModel<typeof T_FiveSAudits>;
export type Create = Omit<FiveSAudit, DefaultOmitted>;

export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?:
		| DefaultOrderBy
		| "audit_date"
		| "department_name"
		| "total_score"
		| "score_s1"
		| "score_s2"
		| "score_s3"
		| "score_s4"
		| "score_s5";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		department_name?: string | string[];
		audit_date_gte?: string;
		audit_date_lte?: string;
		location_id?: string | string[];
		period_id?: string | string[];

		// ✅ Opsiyonel: offline debug/filtre
		client_submission_id?: string | string[];
		source?: string | string[];
	};
};

export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };

export type ListReturn = {
	data: FiveSAuditJSON[];
	pagination: Pagination;
};

export const store: FiveSAuditJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig = {
	table_name: "T_FiveSAudits",
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
		department_name: {
			column: "department_name",
			type: "string",
			searchable: true,
			filterable: true,
			sortable: true,
			operators: ["like", "eq", "in"],
		},
		auditor_name: {
			column: "auditor_name",
			type: "string",
			searchable: true,
			filterable: true,
			sortable: true,
			operators: ["like", "eq", "in"],
		},

		client_submission_id: {
			column: "client_submission_id",
			type: "string",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["eq", "in"],
		},
		source: {
			column: "source",
			type: "string",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["eq", "in", "like"],
		},

		audit_date: {
			column: "audit_date",
			type: "date",
			searchable: false,
			filterable: true,
			sortable: true,
			operators: ["gte", "lte", "gt", "lt"],
		},
		total_score: {
			column: "total_score",
			type: "number",
			searchable: false,
			filterable: true,
			sortable: true,
			operators: ["eq", "gte", "lte", "gt", "lt"],
		},
		target_score: {
			column: "target_score",
			type: "number",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["eq", "gte", "lte", "gt", "lt"],
		},
		score_s1: {
			column: "score_s1",
			type: "number",
			searchable: false,
			filterable: true,
			sortable: true,
			operators: ["eq", "gte", "lte", "gt", "lt"],
		},
		score_s2: {
			column: "score_s2",
			type: "number",
			searchable: false,
			filterable: true,
			sortable: true,
			operators: ["eq", "gte", "lte", "gt", "lt"],
		},
		score_s3: {
			column: "score_s3",
			type: "number",
			searchable: false,
			filterable: true,
			sortable: true,
			operators: ["eq", "gte", "lte", "gt", "lt"],
		},
		score_s4: {
			column: "score_s4",
			type: "number",
			searchable: false,
			filterable: true,
			sortable: true,
			operators: ["eq", "gte", "lte", "gt", "lt"],
		},
		score_s5: {
			column: "score_s5",
			type: "number",
			searchable: false,
			filterable: true,
			sortable: true,
			operators: ["eq", "gte", "lte", "gt", "lt"],
		},
		location_id: {
			column: "location_id",
			type: "string",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["eq", "in"],
		},
		period_id: {
			column: "period_id",
			type: "string",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["eq", "in"],
		},
	},
	relations: [],
	fieldSelection: {},
	defaultOrderBy: "audit_date",
	defaultOrderDirection: "desc",
	maxLimit: 100,
	useDrizzleQuery: true,
};
