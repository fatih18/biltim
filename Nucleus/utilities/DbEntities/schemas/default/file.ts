import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
	bigint,
	index,
	type PgColumn,
	type pgSchema,
	pgTable,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
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
	T_Users,
	type UserJSON,
	columns as userColumns,
	indexes as userIndexes,
} from "./user";

export type FileTypes =
	| "image"
	| "document"
	| "video"
	| "audio"
	| "profile_picture";

export const tablename = "files";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = true;
export const columns = {
	...base,
	name: varchar("name", { length: 255 }).notNull(),
	original_name: varchar("original_name", { length: 255 }).notNull(),
	type: varchar("type", { length: 50 }).$type<FileTypes>(),
	path: varchar("path", { length: 500 }).notNull(),
	size: bigint("size", { mode: "number" }).notNull(),
	mime_type: varchar("mime_type", { length: 100 }).notNull(),
	extension: varchar("extension", { length: 10 }).notNull(),
	uploaded_by: uuid("uploaded_by").references(() => T_Users.id),
};

export const indexes = (table: {
	type: PgColumn;
	uploaded_by: PgColumn;
	size: PgColumn;
	is_active: PgColumn;
	created_at: PgColumn;
}) => [
	index().on(table.type),
	index().on(table.uploaded_by),
	index().on(table.size),
];

export const T_Files = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	const userTable = schema.table("users", userColumns, userIndexes);
	return schema.table(
		tablename,
		{
			...columns,
			uploaded_by: uuid("uploaded_by").references(() => userTable.id),
		},
		(table) => [
			index().on(table.type),
			index().on(table.uploaded_by),
			index().on(table.size),
		],
	);
}

export type File = InferSelectModel<typeof T_Files>;
export type FileJSON = InferSerializedSelectModel<typeof T_Files> & {
	uploaded_by_user: UserJSON;
};
export type Create = Omit<File, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "name" | "type";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & { type?: string };
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: FileJSON[];
	pagination: Pagination;
};

export const store: FileJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_Files", columns, {
		fields: {
			extraFields: {
				// Relation-derived fields
				uploaded_by_email: {
					column: "email",
					type: "string",
					searchable: true,
					filterable: true,
					sortable: false,
					operators: ["eq", "in", "ilike"],
					fromRelation: "uploaded_by_user",
				},
			},
		},
		relations: inferBelongsToRelationsFromTable(T_Files, {
			rename: ({
				localColumn,
				foreignTable,
				defaultName,
			}: {
				localColumn: string;
				foreignTable: string;
				defaultName: string;
			}) => {
				// files.uploaded_by -> users.id  => uploaded_by_user
				if (localColumn === "uploaded_by" && foreignTable === "users") {
					return "uploaded_by_user";
				}
				return defaultName;
			},
		}).map((relation) =>
			relation.name === "uploaded_by_user"
				? { ...relation, fieldSelection: { exclude: ["password"] } }
				: relation,
		),
		fieldSelection: { exclude: ["path"] },
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
