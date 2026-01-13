import type { EntityName } from "../GenericAction/resolver";
import type {
	FieldConfig,
	HybridRelationConfig,
	HybridSearchConfig,
} from "./types";

export function createHybridSearchConfig(
	table_name: EntityName,
	fields: Record<string, Partial<FieldConfig>>,
	relations?: HybridRelationConfig[],
	useDrizzleQuery: boolean = false,
): HybridSearchConfig {
	const defaultFields: Record<string, FieldConfig> = {
		id: {
			column: "id",
			type: "string",
			filterable: true,
			sortable: false,
		},
		created_at: {
			column: "created_at",
			type: "date",
			filterable: true,
			sortable: true,
			operators: ["eq", "gt", "gte", "lt", "lte"],
		},
		updated_at: {
			column: "updated_at",
			type: "date",
			filterable: true,
			sortable: true,
			operators: ["eq", "gt", "gte", "lt", "lte"],
		},
		is_active: {
			column: "is_active",
			type: "boolean",
			filterable: true,
			sortable: false,
		},
	};

	const mergedFields: Record<string, FieldConfig> = {};

	for (const [key, value] of Object.entries({ ...defaultFields, ...fields })) {
		mergedFields[key] = {
			column: value.column || key,
			type: value.type || "string",
			searchable: value.searchable ?? value.type === "string",
			filterable: value.filterable ?? true,
			sortable: value.sortable ?? true,
			operators: value.operators,
			transform: value.transform,
			fromRelation: value.fromRelation,
		};
	}

	return {
		table_name,
		fields: mergedFields,
		relations,
		defaultOrderBy: "created_at",
		defaultOrderDirection: "desc",
		maxLimit: 100,
		useDrizzleQuery,
	};
}
