import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
	index,
	type PgColumn,
	type pgSchema,
	pgTable,
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
	type RoleJSON,
	columns as roleColumns,
	indexes as roleIndexes,
	T_Roles,
} from "./role";

export const tablename = "role_claims";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,
	role_id: uuid()
		.references(() => T_Roles.id, { onDelete: "cascade" })
		.notNull(),
	claim_id: uuid()
		.references(() => T_Claims.id, { onDelete: "cascade" })
		.notNull(),
};

export const indexes = (table: {
	role_id: PgColumn;
	claim_id: PgColumn;
	is_active: PgColumn;
	created_at: PgColumn;
}) => [
	unique("unique_role_claim").on(table.role_id, table.claim_id),
	index().on(table.role_id),
	index().on(table.claim_id),
];

export const T_RoleClaims = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	const roleTable = schema.table("roles", roleColumns, roleIndexes);
	const claimTable = schema.table("claims", claimColumns, claimIndexes);

	return schema.table(
		tablename,
		{
			...columns,
			role_id: uuid()
				.references(() => roleTable.id, { onDelete: "cascade" })
				.notNull(),
			claim_id: uuid()
				.references(() => claimTable.id, { onDelete: "cascade" })
				.notNull(),
		},
		(table) => [
			unique("unique_role_claim").on(table.role_id, table.claim_id),
			index().on(table.role_id),
			index().on(table.claim_id),
		],
	);
}

export type RoleClaim = InferSelectModel<typeof T_RoleClaims>;
export type RoleClaimJSON = InferSerializedSelectModel<typeof T_RoleClaims> & {
	role?: RoleJSON;
	claim?: ClaimJSON;
};

export type Create = Omit<RoleClaim, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "role_id" | "claim_id";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		role_id?: string;
		claim_id?: string;
	};
	relations?: string[];
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: RoleClaimJSON[];
	pagination: Pagination;
};

export const store: RoleClaimJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_RoleClaims", columns, {
		fields: {
			extraFields: {
				role_name: {
					column: "name",
					type: "string",
					searchable: true,
					filterable: true,
					sortable: false,
					operators: ["eq", "in", "ilike"],
					fromRelation: "role",
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
		relations: inferBelongsToRelationsFromTable(T_RoleClaims).filter(
			(relation) => relation.name === "role" || relation.name === "claim",
		),
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
