import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
	index,
	type PgColumn,
	type pgSchema,
	pgTable,
	text,
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

export const tablename = "contents";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,
	title: varchar("title", { length: 255 }).notNull(),
	body: text("body").notNull(),
	file_id: uuid("file_id"),
	status: varchar("status", { length: 50 })
		.$type<
			"draft" | "pending_approval" | "approved" | "rejected" | "published"
		>()
		.notNull()
		.default("draft"),
	verified_at: timestamp("verified_at", { withTimezone: true }),
};

export const indexes = (_table: { title: PgColumn; status: PgColumn }) => [
	index().on(_table.title),
	index().on(_table.status),
];

export const T_Contents = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type Content = InferSelectModel<typeof T_Contents>;
export type ContentJSON = InferSerializedSelectModel<typeof T_Contents>;
export type Create = Omit<Content, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "title";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		status?: string;
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: ContentJSON[];
	pagination: Pagination;
};

export const store: ContentJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_Contents", columns, {
		relations: [],
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
