import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
	index,
	integer,
	numeric,
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

export const tablename = "verificationNotificationRules";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,
	requirement_id: uuid("requirement_id"),
	entity_name: varchar("entity_name", { length: 100 }).notNull(),
	trigger: varchar("trigger", { length: 50 })
		.$type<
			"on_flow_started" | "on_approved" | "on_rejected" | "on_flow_completed"
		>()
		.notNull(),
	channel: varchar("channel", { length: 20 })
		.$type<"portal" | "email" | "both">()
		.default("portal")
		.notNull(),
	starts_at: timestamp("starts_at", { withTimezone: true }),
	expires_at: timestamp("expires_at", { withTimezone: true }),
	connected_from_step_order: integer("connected_from_step_order"),
	position_x: numeric("position_x"),
	position_y: numeric("position_y"),
};

export const indexes = (_table: {
	requirement_id: PgColumn;
	trigger: PgColumn;
}) => [index().on(_table.requirement_id), index().on(_table.trigger)];

export const T_VerificationNotificationRules = pgTable(
	tablename,
	columns,
	indexes,
);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type VerificationNotificationRule = InferSelectModel<
	typeof T_VerificationNotificationRules
>;
export type VerificationNotificationRuleJSON = InferSerializedSelectModel<
	typeof T_VerificationNotificationRules
>;
export type Create = Omit<VerificationNotificationRule, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "trigger";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		requirement_id?: string;
		trigger?: string;
		entity_name?: string;
		channel?: string;
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: VerificationNotificationRuleJSON[];
	pagination: Pagination;
};

export const store: VerificationNotificationRuleJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns(
		"T_VerificationNotificationRules",
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
