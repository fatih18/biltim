import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
	boolean,
	index,
	type PgColumn,
	type pgSchema,
	pgTable,
	timestamp,
	unique,
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

export const tablename = "remoteComputers";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,
	owner_user_id: uuid("owner_user_id"),
	name: varchar("name", { length: 255 }).notNull(),
	computer_identifier: varchar("computer_identifier", {
		length: 255,
	}).notNull(),
	api_key_hash: varchar("api_key_hash", { length: 255 }),
	platform: varchar("platform", { length: 50 }),
	last_seen: timestamp("last_seen"),
	is_online: boolean("is_online").notNull().default(false),
	allowed_paths: varchar("allowed_paths", { length: 500 }).array(),
};

export const indexes = (table: {
	owner_user_id: PgColumn;
	computer_identifier: PgColumn;
	is_online: PgColumn;
	last_seen: PgColumn;
}) => [
	unique("unique_remote_computer_identifier").on(table.computer_identifier),
	index().on(table.owner_user_id),
	index().on(table.is_online),
	index().on(table.last_seen),
];

export const T_RemoteComputers = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, (table) => [
		unique("unique_remote_computer_identifier").on(table.computer_identifier),
		index().on(table.owner_user_id),
		index().on(table.is_online),
		index().on(table.last_seen),
	]);
}

export type RemoteComputer = InferSelectModel<typeof T_RemoteComputers>;
export type RemoteComputerJSON = InferSerializedSelectModel<
	typeof T_RemoteComputers
>;

export type Create = Omit<RemoteComputer, DefaultOmitted>;

export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "name" | "platform" | "last_seen";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		owner_user_id?: string;
		computer_identifier?: string;
		platform?: string;
		is_online?: boolean;
	};
};

export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };

export type ListReturn = {
	data: RemoteComputerJSON[];
	pagination: Pagination;
};

export const store: RemoteComputerJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_RemoteComputers", columns, {
		relations: [],
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
