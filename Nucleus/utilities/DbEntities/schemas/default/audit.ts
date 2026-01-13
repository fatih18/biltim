import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
	index,
	jsonb,
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
import type { UserJSON } from "./user";

export const tablename = "audit_logs";
export const available_app_ids = ["default_be", "bifrost"];
export const available_schemas = ["*"];
export const excluded_schemas = [];
export const is_formdata = false;

export const excluded_methods: GenericMethods[] = [
	GenericMethods.TOGGLE,
	GenericMethods.DELETE,
	GenericMethods.CREATE,
	GenericMethods.UPDATE,
];

export const columns = {
	id: uuid().primaryKey().defaultRandom(),
	user_id: uuid().default("00000000-0000-0000-0000-000000000000"),
	entity_name: varchar("entity_name", { length: 100 }).notNull(),
	entity_id: uuid("entity_id"), // Nullable for error logs without specific entity
	operation_type: varchar("operation_type", { length: 20 }).notNull(), // INSERT, UPDATE, DELETE, SOFT_DELETE
	summary: varchar("summary", { length: 500 }),
	old_values: jsonb("old_values"),
	new_values: jsonb("new_values"),
	ip_address: varchar("ip_address", { length: 45 }), // IPv6 support
	user_agent: varchar("user_agent", { length: 500 }),
	timestamp: timestamp().defaultNow().notNull(),
};

export const indexes = (table: {
	timestamp: PgColumn;
	entity_name: PgColumn;
	entity_id: PgColumn;
	user_id: PgColumn;
	operation_type: PgColumn;
}) => [
	index().on(table.timestamp),
	index().on(table.entity_name, table.entity_id),
	index().on(table.user_id, table.timestamp),
	index().on(table.operation_type),
];

export const T_Audit = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, (table) => [
		index().on(table.timestamp),
		index().on(table.entity_name, table.entity_id),
		index().on(table.user_id, table.timestamp),
		index().on(table.operation_type),
	]);
}

export type Audit = InferSelectModel<typeof T_Audit>;
export type AuditJSON = InferSerializedSelectModel<typeof T_Audit> & {
	user: UserJSON;
};
export type Create = Omit<Audit, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?:
		| DefaultOrderBy
		| "entity_name"
		| "entity_id"
		| "user_id"
		| "operation_type";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		entity_name?: string;
		entity_id?: string;
		user_id?: string;
		operation_type?: string;
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: AuditJSON[];
	pagination: Pagination;
};

export const store: AuditJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_Audit", columns, {
		fields: {
			extraFields: {
				// Relation-derived fields
				email: {
					column: "email",
					type: "string",
					searchable: true,
					filterable: true,
					sortable: false,
					operators: ["eq", "in", "ilike"],
					fromRelation: "user",
				},
			},
		},
		relations: [
			{
				name: "user",
				useDrizzleRelation: false,
				type: "belongs-to",
				targetTable: "T_Users",
				localKey: "user_id",
				excluded_schemas: ["main"],
			},
		],
		fieldSelection: {},
		defaultOrderBy: "timestamp",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
