import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
	index,
	type PgColumn,
	type pgSchema,
	pgTable,
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

export const tablename = "verificationNotificationRecipients";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,
	rule_id: uuid("rule_id").notNull(),
	recipient_type: varchar("recipient_type", { length: 20 })
		.$type<"user" | "role" | "all_verifiers" | "step_verifier">()
		.notNull(),
	recipient_user_id: uuid("recipient_user_id"),
	recipient_role_id: uuid("recipient_role_id"),
	channel: varchar("channel", { length: 20 }).$type<"portal">().notNull(),
};

export const indexes = (_table: {
	rule_id: PgColumn;
	recipient_type: PgColumn;
	channel: PgColumn;
}) => [
	index().on(_table.rule_id),
	index().on(_table.recipient_type),
	index().on(_table.channel),
];

export const T_VerificationNotificationRecipients = pgTable(
	tablename,
	columns,
	indexes,
);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type VerificationNotificationRecipient = InferSelectModel<
	typeof T_VerificationNotificationRecipients
>;
export type VerificationNotificationRecipientJSON = InferSerializedSelectModel<
	typeof T_VerificationNotificationRecipients
>;
export type Create = Omit<VerificationNotificationRecipient, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "channel";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		rule_id?: string;
		recipient_type?: string;
		channel?: string;
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: VerificationNotificationRecipientJSON[];
	pagination: Pagination;
};

export const store: VerificationNotificationRecipientJSON | undefined =
	undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns(
		"T_VerificationNotificationRecipients",
		columns,
		{
			relations: [],
			fieldSelection: {},
			defaultOrderBy: "created_at",
			defaultOrderDirection: "desc",
			maxLimit: 100,
			useDrizzleQuery: true,
		},
	);
