import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import { index, pgSchema, uuid, varchar } from "drizzle-orm/pg-core";
import { inferBelongsToRelationsFromTable } from "../../../Generics/GenericSearch/autoRelations";
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
import {
	type FileJSON,
	columns as fileColumns,
	indexes as fileIndexes,
	T_Files,
} from "./file";
import {
	T_Users,
	type UserJSON,
	columns as userColumns,
	indexes as userIndexes,
} from "./user";

export const tablename = "companies";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,
	owner_id: uuid("owner_id")
		.references(() => T_Users.id)
		.notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	tax_id: varchar("tax_id", { length: 50 }),
	w9: uuid("w9").references(() => T_Files.id),
};

export const T_Companies = createTableForSchema(pgSchema("main"));

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	const userTable = schema.table("users", userColumns, userIndexes);
	const fileTable = schema.table("files", fileColumns, fileIndexes);
	return schema.table(
		tablename,
		{
			...columns,
			owner_id: uuid("owner_id")
				.references(() => userTable.id)
				.notNull(),
			w9: uuid("w9").references(() => fileTable.id),
		},
		(table) => [
			index().on(table.owner_id),
			index().on(table.name),
			index().on(table.tax_id),
		],
	);
}

export type Company = InferSelectModel<typeof T_Companies>;
export type CompanyJSON = InferSerializedSelectModel<typeof T_Companies> & {
	owner: UserJSON;
	w9: FileJSON;
};
export type Create = Omit<Company, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "name";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		// Enter your filters here
		owner_id?: string;
		name?: string;
		tax_id?: string;
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: CompanyJSON[];
	pagination: Pagination;
};

export const store: CompanyJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_Companies", columns, {
		relations: inferBelongsToRelationsFromTable(T_Companies),
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
