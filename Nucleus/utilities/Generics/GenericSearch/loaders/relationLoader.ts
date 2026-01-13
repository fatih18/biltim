import type { AnyColumn } from "drizzle-orm";
import { asc, desc, inArray } from "drizzle-orm";
import { resolveEntity } from "../../GenericAction/resolver";
import type { DbEntityWithId } from "../../GenericAction/types";
import { applyFieldSelection } from "../fieldSelection";
import type { HybridRelationConfig, Row, RowLevel2 } from "../types";
import { debugLog } from "../utils/debugLogger";
import type { IdValue } from "../utils/idExtraction";
import { extractUniqueIds } from "../utils/idExtraction";
import { loadChildRelations } from "./childRelationLoader";
import {
	loadManyToManyRelation,
	mapJunctionToTargets,
} from "./junctionHandler";

// biome-ignore lint/suspicious/noExplicitAny: Database type from getTenantDB is complex and varies
type DatabaseInstance = any;

/**
 * Loads manual relations for main records
 */
export async function loadManualRelations(params: {
	db: DatabaseInstance;
	mainRecords: Row[];
	relations: HybridRelationConfig[];
	tableName: string;
}): Promise<void> {
	const { db, mainRecords, relations, tableName } = params;

	const mainIds = extractUniqueIds(mainRecords);

	for (const relation of relations) {
		if (!relation.targetTable) continue;

		const targetEntity = resolveEntity(relation.targetTable) as DbEntityWithId &
			Record<string, AnyColumn>;

		debugLog(`[RelationLoader] Loading relation: ${relation.name}`, {
			type: relation.type,
			targetTable: relation.targetTable,
		});

		if (relation.type === "many-to-many" && relation.through) {
			await loadManyToManyRelationForRecords({
				db,
				mainRecords,
				mainIds,
				relation,
				targetEntity,
			});
		} else if (
			relation.type === "one-to-many" ||
			relation.type === "one-to-one"
		) {
			await loadOneToManyRelation({
				db,
				mainRecords,
				mainIds,
				relation,
				targetEntity,
				tableName,
			});
		} else if (relation.type === "belongs-to") {
			await loadBelongsToRelation({
				db,
				mainRecords,
				relation,
				targetEntity,
			});
		}
	}
}

/**
 * Loads many-to-many relation for main records
 */
async function loadManyToManyRelationForRecords(params: {
	db: DatabaseInstance;
	mainRecords: Row[];
	mainIds: IdValue[];
	relation: HybridRelationConfig;
	targetEntity: DbEntityWithId & Record<string, AnyColumn>;
}): Promise<void> {
	const { db, mainRecords, mainIds, relation } = params;

	if (!relation.through || !relation.targetTable) return;

	const { junctionRecords, targetRecords, targetMap } =
		await loadManyToManyRelation({
			db,
			parentIds: mainIds,
			relationConfig: {
				through: relation.through,
				targetTable: relation.targetTable,
				includeJunctionFields: relation.includeJunctionFields,
				junctionFieldsKey: relation.junctionFieldsKey,
				fieldSelection: relation.fieldSelection,
				where: relation.where,
				orderBy: relation.orderBy,
				limit: relation.limit,
			},
		});

	if (junctionRecords.length === 0) {
		for (const record of mainRecords) {
			(record as Record<string, Row[]>)[relation.name] = [];
		}
		return;
	}

	// Load child relations for target records
	const childrenBag = await loadChildRelations({
		db,
		parentRecords: targetRecords,
		childRelations: relation.childRelations || [],
	});

	// Attach to main records
	for (const record of mainRecords) {
		const related = mapJunctionToTargets({
			junctionRecords,
			targetMap,
			through: relation.through,
			parentId: record.id as IdValue,
			includeJunctionFields: relation.includeJunctionFields,
			junctionFieldsKey: relation.junctionFieldsKey,
		});

		// Merge child relations
		const relatedWithChildren = related.map((r) => {
			const extra = childrenBag.get(r.id as IdValue) || {};
			return { ...r, ...(extra as RowLevel2) };
		});

		(record as Record<string, Row[]>)[relation.name] = relatedWithChildren;
	}
}

/**
 * Loads one-to-many or one-to-one relation
 */
