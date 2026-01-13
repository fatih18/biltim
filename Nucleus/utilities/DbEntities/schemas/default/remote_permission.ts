import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
	index,
	type PgColumn,
	type pgSchema,
	pgTable,
	timestamp,
	uuid,
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

export const tablename = "remotePermissions";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,
	remote_computer_id: uuid("remote_computer_id").notNull(),
	user_id: uuid("user_id").notNull(),
	permission_level: varchar("permission_level", { length: 50 })
		.$type<"read-only" | "execute" | "full">()
		.notNull(),
	granted_at: timestamp("granted_at").defaultNow().notNull(),
};

export const indexes = (table: {
	remote_computer_id: PgColumn;
	user_id: PgColumn;
	permission_level: PgColumn;
}) => [
	index("unique_remote_permission").on(table.remote_computer_id, table.user_id),
	index().on(table.permission_level),
];

export const T_RemotePermissions = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, (table) => [
		index("unique_remote_permission").on(
			table.remote_computer_id,
			table.user_id,
		),
		index().on(table.permission_level),
	]);
}

export type RemotePermission = InferSelectModel<typeof T_RemotePermissions>;
export type RemotePermissionJSON = InferSerializedSelectModel<
	typeof T_RemotePermissions
>;

export type Create = Omit<RemotePermission, DefaultOmitted>;

export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy;
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		remote_computer_id?: string;
		user_id?: string;
		permission_level?: string;
	};
};

export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };

export type ListReturn = {
	data: RemotePermissionJSON[];
	pagination: Pagination;
};

export const store: RemotePermissionJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_RemotePermissions", columns, {
		relations: [],
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
