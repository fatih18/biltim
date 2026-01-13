import type { AnyColumn } from "drizzle-orm";
import { asc, desc, inArray } from "drizzle-orm";
import { resolveEntity } from "../../GenericAction/resolver";
import type { DbEntityWithId } from "../../GenericAction/types";
import { applyFieldSelection } from "../fieldSelection";
import type { ChildRelationConfig, Row } from "../types";
import { debugLog } from "../utils/debugLogger";
import type { IdValue } from "../utils/idExtraction";
import { extractUniqueIds } from "../utils/idExtraction";
import {
	loadManyToManyRelation,
	mapJunctionToTargets,
} from "./junctionHandler";

// biome-ignore lint/suspicious/noExplicitAny: Database type from getTenantDB is complex and varies
type DatabaseInstance = any;

/**
 * Loads child relations for a set of parent records
 * This eliminates the massive code duplication across many-to-many, one-to-many, one-to-one, and belongs-to
 */
export async function loadChildRelations(params: {
	db: DatabaseInstance;
	parentRecords: Row[];
	childRelations: ChildRelationConfig[];
}): Promise<Map<IdValue, Record<string, Row | Row[] | null>>> {
	const { db, parentRecords, childRelations } = params;
	const childrenBag = new Map<IdValue, Record<string, Row | Row[] | null>>();

	if (childRelations.length === 0 || parentRecords.length === 0) {
		return childrenBag;
	}

	const parentIds = extractUniqueIds(parentRecords);

	for (const child of childRelations) {
		debugLog("[ChildRelationLoader] Processing child relation:", {
			childName: child.name,
			childType: child.type,
			targetTable: child.targetTable,
			foreignKey: child.foreignKey,
			hasNestedChildren:
				!!child.childRelations && child.childRelations.length > 0,
			nestedChildrenCount: child.childRelations?.length || 0,
		});

		const childTarget = resolveEntity(child.targetTable) as DbEntityWithId &
			Record<string, AnyColumn>;

		if (child.type === "many-to-many" && child.through) {
			await loadChildManyToMany({
				db,
				parentIds,
				child,
				childTarget,
				childrenBag,
			});
		} else if (child.type === "one-to-many" || child.type === "one-to-one") {
			await loadChildOneToMany({
				db,
				parentIds,
				child,
				childTarget,
				childrenBag,
			});
		} else if (child.type === "belongs-to") {
			await loadChildBelongsTo({
				db,
				parentRecords,
				child,
				childTarget,
				childrenBag,
			});
		}
	}

	return childrenBag;
}

/**
 * Loads many-to-many child relations
 */
async function loadChildManyToMany(params: {
	db: DatabaseInstance;
	parentIds: IdValue[];
	child: ChildRelationConfig;
	childTarget: DbEntityWithId & Record<string, AnyColumn>;
	childrenBag: Map<IdValue, Record<string, Row | Row[] | null>>;
}): Promise<void> {
	const { db, parentIds, child, childrenBag } = params;

	if (!child.through) return;

	const { junctionRecords, targetRecords, targetMap } =
		await loadManyToManyRelation({
			db,
			parentIds,
			relationConfig: child,
		});

	// Load nested child relations recursively
	const nestedChildrenBag = await loadChildRelations({
		db,
		parentRecords: targetRecords,
		childRelations: child.childRelations || [],
	});

	// Group by parent ID
	for (const pid of parentIds) {
		const related = mapJunctionToTargets({
			junctionRecords,
			targetMap,
			through: child.through,
			parentId: pid,
			includeJunctionFields: child.includeJunctionFields,
			junctionFieldsKey: child.junctionFieldsKey,
		});

		// Merge nested children into related records
		const relatedWithChildren = related.map((r) => {
			const nestedChildren = nestedChildrenBag.get(r.id as IdValue) || {};
			return { ...r, ...nestedChildren } as Row;
		});

		const bag = childrenBag.get(pid) || {};
		bag[child.name] = relatedWithChildren as Row[];
		childrenBag.set(pid, bag);
	}
}

/**
 * Loads one-to-many or one-to-one child relations
 */
async function loadChildOneToMany(params: {
	db: DatabaseInstance;
	parentIds: IdValue[];
	child: ChildRelationConfig;
	childTarget: DbEntityWithId & Record<string, AnyColumn>;
	childrenBag: Map<IdValue, Record<string, Row | Row[] | null>>;
}): Promise<void> {
	const { db, parentIds, child, childTarget, childrenBag } = params;

	const fk = child.foreignKey || "id";
	const fkCol = (childTarget as Record<string, AnyColumn>)[fk];

	debugLog("[ChildRelationLoader] Child one-to-many/one-to-one:", {
		childName: child.name,
		childType: child.type,
		foreignKey: fk,
		parentIdsCount: parentIds.length,
		hasFkCol: !!fkCol,
	});

	let relRows: Row[] = [];
	if (parentIds.length > 0 && fkCol) {
		let query = db.select().from(childTarget).where(inArray(fkCol, parentIds));

		// Apply orderBy if specified
		if (child.orderBy && child.orderBy.length > 0) {
			const orderClauses: (ReturnType<typeof asc> | ReturnType<typeof desc>)[] =
				[];
			for (const { field, direction } of child.orderBy) {
				const col = (childTarget as Record<string, AnyColumn>)[field];
				if (col) {
					orderClauses.push(direction === "desc" ? desc(col) : asc(col));
				}
			}
			if (orderClauses.length > 0) {
				query = query.orderBy(...orderClauses);
			}
		}

		// Apply limit if specified
		if (child.limit && child.limit > 0) {
			query = query.limit(child.limit);
		}

		relRows = (await query) as Row[];
	}

	// Apply field selection
	const filteredRelRows = applyFieldSelection(
		relRows,
		child.fieldSelection,
	) as Row[];

	// Load nested child relations recursively
	const nestedChildrenBag = await loadChildRelations({
		db,
		parentRecords: filteredRelRows,
		childRelations: child.childRelations || [],
	});

	// Group by parent ID
	for (const pid of parentIds) {
		const matches = filteredRelRows.filter(
			(r) => (r[fk as keyof typeof r] as IdValue) === pid,
		);

		// Merge nested children into matches
		const matchesWithChildren = matches.map((match) => {
			const nestedChildren = nestedChildrenBag.get(match.id as IdValue) || {};
			return { ...match, ...nestedChildren } as Row;
		});

		const bag = childrenBag.get(pid) || {};
		bag[child.name] =
			child.type === "one-to-one"
				? (matchesWithChildren[0] as Row) || null
				: (matchesWithChildren as Row[]);
		childrenBag.set(pid, bag);
	}
}

