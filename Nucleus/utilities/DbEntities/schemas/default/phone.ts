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
	OwnerType,
	Pagination,
} from "../../types/shared";
import { base } from "./base";

export const tablename = "phones";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,
	// Polymorphic relationship fields
	owner_type: varchar("owner_type", { length: 50 })
		.notNull()
		.$type<OwnerType>(),
	owner_id: uuid("owner_id").notNull(),

	name: varchar("name", { length: 100 }).notNull(),
	type: varchar("type", { length: 50 }), // 'mobile', 'office', 'fax'
	number: varchar("number", { length: 20 }).notNull(),
	country_code: varchar("country_code", { length: 10 }).notNull().default("+1"),
	extension: varchar("extension", { length: 10 }),
};

export const indexes = (table: {
	number: PgColumn;
	type: PgColumn;
	is_active: PgColumn;
	created_at: PgColumn;
	owner_type: PgColumn;
	owner_id: PgColumn;
}) => [
	index().on(table.number),
	index().on(table.type),
	index().on(table.owner_type, table.owner_id),
];

export const T_Phones = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type Phone = InferSelectModel<typeof T_Phones>;
export type PhoneJSON = InferSerializedSelectModel<typeof T_Phones>;
export type Create = Omit<Phone, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "name" | "city" | "state" | "country";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & { city?: string; state?: string };
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: PhoneJSON[];
	pagination: Pagination;
};

export const store: PhoneJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_Phones", columns, {
		relations: [],
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