async function loadOneToManyRelation(params: {
	db: DatabaseInstance;
	mainRecords: Row[];
	mainIds: IdValue[];
	relation: HybridRelationConfig;
	targetEntity: DbEntityWithId & Record<string, AnyColumn>;
	tableName: string;
}): Promise<void> {
	const { db, mainRecords, mainIds, relation, targetEntity, tableName } =
		params;

	const foreignKey =
		relation.foreignKey || `${tableName.replace("T_", "").toLowerCase()}_id`;

	debugLog(`[RelationLoader] One-to-many/one-to-one relation:`, {
		name: relation.name,
		foreignKey,
		targetTable: relation.targetTable,
		mainIdsCount: mainIds.length,
	});

	const fkCol = (targetEntity as Record<string, AnyColumn>)[foreignKey];
	let relatedRecords: Row[] = [];

	if (mainIds.length > 0 && fkCol) {
		let query = db.select().from(targetEntity).where(inArray(fkCol, mainIds));

		// Apply orderBy if specified
		if (relation.orderBy && relation.orderBy.length > 0) {
			const orderClauses: (ReturnType<typeof asc> | ReturnType<typeof desc>)[] =
				[];
			for (const { field, direction } of relation.orderBy) {
				const col = (targetEntity as Record<string, AnyColumn>)[field];
				if (col) {
					orderClauses.push(direction === "desc" ? desc(col) : asc(col));
				}
			}
			if (orderClauses.length > 0) {
				query = query.orderBy(...orderClauses);
			}
		}

		// Apply limit if specified
		if (relation.limit && relation.limit > 0) {
			query = query.limit(relation.limit);
		}

		relatedRecords = (await query) as Row[];

		debugLog(
			`[RelationLoader] Related records loaded: ${relatedRecords.length}`,
		);
	}

	// Apply field selection
	relatedRecords = applyFieldSelection(
		relatedRecords,
		relation.fieldSelection,
	) as Row[];

	// Load child relations
	const childrenBag = await loadChildRelations({
		db,
		parentRecords: relatedRecords,
		childRelations: relation.childRelations || [],
	});

	// Attach to main records
	for (const record of mainRecords) {
		const related = relatedRecords
			.filter(
				(r) =>
					(r[foreignKey as keyof typeof r] as IdValue) ===
					(record.id as IdValue),
			)
			.map((r) => {
				const extra = childrenBag.get(r.id as IdValue) || {};
				return { ...(r as Row), ...(extra as RowLevel2) };
			});

		if (relation.type === "one-to-one") {
			(record as Record<string, Row | null>)[relation.name] =
				(related[0] as Row) || null;
		} else {
			(record as Record<string, Row[]>)[relation.name] = related as Row[];
		}
	}
}

/**
 * Loads belongs-to relation
 */
async function loadBelongsToRelation(params: {
	db: DatabaseInstance;
	mainRecords: Row[];
	relation: HybridRelationConfig;
	targetEntity: DbEntityWithId & Record<string, AnyColumn>;
}): Promise<void> {
	const { db, mainRecords, relation, targetEntity } = params;

	const defaultLocalKey = relation.targetTable
		? `${String(relation.targetTable).replace("T_", "").toLowerCase()}_id`
		: "id";
	const localKey = relation.localKey || relation.foreignKey || defaultLocalKey;

	debugLog(`[RelationLoader] Belongs-to relation:`, {
		name: relation.name,
		localKey,
		targetTable: relation.targetTable,
		hasChildRelations: !!relation.childRelations,
	});

	const foreignIds = extractUniqueIds(mainRecords, localKey);

	debugLog(`[RelationLoader] Foreign IDs to fetch: ${foreignIds.length}`);

	let query = db
		.select()
		.from(targetEntity)
		.where(inArray((targetEntity as DbEntityWithId).id, foreignIds));

	// Apply orderBy if specified
	if (relation.orderBy && relation.orderBy.length > 0) {
		const orderClauses: (ReturnType<typeof asc> | ReturnType<typeof desc>)[] =
			[];
		for (const { field, direction } of relation.orderBy) {
			const col = (targetEntity as Record<string, AnyColumn>)[field];
			if (col) {
				orderClauses.push(direction === "desc" ? desc(col) : asc(col));
			}
		}
		if (orderClauses.length > 0) {
			query = query.orderBy(...orderClauses);
		}
	}

	// Apply limit if specified
	if (relation.limit && relation.limit > 0) {
		query = query.limit(relation.limit);
	}

	const targetRows =
		foreignIds.length > 0 ? ((await query) as Row[]) : ([] as Row[]);

	debugLog(`[RelationLoader] Belongs-to records loaded: ${targetRows.length}`);

	// Apply field selection
	const filteredTargetRows = applyFieldSelection(
		targetRows,
		relation.fieldSelection,
	) as Row[];

	// Load child relations
	const childrenBag = await loadChildRelations({
		db,
		parentRecords: filteredTargetRows,
		childRelations: relation.childRelations || [],
	});

	const tMap = new Map<IdValue, Row>(
		filteredTargetRows.map((t) => [t.id as IdValue, t]),
	);

	// Attach to main records
	for (const record of mainRecords) {
		const fid = record[localKey as keyof typeof record] as IdValue;
		const targetRecord = fid ? tMap.get(fid) || null : null;

		if (targetRecord) {
			const extra = childrenBag.get(targetRecord.id as IdValue) || {};
			(record as Record<string, Row | null>)[relation.name] = {
				...targetRecord,
				...extra,
			} as Row;
		} else {
			(record as Record<string, Row | null>)[relation.name] = null;
		}
	}
}
