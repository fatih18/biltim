import type { HybridSearchConfig } from "@monorepo/generics";
import type { InferSelectModel } from "drizzle-orm";
import { type PgColumn, type pgSchema, pgTable } from "drizzle-orm/pg-core";
import type {
	DefaultFilter,
	DefaultOmitted,
	DefaultOrderBy,
	GenericMethods,
	InferSerializedSelectModel,
	OrderDirection,
	Pagination,
} from "../types/shared";
import { base } from "./base";

export const tablename = "example";
export const available_app_ids = ["default_be"];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,

	// Enter your columns here
};

export const indexes = (_table: {
	is_active: PgColumn;
	created_at: PgColumn;
	// Enter your indexes here
}) => [
	// Enter your indexes here
];

export const T_Example = pgTable("example", columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type Example = InferSelectModel<typeof T_Example>;
export type ExampleJSON = InferSerializedSelectModel<typeof T_Example>;
export type Create = Omit<Example, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "name";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		// Enter your filters here
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: ExampleJSON[];
	pagination: Pagination;
};

export const store: ExampleJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig = {
	table_name: "T_Example",
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
		// Enter your fields here
	},
	relations: [],
	fieldSelection: {},
	defaultOrderBy: "created_at",
	defaultOrderDirection: "desc",
	maxLimit: 100,
	useDrizzleQuery: true,
};