/**
 * Loads belongs-to child relations
 */
async function loadChildBelongsTo(params: {
	db: DatabaseInstance;
	parentRecords: Row[];
	child: ChildRelationConfig;
	childTarget: DbEntityWithId & Record<string, AnyColumn>;
	childrenBag: Map<IdValue, Record<string, Row | Row[] | null>>;
}): Promise<void> {
	const { db, parentRecords, child, childTarget, childrenBag } = params;

	const foreignKey = child.foreignKey || "id";

	debugLog("[ChildRelationLoader] Child belongs-to:", {
		childName: child.name,
		foreignKey,
		parentRecordsCount: parentRecords.length,
	});

	// Extract foreign key VALUES from parent records
	// Example: Extract Verification.verifier_id values
	const foreignKeyValues = extractUniqueIds(parentRecords, foreignKey);

	debugLog(
		"[ChildRelationLoader] Child belongs-to foreign key values to fetch:",
		{
			foreignKey,
			values: foreignKeyValues,
		},
	);

	// Fetch child records WHERE child.id IN (foreignKeyValues)
	// Example: User.id IN (Verification.verifier_id values)
	let query = db
		.select()
		.from(childTarget)
		.where(inArray((childTarget as DbEntityWithId).id, foreignKeyValues));

	// Apply orderBy if specified
	if (child.orderBy && child.orderBy.length > 0) {
		const orderClauses: (ReturnType<typeof asc> | ReturnType<typeof desc>)[] =
			[];
		for (const { field, direction } of child.orderBy) {
			const col = (childTarget as Record<string, AnyColumn>)[field];
			if (col) {
				orderClauses.push(direction === "desc" ? desc(col) : asc(col));
			}
		}
		if (orderClauses.length > 0) {
			query = query.orderBy(...orderClauses);
		}
	}

	// Apply limit if specified
	if (child.limit && child.limit > 0) {
		query = query.limit(child.limit);
	}

	const childRows =
		foreignKeyValues.length > 0 ? ((await query) as Row[]) : ([] as Row[]);

	debugLog(
		"[ChildRelationLoader] Child belongs-to records loaded:",
		childRows.length,
	);

	// Apply field selection
	const filteredChildRows = applyFieldSelection(
		childRows,
		child.fieldSelection,
	) as Row[];

	// Load nested child relations recursively
	debugLog("[ChildRelationLoader] Loading nested children for belongs-to:", {
		childName: child.name,
		childRecordsCount: filteredChildRows.length,
		hasChildRelations: !!child.childRelations,
		childRelationsCount: child.childRelations?.length || 0,
	});

	const nestedChildrenBag = await loadChildRelations({
		db,
		parentRecords: filteredChildRows,
		childRelations: child.childRelations || [],
	});

	debugLog(
		"[ChildRelationLoader] Nested children bag size:",
		nestedChildrenBag.size,
	);

	// Create map for quick lookup by child.id
	// Map: child.id -> child record
	// Example: User.id -> User record
	const childMap = new Map<IdValue, Row>(
		filteredChildRows.map((c) => [c.id as IdValue, c]),
	);

	// Attach to parent records by matching parent.foreignKey with child.id
	for (const parentRow of parentRecords) {
		const parentId = parentRow.id as IdValue;
		const bag = childrenBag.get(parentId) || {};

		// Get foreign key value from parent (e.g., Verification.verifier_id)
		const foreignKeyValue = parentRow[
			foreignKey as keyof typeof parentRow
		] as IdValue;

		// Lookup child by its id (e.g., User.id)
		const childRecord = foreignKeyValue
			? childMap.get(foreignKeyValue) || null
			: null;

		// Merge nested children if childRecord exists
		if (childRecord) {
			const nestedChildren =
				nestedChildrenBag.get(childRecord.id as IdValue) || {};
			const merged = { ...childRecord, ...nestedChildren } as Row;

			debugLog("[ChildRelationLoader] Merging nested children:", {
				childName: child.name,
				parentId,
				childRecordId: childRecord.id,
				hasNestedChildren: Object.keys(nestedChildren).length > 0,
				nestedChildrenKeys: Object.keys(nestedChildren),
				mergedKeys: Object.keys(merged),
			});

			bag[child.name] = merged;
		} else {
			bag[child.name] = null;
		}

		childrenBag.set(parentId, bag);
	}

	debugLog(
		"[ChildRelationLoader] Child belongs-to attached to",
		childrenBag.size,
	);
}
