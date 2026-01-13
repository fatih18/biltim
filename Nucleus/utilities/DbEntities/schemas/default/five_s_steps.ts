import type { HybridSearchConfig } from "@monorepo/generics";
import type { InferSelectModel } from "drizzle-orm";
import {
	type PgColumn,
	type pgSchema,
	pgTable,
	text,
	numeric,
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

export const tablename = "five_s_steps";
export const available_app_ids = ["default_be"];

export const available_schemas = ["*"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,

	// Örn: "S1", "S2" ...
	code: text("code").notNull(), // unique olacak
	title: text("title").notNull(), // "1 - Sınıflandırma (Ayıklama)"
	max_score: numeric("max_score", { precision: 5, scale: 2 }).notNull(), // 20.00
	order: integer("order").notNull(), // 1..5
};

export const indexes = (_table: {
	is_active: PgColumn;
	created_at: PgColumn;
	code: PgColumn;
	order: PgColumn;
}) => [
	// code için unique index tanımlamak istersen buraya ekleyebilirsin
	// example:
	// uniqueIndex("five_s_steps_code_uniq").on(_table.code),
];

export const T_FiveSSteps = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type FiveSStep = InferSelectModel<typeof T_FiveSSteps>;
export type FiveSStepJSON = InferSerializedSelectModel<typeof T_FiveSSteps>;
export type Create = Omit<FiveSStep, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "code" | "order";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		code?: string | string[];
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: FiveSStepJSON[];
	pagination: Pagination;
};

export const store: FiveSStepJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig = {
	table_name: "T_FiveSSteps",
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
		code: {
			column: "code",
			type: "string",
			searchable: true,
			filterable: true,
			sortable: true,
			operators: ["eq", "in", "like"],
		},
		title: {
			column: "title",
			type: "string",
			searchable: true,
			filterable: true,
			sortable: true,
			operators: ["like"],
		},
		max_score: {
			column: "max_score",
			type: "number",
			searchable: false,
			filterable: true,
			sortable: true,
			operators: ["eq", "gte", "lte", "gt", "lt"],
		},
		order: {
			column: "order",
			type: "number",
			searchable: false,
			filterable: true,
			sortable: true,
			operators: ["eq", "gte", "lte", "gt", "lt"],
		},
	},
	relations: [],
	fieldSelection: {},
	defaultOrderBy: "order",
	defaultOrderDirection: "asc",
	maxLimit: 100,
	useDrizzleQuery: true,
};
