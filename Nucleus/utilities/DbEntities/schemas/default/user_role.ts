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
	type RoleJSON,
	columns as roleColumns,
	indexes as roleIndexes,
	T_Roles,
} from "./role";
import {
	T_Users,
	type UserJSON,
	columns as userColumns,
	indexes as userIndexes,
} from "./user";

export const tablename = "user_roles";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,
	user_id: uuid()
		.references(() => T_Users.id, { onDelete: "cascade" })
		.notNull(),
	role_id: uuid()
		.references(() => T_Roles.id, { onDelete: "cascade" })
		.notNull(),
};

export const indexes = (table: {
	user_id: PgColumn;
	role_id: PgColumn;
	is_active: PgColumn;
	created_at: PgColumn;
}) => [
	unique("unique_user_role").on(table.user_id, table.role_id),
	index().on(table.user_id),
	index().on(table.role_id),
];

export const T_UserRoles = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	const userTable = schema.table("users", userColumns, userIndexes);
	const roleTable = schema.table("roles", roleColumns, roleIndexes);

	return schema.table(
		tablename,
		{
			...columns,
			user_id: uuid()
				.references(() => userTable.id, { onDelete: "cascade" })
				.notNull(),
			role_id: uuid()
				.references(() => roleTable.id, { onDelete: "cascade" })
				.notNull(),
		},
		(table) => [
			unique("unique_user_role").on(table.user_id, table.role_id),
			index().on(table.user_id),
			index().on(table.role_id),
		],
	);
}

export type UserRole = InferSelectModel<typeof T_UserRoles>;
export type UserRoleJSON = InferSerializedSelectModel<typeof T_UserRoles> & {
	user?: UserJSON;
	role?: RoleJSON;
};

export type Create = Omit<UserRole, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "user_id" | "role_id";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		user_id?: string;
		role_id?: string;
	};
	relations?: string[];
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: UserRoleJSON[];
	pagination: Pagination;
};

export const store: UserRoleJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_UserRoles", columns, {
		fields: {
			extraFields: {
				user_email: {
					column: "email",
					type: "string",
					searchable: true,
					filterable: true,
					sortable: false,
					operators: ["eq", "in", "ilike"],
					fromRelation: "user",
				},
				role_name: {
					column: "name",
					type: "string",
					searchable: true,
					filterable: true,
					sortable: false,
					operators: ["eq", "in", "ilike"],
					fromRelation: "role",
				},
			},
		},
		relations: inferBelongsToRelationsFromTable(T_UserRoles).filter(
			(relation) => relation.name === "user" || relation.name === "role",
		),
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
