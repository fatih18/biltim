import type { EntityName } from "../GenericAction/resolver";
import type {
	FieldConfig,
	FieldSelection,
	FieldType,
	HybridRelationConfig,
	HybridSearchConfig,
} from "./types";

// Options for automatic field generation
export type AutoFieldOptions = {
	include?: string[];
	exclude?: string[];
	overrides?: Record<string, Partial<FieldConfig>>;
	extraFields?: Record<string, FieldConfig>;
};

export type AutoSearchConfigOptions = {
	fields?: AutoFieldOptions;
	relations?: HybridRelationConfig[];
	useDrizzleQuery?: boolean;
	defaultOrderBy?: string;
	defaultOrderDirection?: "asc" | "desc";
	maxLimit?: number;
	fieldSelection?: FieldSelection;
};

type AnyColumnLike = {
	dataType?: string;
	columnType?: string;
	name?: string;
	config?: {
		dataType?: string;
		columnType?: string;
		name?: string;
	};
};

function inferFieldType(column: unknown, key: string): FieldType {
	const col = column as AnyColumnLike;
	const dataType = col.dataType ?? col.config?.dataType;

	if (dataType === "number") return "number";
	if (dataType === "boolean") return "boolean";
	if (dataType === "date") return "date";
	if (dataType === "json") return "string";

	const lowerKey = key.toLowerCase();
	if (
		lowerKey === "timestamp" ||
		lowerKey.endsWith("_at") ||
		lowerKey.endsWith("_date")
	) {
		return "date";
	}

	return "string";
}

function buildDefaultFieldConfig(
	key: string,
	column: unknown,
	override?: Partial<FieldConfig>,
): FieldConfig {
	const type: FieldType = override?.type ?? inferFieldType(column, key);
	let searchable = false;
	let filterable = true;
	let sortable = false;
	let operators: FieldConfig["operators"];

	const lowerKey = key.toLowerCase();
	const isIdField = lowerKey === "id" || lowerKey.endsWith("_id");

	if (isIdField) {
		operators = ["eq", "in"];
	} else if (type === "boolean") {
		operators = ["eq"];
	} else if (type === "date") {
		sortable = true;
		operators = ["gte", "lte", "gt", "lt"];
	} else if (type === "number") {
		sortable = true;
		operators = ["eq", "in", "gt", "gte", "lt", "lte"];
	} else {
		if (
			lowerKey === "timestamp" ||
			lowerKey.endsWith("_at") ||
			lowerKey.endsWith("_date")
		) {
			const dateOperators: FieldConfig["operators"] = [
				"gte",
				"lte",
				"gt",
				"lt",
			];
			sortable = true;
			operators = dateOperators;
		} else {
			searchable = true;
			operators = ["eq", "in", "ilike"];
		}
	}

	if (override?.searchable !== undefined) searchable = override.searchable;
	if (override?.filterable !== undefined) filterable = override.filterable;
	if (override?.sortable !== undefined) sortable = override.sortable;
	if (override?.operators !== undefined) operators = override.operators;

	return {
		column: override?.column ?? key,
		type,
		searchable,
		filterable,
		sortable,
		operators,
		transform: override?.transform,
		fromRelation: override?.fromRelation,
	};
}

export function createHybridSearchConfigFromColumns(
	table_name: EntityName,
	columns: Record<string, unknown>,
	options: AutoSearchConfigOptions = {},
): HybridSearchConfig {
	const {
		fields: fieldOptions = {},
		relations,
		useDrizzleQuery,
		defaultOrderBy,
		defaultOrderDirection,
		maxLimit,
		fieldSelection,
	} = options;

	const include = fieldOptions.include;
	const exclude = fieldOptions.exclude ?? [];
	const overrides = fieldOptions.overrides ?? {};
	const extraFields = fieldOptions.extraFields ?? {};

	const autoFieldsEntries = Object.entries(columns)
		.filter(([key]) => {
			if (include && !include.includes(key)) return false;
			if (exclude.includes(key)) return false;
			return true;
		})
		.map(([key, col]) => {
			const override = overrides[key];
			const fieldConfig = buildDefaultFieldConfig(key, col, override);
			return [key, fieldConfig] as const;
		});

	const mergedFields: Record<string, FieldConfig> = {};
	for (const [key, cfg] of autoFieldsEntries) {
		mergedFields[key] = cfg;
	}

	for (const [key, cfg] of Object.entries(extraFields)) {
		mergedFields[key] = cfg;
	}

	return {
		table_name,
		fields: mergedFields,
		relations,
		defaultOrderBy: defaultOrderBy ?? "created_at",
		defaultOrderDirection: defaultOrderDirection ?? "desc",
		maxLimit: maxLimit ?? 100,
		useDrizzleQuery: useDrizzleQuery ?? false,
		fieldSelection,
	};
}
