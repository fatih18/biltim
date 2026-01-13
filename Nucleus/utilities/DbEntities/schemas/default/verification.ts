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

export const tablename = "verifications";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,
	verifier_id: uuid()
		.references(() => T_Users.id)
		.notNull(),
	signature_id: uuid()
		.references(() => T_Files.id)
		.notNull(),
	entity_id: uuid().notNull(),
	decision: varchar("decision", { length: 50 })
		.$type<"approved" | "rejected" | "pending">()
		.notNull(),
	reason: varchar("reason", { length: 255 }).notNull(),
};

export const indexes = (table: {
	verifier_id: PgColumn;
	signature_id: PgColumn;
	entity_id: PgColumn;
}) => [
	index().on(table.verifier_id),
	index().on(table.signature_id),
	index().on(table.entity_id),
];

export const T_Verifications = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	const userTable = schema.table("users", userColumns, userIndexes);
	const fileTable = schema.table("files", fileColumns, fileIndexes);
	return schema.table(
		tablename,
		{
			...columns,
			verifier_id: uuid()
				.references(() => userTable.id)
				.notNull(),
			signature_id: uuid()
				.references(() => fileTable.id)
				.notNull(),
			entity_id: uuid().notNull(),
		},
		(table) => [
			index().on(table.verifier_id),
			index().on(table.signature_id),
			index().on(table.entity_id),
		],
	);
}

export type Verification = InferSelectModel<typeof T_Verifications>;
export type VerificationJSON = InferSerializedSelectModel<
	typeof T_Verifications
> & {
	verifier: UserJSON;
	signature: FileJSON;
	entity: UserJSON;
};
export type Create = Omit<Verification, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "name";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		verifier_id?: string;
		signature_id?: string;
		entity_id?: string;
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: VerificationJSON[];
	pagination: Pagination;
};

export const store: VerificationJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_Verifications", columns, {
		relations: [
			{
				name: "verifier",
				useDrizzleRelation: false,
				type: "belongs-to",
				targetTable: "T_Users",
				localKey: "verifier_id",
				childRelations: [
					{
						name: "profile",
						type: "one-to-one",
						targetTable: "T_Profiles",
						foreignKey: "user_id",
					},
				],
			},
			// Let Drizzle native relations handle signature via FK
			...inferBelongsToRelationsFromTable(T_Verifications).filter(
				(relation) => relation.name === "signature",
			),
			{
				name: "entity",
				useDrizzleRelation: false,
				type: "belongs-to",
				targetTable: "T_Users",
				localKey: "entity_id",
			},
		],
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
