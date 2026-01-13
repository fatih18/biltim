import { createHybridSearchConfig } from "../GenericSearch/createHybridSearchConfig";
import { createHybridSearchConfigFromColumns } from "../GenericSearch/createHybridSearchConfigFromColumns";
import type {
	FieldConfig,
	FieldSelection,
	FieldType,
	HybridRelationConfig,
	HybridSearchConfig,
} from "../GenericSearch/types";

// Re-export a client-safe surface for search config definitions.
// IMPORTANT: This module must not import any DB/drizzle-manager code.

export type {
	FieldConfig,
	FieldSelection,
	HybridRelationConfig,
	HybridSearchConfig,
	FieldType,
};

export { createHybridSearchConfig, createHybridSearchConfigFromColumns };
