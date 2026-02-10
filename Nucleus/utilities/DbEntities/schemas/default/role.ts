import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
	boolean,
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
import type { ClaimJSON } from "./claim";
import type { UserJSON } from "./user";

export const tablename = "roles";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,
	name: varchar("name", { length: 100 }).notNull(),
	description: varchar("description", { length: 500 }),
	is_system: boolean("is_system").default(false).notNull(),
	alias: varchar("alias", { length: 50 }),
};

export const indexes = (table: {
	name: PgColumn;
	is_system: PgColumn;
	is_active: PgColumn;
	created_at: PgColumn;
}) => [
		unique().on(table.name),
		index().on(table.name),
		index().on(table.is_system),
	];

export const T_Roles = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type Role = InferSelectModel<typeof T_Roles>;
export type RoleJSON = InferSerializedSelectModel<typeof T_Roles> & {
	users?: UserJSON[];
	claims?: ClaimJSON[];
};

export type Create = Omit<Role, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "name" | "is_system";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		name?: string;
		is_system?: boolean;
	};
	relations?: string[];
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: RoleJSON[];
	pagination: Pagination;
};

export const store: RoleJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_Roles", columns, {
		relations: [
			{
				name: "users",
				useDrizzleRelation: false,
				type: "many-to-many",
				targetTable: "T_Users",
				through: {
					table: "T_UserRoles",
					localKey: "role_id",
					targetKey: "user_id",
				},
			},
			{
				name: "claims",
				useDrizzleRelation: false,
				type: "many-to-many",
				targetTable: "T_Claims",
				through: {
					table: "T_RoleClaims",
					localKey: "role_id",
					targetKey: "claim_id",
				},
			},
		],
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
