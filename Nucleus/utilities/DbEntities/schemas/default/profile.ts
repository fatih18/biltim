import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
	index,
	type PgColumn,
	type pgSchema,
	pgTable,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { inferBelongsToRelationsFromTable } from "../../../Generics/GenericSearch/autoRelations";
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
import {
	T_Users,
	type UserJSON,
	columns as userColumns,
	indexes as userIndexes,
} from "./user";

export const tablename = "profiles";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,
	user_id: uuid()
		.references(() => T_Users.id)
		.notNull(),
	first_name: varchar("first_name", { length: 100 }).notNull(),
	last_name: varchar("last_name", { length: 100 }).notNull(),
};

export const indexes = (table: {
	user_id: PgColumn;
	first_name: PgColumn;
	last_name: PgColumn;
	is_active: PgColumn;
	created_at: PgColumn;
}) => [
	unique().on(table.user_id),
	index().on(table.first_name, table.last_name),
];

export const T_Profiles = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	const userTable = schema.table("users", userColumns, userIndexes);
	return schema.table(
		tablename,
		{
			...columns,
			user_id: uuid("user_id")
				.references(() => userTable.id)
				.notNull(),
		},
		(table) => [
			unique().on(table.user_id),
			index().on(table.first_name, table.last_name),
		],
	);
}

export type Profile = InferSelectModel<typeof T_Profiles>;
export type ProfileJSON = InferSerializedSelectModel<typeof T_Profiles> & {
	user: UserJSON;
};
export type Create = Omit<Profile, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "first_name" | "last_name";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & { first_name?: string; last_name?: string };
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: ProfileJSON[];
	pagination: Pagination;
};

export const store: ProfileJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_Profiles", columns, {
		fields: {
			extraFields: {
				// Relation-derived fields
				email: {
					column: "email",
					type: "string",
					searchable: true,
					filterable: true,
					sortable: false,
					operators: ["eq", "in", "ilike"],
					fromRelation: "user",
				},
			},
		},
		relations: inferBelongsToRelationsFromTable(T_Profiles),
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
