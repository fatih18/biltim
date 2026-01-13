import type { FieldConfig } from "@monorepo/generics";
import type { InferSelectModel } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";

export type DefaultOmitted =
	| "id"
	| "is_active"
	| "created_at"
	| "updated_at"
	| "version";

export type Title =
	| "engineer"
	| "foreman"
	| "superintendent"
	| "construction_manager"
	| "project_manager"
	| "operations_manager"
	| "evp";

export type ProjectStatus = "Completed" | "On Going" | "Paused" | "Cancelled";

export type PayrollType =
	| "Regular"
	| "Overtime"
	| "Holiday"
	| "PTO"
	| "PTO22"
	| "HOLIDAY";

export const defaultSearchFields: Record<string, FieldConfig> = {
	is_active: {
		column: "is_active",
		type: "boolean",
		searchable: false,
		filterable: true,
		sortable: false,
		operators: ["eq"],
	},
	created_at: {
		column: "created_at",
		type: "date",
		searchable: false,
		filterable: true,
		sortable: true,
		operators: ["gte", "lte", "gt", "lt"],
	},
	updated_at: {
		column: "updated_at",
		type: "date",
		searchable: false,
		filterable: true,
		sortable: true,
		operators: ["gte", "lte", "gt", "lt"],
	},
};

// Generic serialization utilities
// - Date -> string (ISO)
// - bigint -> string
// - DecimalNumber (branded) -> string
// - Arrays and nested objects are recursively handled
export type DecimalNumber = number & { readonly __brand_decimal: "pg.decimal" };

export type Serialize<T> = T extends Date
	? string
	: T extends bigint
		? string
		: T extends DecimalNumber
			? string
			: T extends readonly (infer U)[]
				? ReadonlyArray<Serialize<U>>
				: T extends (infer U)[]
					? Array<Serialize<U>>
					: T extends object
						? { [K in keyof T]: Serialize<T[K]> }
						: T;

export type InferSerializedSelectModel<TTable extends AnyPgTable> = Serialize<
	InferSelectModel<TTable>
>;

export type DefaultOrderBy = "created_at" | "updated_at";
export type DefaultFilter = {
	is_active?: boolean;
};

export type OrderDirection = "asc" | "desc";

export type DefaultRead = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: DefaultOrderBy;
	orderDirection?: OrderDirection;
	filters?: DefaultFilter;
};

export type Pagination = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
};

export type OwnerType = "user" | "company" | "organization";

export enum GenericMethods {
	GET = "GET",
	CREATE = "CREATE",
	UPDATE = "UPDATE",
	DELETE = "DELETE",
	TOGGLE = "TOGGLE",
	VERIFICATION = "VERIFICATION",
}
