import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	numeric,
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
	Pagination,
} from "../../types/shared";
import { base } from "./base";

export const tablename = "verificationRequirements";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export type VerifierType = "user" | "role" | "entity_creator";

export const columns = {
	...base,
	entity_id: uuid("entity_id"),
	entity_name: varchar("entity_name", { length: 100 }),
	verifier_type: varchar("verifier_type", { length: 30 }).$type<VerifierType>(),
	verifier_id: uuid("verifier_id"),
	verifier_role: varchar("verifier_role", { length: 50 }),
	is_signature_mandatory: boolean("is_signature_mandatory").notNull(),
	step_order: integer("step_order").notNull().default(1),
	is_all_required: boolean("is_all_required").notNull().default(false),
	connected_from_step_order: integer("connected_from_step_order"),
	position_x: numeric("position_x"),
	position_y: numeric("position_y"),
};

export const indexes = (table: { entity_id: PgColumn }) => [
	index().on(table.entity_id),
];

export const T_VerificationRequirements = pgTable(
	"verificationRequirements",
	columns,
	indexes,
);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type VerificationRequirement = InferSelectModel<
	typeof T_VerificationRequirements
>;
export type VerificationRequirementJSON = InferSerializedSelectModel<
	typeof T_VerificationRequirements
> & {
	entity: unknown;
};
export type Create = Omit<VerificationRequirement, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "name" | "step_order";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		entity_id?: string;
		entity_name?: string;
		verifier_type?: string;
		verifier_role?: string;
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: VerificationRequirementJSON[];
	pagination: Pagination;
};

export const store: VerificationRequirementJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_VerificationRequirements", columns, {
		relations: [],
		fieldSelection: {},
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
