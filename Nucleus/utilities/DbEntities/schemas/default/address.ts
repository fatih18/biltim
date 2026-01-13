import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
	decimal,
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

export const tablename = "addresses";
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
	street: varchar("street", { length: 255 }),
	city: varchar("city", { length: 100 }),
	state: varchar("state", { length: 50 }),
	zip: varchar("zip", { length: 20 }),
	country: varchar("country", { length: 50 }).default("US"),
	latitude: decimal("latitude", { precision: 10, scale: 8 }),
	longitude: decimal("longitude", { precision: 11, scale: 8 }),
	neighborhood: varchar("neighborhood", { length: 100 }),
	apartment: varchar("apartment", { length: 50 }),
	province: varchar("province", { length: 100 }),
	district: varchar("district", { length: 100 }),
	type: varchar("type", { length: 50 }),
};

export const indexes = (table: {
	is_active: PgColumn;
	created_at: PgColumn;
	city: PgColumn;
	state: PgColumn;
	latitude: PgColumn;
	longitude: PgColumn;
	type: PgColumn;
	owner_type: PgColumn;
	owner_id: PgColumn;
}) => [
	index().on(table.city, table.state),
	index().on(table.latitude, table.longitude),
	index().on(table.type),
	index().on(table.owner_type, table.owner_id),
];

export const T_Addresses = pgTable("addresses", columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, (table) => [
		index().on(table.city, table.state),
		index().on(table.latitude, table.longitude),
		index().on(table.type),
		index().on(table.owner_type, table.owner_id),
	]);
}

export type Address = InferSelectModel<typeof T_Addresses>;
export type AddressJSON = InferSerializedSelectModel<typeof T_Addresses>;
export type Create = Omit<Address, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "name" | "city" | "state" | "country";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		city?: string;
		state?: string;
		owner_type?: OwnerType;
		owner_id?: string;
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: AddressJSON[];
	pagination: Pagination;
};

export const store: AddressJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_Addresses", columns, {
		relations: [],
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
