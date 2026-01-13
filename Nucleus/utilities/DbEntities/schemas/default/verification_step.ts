import type { HybridSearchConfig } from "@monorepo/generics/SearchConfig";
import { createHybridSearchConfigFromColumns } from "@monorepo/generics/SearchConfig";
import type { InferSelectModel } from "drizzle-orm";
import {
	index,
	integer,
	numeric,
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

export const tablename = "verificationSteps";
export const available_app_ids = ["default_be"];
export const available_schemas = ["*"];
export const excluded_schemas: string[] = [];
export const excluded_methods: GenericMethods[] = [];
export const is_formdata = false;

export const columns = {
	...base,
	entity_name: varchar("entity_name", { length: 100 }).notNull(),
	step_order: integer("step_order").notNull().default(1),
	name: varchar("name", { length: 255 }),
	position_x: numeric("position_x"),
	position_y: numeric("position_y"),
};

export const indexes = (_table: {
	entity_name: PgColumn;
	step_order: PgColumn;
}) => [
		index().on(_table.entity_name),
		index().on(_table.entity_name, _table.step_order),
	];

export const T_VerificationSteps = pgTable(tablename, columns, indexes);

export function createTableForSchema(schema: ReturnType<typeof pgSchema>) {
	return schema.table(tablename, columns, indexes);
}

export type VerificationStep = InferSelectModel<typeof T_VerificationSteps>;
export type VerificationStepJSON = InferSerializedSelectModel<
	typeof T_VerificationSteps
>;
export type Create = Omit<VerificationStep, DefaultOmitted>;
export type Read = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy | "step_order" | "name";
	orderDirection?: OrderDirection;
	filters?: DefaultFilter & {
		entity_name?: string;
		step_order?: number;
	};
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
	data: VerificationStepJSON[];
	pagination: Pagination;
};

export const store: VerificationStepJSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig =
	createHybridSearchConfigFromColumns("T_VerificationSteps", columns, {
		relations: [],
		fieldSelection: {},
		defaultOrderBy: "step_order",
		defaultOrderDirection: "asc",
		maxLimit: 100,
		useDrizzleQuery: true,
	});
