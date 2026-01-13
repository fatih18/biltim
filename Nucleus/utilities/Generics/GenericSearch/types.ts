import type { AnyColumn, SQL } from "drizzle-orm";
import type { EntityName } from "../GenericAction/resolver";
import type { DbEntityWithId } from "../GenericAction/types";

// Base utility types
export type Primitive = string | number | boolean | Date | null;

// Depth-limited nested row structure to avoid TS2456 circular alias error
export type RowLeaf = Primitive | Primitive[];
export type RowLevel1 = Record<string, RowLeaf>;
export type RowLevel2 = Record<string, RowLeaf | RowLevel1 | RowLevel1[]>;
export type RowLevel3 = Record<
	string,
	RowLeaf | RowLevel1 | RowLevel2 | RowLevel1[] | RowLevel2[]
>;
export type Row = RowLevel3;

// Types for configuration
export type FilterOperator =
	| "eq"
	| "ne"
	| "gt"
	| "gte"
	| "lt"
	| "lte"
	| "like"
	| "ilike"
	| "in"
	| "isNull"
	| "isNotNull";

export type FieldType = "string" | "number" | "boolean" | "date" | "enum";

export type TransformInput = Primitive | Primitive[];
export type TransformOutput = Primitive | Primitive[];

export type FieldConfig = {
	column: string;
	type: FieldType;
	searchable?: boolean;
	filterable?: boolean;
	sortable?: boolean;
	operators?: FilterOperator[];
	transform?: (value: TransformInput) => TransformOutput;
	// New: specify if this field is from a relation
	fromRelation?: string; // e.g., 'profile' for profile?.first_name
};

// Field selection types
export type FieldSelection = {
	select?: string[]; // Sadece bu alanları dahil et
	exclude?: string[]; // Bu alanları hariç tut
};

// Drizzle "with" selector type (recursive, no unknown/any)
export type WithSelector = true | { [key: string]: WithSelector };

// Helper types for Drizzle callback contexts (keep signatures minimal and SQL-focused)
export type SqlTaggedTemplate = (
	strings: TemplateStringsArray,
	...expr: Array<SQL | AnyColumn | string | number | boolean | Date>
) => SQL;

export type DrizzleWhereHelpers = {
	and: (...args: SQL[]) => SQL;
	or: (...args: SQL[]) => SQL;
	eq: (a: AnyColumn, b: string | number | boolean | Date) => SQL;
	ne: (a: AnyColumn, b: string | number | boolean | Date) => SQL;
	gt: (a: AnyColumn, b: string | number | boolean | Date) => SQL;
	gte: (a: AnyColumn, b: string | number | boolean | Date) => SQL;
	lt: (a: AnyColumn, b: string | number | boolean | Date) => SQL;
	lte: (a: AnyColumn, b: string | number | boolean | Date) => SQL;
	ilike: (a: AnyColumn, b: string) => SQL;
	inArray: (
		column: AnyColumn,
		values: Array<string | number | boolean | Date>,
	) => SQL;
	sql: SqlTaggedTemplate;
};

export type DrizzleOrderHelpers = {
	asc: (expr: SQL | AnyColumn) => SQL;
	desc: (expr: SQL | AnyColumn) => SQL;
	sql: SqlTaggedTemplate;
};

// Enhanced relation config to work with Drizzle's query API
export type ChildRelationConfig = {
	name: string;
	type: "one-to-one" | "one-to-many" | "many-to-many" | "belongs-to";
	targetTable: EntityName;
	through?: {
		table: EntityName;
		localKey: string;
		targetKey: string;
	};
	foreignKey?: string;
	localKey?: string;
	includeJunctionFields?: string[];
	junctionFieldsKey?: string; // Custom key name for junction fields (default: "relation")
	where?: (table: DbEntityWithId) => SQL;
	orderBy?: { field: string; direction: "asc" | "desc" }[];
	limit?: number;
	// Nested child relations (recursive)
	childRelations?: ChildRelationConfig[];
	// Field selection for this relation
	fieldSelection?: FieldSelection;
	// Schemas in which this relation should be disabled
	excluded_schemas?: string[];
};

export type HybridRelationConfig = {
	name: string;
	// Use Drizzle's native relations if available
	useDrizzleRelation?: boolean;

	// For Drizzle relations - just specify what to include
	with?: WithSelector; // Nested with clauses for Drizzle

	// For manual relations (when Drizzle relations not set up)
	type?: "one-to-one" | "one-to-many" | "many-to-many" | "belongs-to";
	targetTable?: EntityName;
	through?: {
		table: EntityName;
		localKey: string;
		targetKey: string;
	};
	foreignKey?: string;
	localKey?: string;
	includeJunctionFields?: string[];
	junctionFieldsKey?: string; // Custom key name for junction fields (default: "relation")
	where?: (table: DbEntityWithId) => SQL;
	orderBy?: { field: string; direction: "asc" | "desc" }[];
	limit?: number;
	// New: manual nested relation loading under this relation's target records
	childRelations?: ChildRelationConfig[];
	// Field selection for this relation
	fieldSelection?: FieldSelection;
	// Schemas in which this relation should be disabled
	excluded_schemas?: string[];
};

// Filters
export type FilterPrimitive = string | number | boolean | Date;
export type FilterValueObject = {
	operator: FilterOperator;
	value: FilterPrimitive | FilterPrimitive[];
};
export type FiltersRecord = Record<
	string,
	FilterPrimitive | FilterPrimitive[] | FilterValueObject
>;

export type HybridSearchConfig = {
	table_name: string;
	fields: Record<string, FieldConfig>;
	relations?: HybridRelationConfig[];
	defaultOrderBy?: string;
	defaultOrderDirection?: "asc" | "desc";
	maxLimit?: number;

	// New: Use Drizzle's query API when available
	useDrizzleQuery?: boolean;

	// Field selection for the main entity
	fieldSelection?: FieldSelection;

	// For complex cases, allow custom query builder (opaque object)
	customQueryBuilder?: (params: SearchParams) => object;

	// Custom where builder for additional conditions
	customWhereBuilder?: (filters: FiltersRecord) => SQL[];
};

export type SearchParams = {
	page?: number;
	limit?: number;
	search?: string;
	orderBy?: string;
	orderDirection?: "asc" | "desc";
	filters?: FiltersRecord;
	includeRelations?: string[] | boolean;
};

export type PaginationInfo = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
};

export type SearchResult<TData extends Row> = {
	data: TData[];
	pagination: PaginationInfo;
};
