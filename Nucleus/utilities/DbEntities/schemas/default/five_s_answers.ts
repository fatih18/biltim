// src/db/tables/five_s_audit_answers.ts

import type { HybridSearchConfig } from "@monorepo/generics";
import type { InferSelectModel } from "drizzle-orm";
import {
	type PgColumn,
	type pgSchema,
	pgTable,
	text,
	uuid,
	timestamp,
	boolean,
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

export const tablename = "five_s_audit_answers";

export const available_schemas = ["*"];
export const available_app_ids = ["default_be"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,

	audit_id: uuid("audit_id").notNull(), // T_FiveSAudits.id FK
	question_id: text("question_id").notNull(), // "S2-Q8"
	step_code: text("step_code").notNull(), // "S2"

	rating: text("rating").notNull(), // 'good' | 'medium' | 'bad'
	explanation: text("explanation"),

	finding_type: text("finding_type"), // 'tanimsiz-malzeme' | 'daginik-alan'
	photo_before_url: text("photo_before_url"),

	has_open_finding: boolean("has_open_finding").notNull().default(false),

	answered_at: timestamp("answered_at", { withTimezone: false })
		.notNull()
		.defaultNow(),
};

export const indexes = (_table: {
	is_active: PgColumn;
	created_at: PgColumn;
	audit_id: PgColumn;
	question_id: PgColumn;
	step_code: PgColumn;
}) => [
	// index("five_s_answers_audit_idx").on(_table.audit_id),
	// index("five_s_answers_step_idx").on(_table.step_code),
];

export const T_FiveSAuditAnswers = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type FiveSAuditAnswer = InferSelectModel<typeof T_FiveSAuditAnswers>;
export type FiveSAuditAnswerJSON = InferSerializedSelectModel<
	typeof T_FiveSAuditAnswers
>;

export type Create = Omit<FiveSAuditAnswer, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?:
		| DefaultOrderBy
		| "answered_at"
		| "rating"
		| "step_code"
		| "question_id";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		audit_id?: string | string[];
		step_code?: string | string[];
		rating?: string | string[];
		finding_type?: string | string[];
		has_open_finding?: boolean;
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: FiveSAuditAnswerJSON[];
	pagination: Pagination;
};

export const store: FiveSAuditAnswerJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig = {
	table_name: "T_FiveSAuditAnswers",
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
		question_id: {
			column: "question_id",
			type: "string",
			searchable: true,
			filterable: true,
			sortable: false,
			operators: ["like", "eq", "in"],
		},
		step_code: {
			column: "step_code",
			type: "string",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["eq", "in"],
		},
		rating: {
			column: "rating",
			type: "string",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["eq", "in"],
		},
		finding_type: {
			column: "finding_type",
			type: "string",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["eq", "in"],
		},
		has_open_finding: {
			column: "has_open_finding",
			type: "boolean",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["eq"],
		},
		answered_at: {
			column: "answered_at",
			type: "date",
			searchable: false,
			filterable: true,
			sortable: true,
			operators: ["gte", "lte", "gt", "lt"],
		},
	},
	relations: [],
	fieldSelection: {},
	defaultOrderBy: "answered_at",
	defaultOrderDirection: "desc",
	maxLimit: 200,
	useDrizzleQuery: true,
};
