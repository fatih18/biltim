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

export const tablename = "notifications";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,
	user_id: uuid("user_id").notNull(),
	title: varchar("title", { length: 255 }).notNull(),
	body: varchar("body", { length: 1000 }),
	entity_name: varchar("entity_name", { length: 100 }),
	entity_id: uuid("entity_id"),
	is_seen: boolean("is_seen").notNull().default(false),
	seen_at: timestamp("seen_at", { withTimezone: true }),
};

export const indexes = (_table: {
	user_id: PgColumn;
	is_seen: PgColumn;
	created_at: PgColumn;
}) => [
	index().on(_table.user_id, _table.created_at),
	index().on(_table.is_seen),
];

export const T_Notifications = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type Notification = InferSelectModel<typeof T_Notifications>;
export type NotificationJSON = InferSerializedSelectModel<
	typeof T_Notifications
>;
export type Create = Omit<Notification, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "title" | "created_at";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		user_id?: string;
		is_seen?: boolean;
		entity_name?: string;
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: NotificationJSON[];
	pagination: Pagination;
};

export const store: NotificationJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_Notifications", columns, {
		relations: [],
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
