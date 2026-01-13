import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
// import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	type PgColumn,
	type pgSchema,
	pgTable,
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
import type { AddressJSON } from "./address";
import { base } from "./base";
import type { FileJSON } from "./file";
import type { PhoneJSON } from "./phone";
import type { ProfileJSON } from "./profile";
import type { RoleJSON } from "./role";
export const tablename = "users";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas = [];
export const columns = {
	...base,
	email: varchar("email", { length: 255 }),
	password: varchar("password", { length: 255 }),

	verified_at: timestamp(),
	last_login_at: timestamp(),
	login_count: integer().default(0),
	is_locked: boolean().default(false),
	locked_until: timestamp(),
	failed_login_attempts: integer().default(0),
	is_god: boolean().default(false),
};

export const indexes = (table: {
	email: PgColumn;
	is_active: PgColumn;
	last_login_at: PgColumn;
	is_locked: PgColumn;
	locked_until: PgColumn;
	failed_login_attempts: PgColumn;
	created_at: PgColumn;
}) => [
	unique().on(table.email),
	index().on(table.email, table.is_active),
	index().on(table.last_login_at),
	index().on(table.is_locked, table.locked_until),
];

export const T_Users = pgTable(tablename, columns, indexes);

export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type User = InferSelectModel<typeof T_Users>;
export type UserJSON = Omit<
	InferSerializedSelectModel<typeof T_Users>,
	"password"
> & {
	profile: ProfileJSON;
	address: AddressJSON[];
	phone: PhoneJSON[];
	files: FileJSON[];
	roles?: RoleJSON[];
};

export type CreateAdmin = Omit<User, DefaultOmitted>;

export type Create = Omit<
	User,
	| DefaultOmitted
	| "verified_at"
	| "last_login_at"
	| "login_count"
	| "is_locked"
	| "locked_until"
	| "failed_login_attempts"
	| "is_god"
> & {
	is_god?: boolean;
};
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "email" | "last_login_at" | "created_at";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		email?: string;
		user_id?: string;
		is_locked?: boolean;
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };

export type ListReturn = {
	data: UserJSON[];
	pagination: Pagination;
};

export const store: UserJSON | undefined = undefined;
export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_Users", columns, {
		fields: {
			// Exclude the raw verified_at key and expose it as email_verified_at
			exclude: ["verified_at"],
			extraFields: {
				email_verified_at: {
					column: "verified_at",
					type: "date",
					searchable: false,
					filterable: true,
					sortable: true,
					operators: ["gte", "lte", "gt", "lt"],
				},
				first_name: {
					column: "first_name",
					type: "string",
					searchable: true,
					filterable: true,
					sortable: false,
					operators: ["eq", "in", "ilike"],
					fromRelation: "profile",
				},
				last_name: {
					column: "last_name",
					type: "string",
					searchable: true,
					filterable: true,
					sortable: false,
					operators: ["eq", "in", "ilike"],
					fromRelation: "profile",
				},
			},
		},
		relations: [
			{
				name: "profile",
				useDrizzleRelation: false,
				type: "one-to-one",
				targetTable: "T_Profiles",
				foreignKey: "user_id",
			},
			{
				name: "addresses",
				useDrizzleRelation: false,
				type: "one-to-many",
				targetTable: "T_Addresses",
				foreignKey: "owner_id",
			},
			{
				name: "phones",
				useDrizzleRelation: false,
				type: "one-to-many",
				targetTable: "T_Phones",
				foreignKey: "owner_id",
			},
			{
				name: "files",
				useDrizzleRelation: false,
				type: "one-to-many",
				targetTable: "T_Files",
				foreignKey: "uploaded_by",
			},
			{
				name: "roles",
				useDrizzleRelation: false,
				type: "many-to-many",
				targetTable: "T_Roles",
				through: {
					table: "T_UserRoles",
					localKey: "user_id",
					targetKey: "role_id",
				},
				includeJunctionFields: ["id"],
			},
		],
		fieldSelection: {
			exclude: ["password"],
		},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
