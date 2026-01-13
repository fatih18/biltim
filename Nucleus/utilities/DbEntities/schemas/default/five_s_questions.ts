import type { HybridSearchConfig } from "@monorepo/generics";
import type { InferSelectModel } from "drizzle-orm";
import {
	type PgColumn,
	type pgSchema,
	pgTable,
	text,
	numeric,
	boolean,
	uuid,
	integer,
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

export const tablename = "five_s_questions";

export const available_schemas = ["*"];
export const available_app_ids = ["default_be"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,

	// five_s_steps.id -> UUID
	step_id: uuid("step_id").notNull(),

	// FE tarafında kullandığın "S1-Q1" gibi ID
	external_id: text("external_id").notNull(),

	order: integer("order").notNull(), // adım içi sıra
	text: text("text").notNull(),
	max_score: numeric("max_score", { precision: 5, scale: 2 }).notNull(),

	require_explanation: boolean("require_explanation").notNull().default(true),
};

export const indexes = (_table: {
	is_active: PgColumn;
	created_at: PgColumn;
	step_id: PgColumn;
	external_id: PgColumn;
	order: PgColumn;
}) => [
	// Örnek (istersen aktif edersin)
	// uniqueIndex("five_s_questions_external_id_uniq").on(_table.external_id),
];

export const T_FiveSQuestions = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type FiveSQuestion = InferSelectModel<typeof T_FiveSQuestions>;
export type FiveSQuestionJSON = InferSerializedSelectModel<
	typeof T_FiveSQuestions
>;
export type Create = Omit<FiveSQuestion, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "external_id" | "order";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		step_id?: string | string[];
		external_id?: string | string[];
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: FiveSQuestionJSON[];
	pagination: Pagination;
};

export const store: FiveSQuestionJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig = {
	table_name: "T_FiveSQuestions",
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
		step_id: {
			column: "step_id",
			type: "string",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["eq", "in"],
		},
		external_id: {
			column: "external_id",
			type: "string",
			searchable: true,
			filterable: true,
			sortable: true,
			operators: ["eq", "in", "like"],
		},
		order: {
			column: "order",
			type: "number",
			searchable: false,
			filterable: true,
			sortable: true,
			operators: ["eq", "gte", "lte", "gt", "lt"],
		},
		max_score: {
			column: "max_score",
			type: "number",
			searchable: false,
			filterable: true,
			sortable: true,
			operators: ["eq", "gte", "lte", "gt", "lt"],
		},
		require_explanation: {
			column: "require_explanation",
			type: "boolean",
			searchable: false,
			filterable: true,
			sortable: false,
			operators: ["eq"],
		},
		text: {
			column: "text",
			type: "string",
			searchable: true,
			filterable: false,
			sortable: false,
			operators: ["like"],
		},
	},
	relations: [],
	fieldSelection: {},
	defaultOrderBy: "order",
	defaultOrderDirection: "asc",
	maxLimit: 200,
	useDrizzleQuery: true,
};
