import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
	index,
	type PgColumn,
	type pgSchema,
	pgTable,
	timestamp,
	unique,
	uuid,
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
	type ClaimJSON,
	columns as claimColumns,
	indexes as claimIndexes,
	T_Claims,
} from "./claim";
import {
	T_Users,
	type UserJSON,
	columns as userColumns,
	indexes as userIndexes,
} from "./user";
export const tablename = "userClaims";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;
export const columns = {
	...base,
	user_id: uuid()
		.references(() => T_Users.id)
		.notNull(),
	claim_id: uuid()
		.references(() => T_Claims.id)
		.notNull(),
	granted_by: uuid("granted_by").references(() => T_Users.id),

	expires_at: timestamp("expires_at"),
};

export const indexes = (table: {
	user_id: PgColumn;
	claim_id: PgColumn;
	granted_by: PgColumn;
	expires_at: PgColumn;
	is_active: PgColumn;
	created_at: PgColumn;
}) => [
	unique("unique_user_claim_context").on(table.user_id, table.claim_id),
	index().on(table.user_id),
	index().on(table.claim_id),
	index().on(table.expires_at),
];

export const T_UserClaims = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	const userTable = schema.table("users", userColumns, userIndexes);
	const claimTable = schema.table("claims", claimColumns, claimIndexes);

	return schema.table(
		tablename,
		{
			...columns,
			user_id: uuid()
				.references(() => userTable.id)
				.notNull(),
			claim_id: uuid()
				.references(() => claimTable.id)
				.notNull(),
			granted_by: uuid("granted_by").references(() => userTable.id),
		},
		(table) => [
			unique("unique_user_claim_context").on(table.user_id, table.claim_id),
			index().on(table.user_id),
			index().on(table.claim_id),
			index().on(table.expires_at),
		],
	);
}

export type UserClaim = InferSelectModel<typeof T_UserClaims>;
export type UserClaimJSON = InferSerializedSelectModel<typeof T_UserClaims> & {
	user: UserJSON;
	claim: ClaimJSON;
};
export type Create = Omit<UserClaim, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?:
		| DefaultOrderBy
		| "user_id"
		| "claim_id"
		| "granted_by"
		| "expires_at";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		user_id?: string;
		claim_id?: string;
		granted_by?: string;
		expires_at?: string;
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: UserClaimJSON[];
	pagination: Pagination;
};

export const store: UserClaimJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_UserClaims", columns, {
		fields: {
			extraFields: {
				// Relation-derived fields
				user_email: {
					column: "email",
					type: "string",
					searchable: true,
					filterable: true,
					sortable: false,
					operators: ["eq", "in", "ilike"],
					fromRelation: "user",
				},
				claim_action: {
					column: "action",
					type: "string",
					searchable: true,
					filterable: true,
					sortable: false,
					operators: ["eq", "in", "ilike"],
					fromRelation: "claim",
				},
			},
		},
		relations: inferBelongsToRelationsFromTable(T_UserClaims).filter(
			(relation) => relation.name === "user" || relation.name === "claim",
		),
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
