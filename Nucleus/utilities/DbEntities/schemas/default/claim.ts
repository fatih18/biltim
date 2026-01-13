import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
	index,
	type PgColumn,
	type pgSchema,
	pgTable,
	unique,
	varchar,
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
import type { UserJSON } from "./user";

export const tablename = "claims";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,
	action: varchar("action", { length: 100 }).notNull(),
	description: varchar("description", { length: 500 }),
	path: varchar("path", { length: 200 }).notNull(),
	method: varchar("method", { length: 10 }).notNull(), // GET, POST, etc.
	mode: varchar("mode", { length: 20 })
		.notNull()
		.$type<"exact" | "startsWith">(),
};

export const indexes = (table: {
	action: PgColumn;
	path: PgColumn;
	method: PgColumn;
	mode: PgColumn;
	is_active: PgColumn;
	created_at: PgColumn;
}) => [
	unique().on(table.action),
	index().on(table.path, table.method),
	index().on(table.action),
];

export const T_Claims = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, (table) => [
		index().on(table.action),
		index().on(table.path, table.method),
		unique().on(table.action),
	]);
}

export type Claim = InferSelectModel<typeof T_Claims>;
export type ClaimJSON = InferSerializedSelectModel<typeof T_Claims> & {
	users: UserJSON[];
};
export type Create = Omit<Claim, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "action" | "path" | "method" | "mode";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		action?: string;
		path?: string;
		method?: string;
		mode?: string;
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: ClaimJSON[];
	pagination: Pagination;
};

export const store: ClaimJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_Claims", columns, {
		relations: [
			{
				name: "users",
				useDrizzleRelation: false,
				type: "many-to-many",
				targetTable: "T_Users",
				through: {
					table: "T_UserClaims",
					localKey: "claim_id",
					targetKey: "user_id",
				},
			},
		],
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
