import { getTenantDB } from "@monorepo/drizzle-manager";
import type { AnyColumn } from "drizzle-orm";
import { and, sql } from "drizzle-orm";
import type { EntityName } from "../GenericAction/resolver";
import { resolveEntity } from "../GenericAction/resolver";
import type { DbEntityWithId } from "../GenericAction/types";
import { buildWhereConditions } from "./buildWhereConditions";
import {
	applyChildRelationFieldSelection,
	applyFieldSelection,
	applyRelationFieldSelection,
} from "./fieldSelection";
import {
	executeDrizzleQuery,
	executeManualQuery,
} from "./loaders/queryExecutor";
import { loadManualRelations } from "./loaders/relationLoader";
import type {
	ChildRelationConfig,
	HybridRelationConfig,
	HybridSearchConfig,
	Row,
	SearchParams,
	SearchResult,
} from "./types";
import { debugLog } from "./utils/debugLogger";
import { calculatePagination, calculateTotalPages } from "./utils/pagination";

export { DEBUG_MODE } from "./constants";
export { createHybridSearchConfig } from "./createHybridSearchConfig";
export { createHybridSearchConfigFromColumns } from "./createHybridSearchConfigFromColumns";

export async function HybridGenericSearch<T extends Row>({
	schema_name,
	config,
	params = {},
}: {
	schema_name: string;
	config: HybridSearchConfig;
	params?: SearchParams;
}): Promise<SearchResult<T>> {
	debugLog(
		"🔍 HybridGenericSearch params received:",
		JSON.stringify(params, null, 2),
	);

	// Acquire tenant DB (search_path is already managed within getTenantDB)
	const db = await getTenantDB(schema_name);

	// Ensure correct schema for this connection (pool may switch connections)
	try {
		await db.execute(
			sql`SET search_path TO ${sql.identifier(schema_name)}, public`,
		);
	} catch {
		// ignore if not supported; getTenantDB may have already set search_path
	}

	// Pagination
	const { page, limit, offset } = calculatePagination({
		page: params.page,
		limit: params.limit,
		maxLimit: config.maxLimit,
	});

	// Build where conditions for base entity
	const entity = resolveEntity(
		config.table_name as EntityName,
	) as DbEntityWithId & Record<string, AnyColumn>;
	const whereConditions = buildWhereConditions(config, params, entity);
	const countQueryBase = db
		.select({ count: sql<number>`count(*)::int` })
		.from(entity);
	const countQuery =
		whereConditions.length > 0
			? countQueryBase.where(and(...whereConditions))
			: countQueryBase;

	// Try Drizzle query API first (if available and requested)
	let mainRecords: Row[] = [];
	let totalCount = 0;

	const drizzleResult = await executeDrizzleQuery({
		db,
		config,
		searchParams: params,
		limit,
		offset,
		countQuery,
	});

	if (drizzleResult) {
		mainRecords = drizzleResult.rows;
		totalCount = drizzleResult.totalCount;
	} else {
		// Manual base query path (either fallback or no query API)
		const manualResult = await executeManualQuery({
			db,
			config,
			searchParams: params,
			whereConditions,
			limit,
			offset,
			countQuery,
		});
		mainRecords = manualResult.rows;
		totalCount = manualResult.totalCount;
	}

	const totalPages = calculateTotalPages(totalCount, limit);

	// Filter relations based on includeRelations parameter
	const includeConfig = params.includeRelations;
	debugLog("[GenericSearch] includeConfig:", includeConfig);

	const shouldInclude = (name: string): boolean => {
		if (includeConfig === false) return false;
		if (includeConfig === true || includeConfig === undefined) return true;
		if (Array.isArray(includeConfig)) return includeConfig.includes(name);
		return true;
	};

	const relationsForSchema = filterRelationsBySchema(
		config.relations,
		schema_name,
	);
	const relations = relationsForSchema.filter((relation) =>
		shouldInclude(relation.name),
	);

	debugLog(
		"[GenericSearch] All relations:",
		config.relations?.map((relation: HybridRelationConfig) => ({
			name: relation.name,
			useDrizzle: relation.useDrizzleRelation,
			type: relation.type,
			hasChildren: Boolean(relation.childRelations?.length),
		})),
	);

	debugLog(
		"[GenericSearch] Relations after schema filter:",
		relationsForSchema.map((relation: HybridRelationConfig) => ({
			name: relation.name,
			useDrizzle: relation.useDrizzleRelation,
			type: relation.type,
			hasChildren: Boolean(relation.childRelations?.length),
		})),
	);

	debugLog(
		"[GenericSearch] Filtered relations:",
		relations.map((relation: HybridRelationConfig) => ({
			name: relation.name,
			useDrizzle: relation.useDrizzleRelation,
			type: relation.type,
			hasChildren: Boolean(relation.childRelations?.length),
		})),
	);

	const manualRelations = relations.filter((relation) => {
		// Load manually if:
		// 1. Explicitly marked as manual (!useDrizzleRelation), OR
		// 2. Has childRelations (Drizzle can't handle nested custom relations)
		const childCount = relation.childRelations?.length ?? 0;
		const shouldLoadManually =
			!relation.useDrizzleRelation ||
			(relation.childRelations && childCount > 0);

		return Boolean(relation.type && relation.targetTable && shouldLoadManually);
	});

	debugLog(
		"[GenericSearch] Manual relations to load:",
		manualRelations.map((r) => ({
			name: r.name,
			type: r.type,
			targetTable: r.targetTable,
			foreignKey: r.foreignKey,
			childrenCount: r.childRelations?.length || 0,
		})),
	);

	debugLog("[GenericSearch] Main records count:", mainRecords.length);

	// Load manual relations
	if (manualRelations.length > 0 && mainRecords.length > 0) {
		await loadManualRelations({
			db,
			mainRecords,
			relations: manualRelations,
			tableName: config.table_name,
		});
	}

	// Apply field selection to main records
	const finalData = applyFieldSelection(
		mainRecords,
		config.fieldSelection,
	) as T[];

	// Apply field selection to relations if they were loaded via Drizzle native relations
	if (config.useDrizzleQuery && finalData.length > 0 && relations.length > 0) {
		for (const relation of relations) {
			if (relation.useDrizzleRelation && relation.fieldSelection) {
				for (const record of finalData) {
					applyRelationFieldSelection(
						record as Row,
						relation.name,
						relation.fieldSelection,
					);

					// Apply field selection to child relations if they exist
					if (relation.childRelations) {
						for (const child of relation.childRelations) {
							if (child.fieldSelection) {
								applyChildRelationFieldSelection(
									[record as Row],
									relation.name,
									child.name,
									child.fieldSelection,
								);
							}
						}
					}
				}
			}
		}
	}

	return {
		data: finalData,
		pagination: {
			page,
			limit,
			total: totalCount,
			totalPages,
			hasNext: page < totalPages,
			hasPrev: page > 1,
		},
	};
}

function filterRelationsBySchema(
	relations: HybridRelationConfig[] | undefined,
	schema: string,
): HybridRelationConfig[] {
	if (!relations || relations.length === 0) {
		return [];
	}

	return relations
		.filter((relation) => !isSchemaExcluded(relation.excluded_schemas, schema))
		.map((relation) => ({
			...relation,
			childRelations: filterChildRelationsBySchema(
				relation.childRelations,
				schema,
			),
		}));
}

function filterChildRelationsBySchema(
	childRelations: ChildRelationConfig[] | undefined,
	schema: string,
): ChildRelationConfig[] | undefined {
	if (!childRelations || childRelations.length === 0) {
		return childRelations;
	}

	const filtered = childRelations
		.filter((relation) => !isSchemaExcluded(relation.excluded_schemas, schema))
		.map((relation) => ({
			...relation,
			childRelations: filterChildRelationsBySchema(
				relation.childRelations,
				schema,
			),
		}));

	return filtered.length > 0 ? filtered : undefined;
}

function isSchemaExcluded(
	excludedSchemas: string[] | undefined,
	schema: string,
): boolean {
	return Array.isArray(excludedSchemas) && excludedSchemas.includes(schema);
}
