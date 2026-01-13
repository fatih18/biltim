import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
	boolean,
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

export type Status = "pending" | "confirmed" | "completed" | "cancelled";
export type FormType = "demo" | "booking" | "report";

export const tablename = "demoBookings";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,
	email: varchar("email", { length: 255 }).unique(),
	phone_number: varchar("phone_number", { length: 20 }).notNull(),
	first_name: varchar("first_name", { length: 100 }).notNull(),
	last_name: varchar("last_name", { length: 100 }).notNull(),
	additional_notes: varchar("additional_notes", { length: 1000 }),
	subscribed: boolean("subscribed").default(false),
	form_type: varchar("form_type", { length: 50 })
		.default("demo")
		.$type<FormType>(),
	status: varchar("status", { length: 50 }).default("pending").$type<Status>(),
};

export const indexes = (_table: {
	subscribed: PgColumn;
	form_type: PgColumn;
	status: PgColumn;
}) => [
	index().on(_table.subscribed),
	index().on(_table.form_type),
	index().on(_table.status),
];

export const T_DemoBookings = pgTable("demoBookings", columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type DemoBooking = InferSelectModel<typeof T_DemoBookings>;
export type DemoBookingJSON = InferSerializedSelectModel<typeof T_DemoBookings>;
export type Create = Omit<DemoBooking, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "name";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		subscribed?: boolean;
		status?: Status;
		form_type?: FormType;
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: DemoBookingJSON[];
	pagination: Pagination;
};

export const store: DemoBookingJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_DemoBookings", columns, {
		relations: [],
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
