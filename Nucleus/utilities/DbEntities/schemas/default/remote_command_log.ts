import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	type PgColumn,
	type pgSchema,
	pgTable,
	text,
	timestamp,
	uuid,
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

export const tablename = "remoteCommandLogs";
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
	remote_computer_id: uuid("remote_computer_id").notNull(),
	remote_session_id: uuid("remote_session_id"),
	command: text("command").notNull(),
	args: text("args"),
	output: text("output"),
	stderr: text("stderr"),
	exit_code: integer("exit_code"),
	executed_at: timestamp("executed_at").defaultNow().notNull(),
	execution_time_ms: integer("execution_time_ms"),
	timed_out: boolean("timed_out").default(false),
	executed_by_user_id: uuid("executed_by_user_id"),
};

export const indexes = (table: {
	remote_computer_id: PgColumn;
	remote_session_id: PgColumn;
	executed_at: PgColumn;
	executed_by_user_id: PgColumn;
}) => [
	index().on(table.remote_computer_id),
	index().on(table.remote_session_id),
	index().on(table.executed_at),
	index().on(table.executed_by_user_id),
];

export const T_RemoteCommandLogs = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, (table) => [
		index().on(table.remote_computer_id),
		index().on(table.remote_session_id),
		index().on(table.executed_at),
		index().on(table.executed_by_user_id),
	]);
}

export type RemoteCommandLog = InferSelectModel<typeof T_RemoteCommandLogs>;
export type RemoteCommandLogJSON = InferSerializedSelectModel<
	typeof T_RemoteCommandLogs
>;

export type Create = Omit<RemoteCommandLog, DefaultOmitted>;

export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "executed_at";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		remote_computer_id?: string;
		remote_session_id?: string;
		executed_by_user_id?: string;
		exit_code?: number;
		timed_out?: boolean;
	};
};

export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };

export type ListReturn = {
	data: RemoteCommandLogJSON[];
	pagination: Pagination;
};

export const store: RemoteCommandLogJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_RemoteCommandLogs", columns, {
		relations: [],
		fieldSelection: {},
		defaultOrderBy: "executed_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
