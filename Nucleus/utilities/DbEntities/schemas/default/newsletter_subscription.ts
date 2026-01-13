import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
	index,
	type PgColumn,
	type pgSchema,
	pgTable,
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

export const tablename = "newsletterSubscriptions";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,
	email: varchar("email", { length: 255 }).notNull().unique(),
	source: varchar("source", { length: 100 }).default("footer"),
};

export const indexes = (_table: {
	email: PgColumn;
}) => [index().on(_table.email)];

export const T_NewsletterSubscriptions = pgTable(
	tablename,
	columns,
	indexes,
);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type NewsletterSubscription = InferSelectModel<
	typeof T_NewsletterSubscriptions
>;
export type NewsletterSubscriptionJSON = InferSerializedSelectModel<
	typeof T_NewsletterSubscriptions
>;
export type Create = Omit<NewsletterSubscription, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy;
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		email?: string;
		source?: string;
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: NewsletterSubscriptionJSON[];
	pagination: Pagination;
};

export const store: NewsletterSubscriptionJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_NewsletterSubscriptions", columns, {
		relations: [],
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
