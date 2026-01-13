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
import {
	type DefaultFilter,
	type DefaultOmitted,
	type DefaultOrderBy,
	GenericMethods,
	type InferSerializedSelectModel,
	type OrderDirection,
	type Pagination,
} from "../../types/shared";
import { base } from "./base";

export const tablename = "remoteSessions";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [
	GenericMethods.CREATE,
	GenericMethods.UPDATE,
	GenericMethods.DELETE,
	GenericMethods.TOGGLE,
	GenericMethods.VERIFICATION,
];
export const is_formdata = false;

export const columns = {
	...base,
	user_id: uuid("user_id").notNull(),
	remote_computer_id: uuid("remote_computer_id").notNull(),
	started_at: timestamp("started_at").defaultNow().notNull(),
	ended_at: timestamp("ended_at"),
	status: varchar("status", { length: 20 })
		.$type<"active" | "finished" | "error">()
		.notNull()
		.default("active"),
};

export const indexes = (table: {
	user_id: PgColumn;
	remote_computer_id: PgColumn;
	started_at: PgColumn;
	status: PgColumn;
}) => [
	index().on(table.user_id),
	index().on(table.remote_computer_id),
	index().on(table.started_at),
	index().on(table.status),
];

export const T_RemoteSessions = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, (table) => [
		index().on(table.user_id),
		index().on(table.remote_computer_id),
		index().on(table.started_at),
		index().on(table.status),
	]);
}

export type RemoteSession = InferSelectModel<typeof T_RemoteSessions>;
export type RemoteSessionJSON = InferSerializedSelectModel<
	typeof T_RemoteSessions
>;

export type Create = Omit<RemoteSession, DefaultOmitted>;

export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "started_at" | "status";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		user_id?: string;
		remote_computer_id?: string;
		status?: string;
	};
};

export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };

export type ListReturn = {
	data: RemoteSessionJSON[];
	pagination: Pagination;
};

export const store: RemoteSessionJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_RemoteSessions", columns, {
		relations: [],
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
