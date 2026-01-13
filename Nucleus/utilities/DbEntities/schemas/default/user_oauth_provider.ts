import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
	boolean,
	index,
	jsonb,
	type PgColumn,
	type pgSchema,
	pgTable,
	text,
	timestamp,
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

export const tablename = "user_oauth_providers";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,
	user_id: varchar("user_id", { length: 255 }).notNull(),
	provider: varchar("provider", { length: 50 }).notNull(), // 'github', 'google', 'azure', etc.
	provider_user_id: varchar("provider_user_id", { length: 255 }).notNull(),
	provider_email: varchar("provider_email", { length: 255 }),
	access_token: text("access_token"), // text for long JWTs (Azure tokens can be 1000+ chars)
	refresh_token: text("refresh_token"), // text for long JWTs
	token_expires_at: timestamp(),
	profile_data: jsonb("profile_data"), // Store additional provider-specific data
	is_primary: boolean("is_primary").default(false), // Mark if this is the primary OAuth method
};

export const indexes = (table: {
	user_id: PgColumn;
	provider: PgColumn;
	provider_user_id: PgColumn;
	is_active: PgColumn;
}) => [
	index().on(table.user_id),
	index().on(table.provider),
	unique().on(table.provider, table.provider_user_id),
	index().on(table.user_id, table.provider),
];

export const T_UserOAuthProviders = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type UserOAuthProvider = InferSelectModel<typeof T_UserOAuthProviders>;
export type UserOAuthProviderJSON = InferSerializedSelectModel<
	typeof T_UserOAuthProviders
>;
export type Create = Omit<UserOAuthProvider, DefaultOmitted>;

export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "provider" | "created_at";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		user_id?: string;
		provider?: string;
		provider_user_id?: string;
	};
};

export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };

export type ListReturn = {
	data: UserOAuthProviderJSON[];
	pagination: Pagination;
};

export const store: UserOAuthProviderJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_UserOAuthProviders", columns, {
		relations: [],
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
