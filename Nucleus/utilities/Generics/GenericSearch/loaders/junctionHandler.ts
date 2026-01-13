import type { AnyColumn } from "drizzle-orm";
import { inArray } from "drizzle-orm";
import { resolveEntity } from "../../GenericAction/resolver";
import type { DbEntityWithId } from "../../GenericAction/types";
import { applyFieldSelection } from "../fieldSelection";
import type { ChildRelationConfig, Primitive, Row } from "../types";
import type { IdValue } from "../utils/idExtraction";
import { extractUniqueIds } from "../utils/idExtraction";

/**
 * Handles junction table loading for many-to-many relations
 */
// biome-ignore lint/suspicious/noExplicitAny: Database type from getTenantDB is complex and varies
type DatabaseInstance = any;

export async function loadManyToManyRelation(params: {
	db: DatabaseInstance;
	parentIds: IdValue[];
	relationConfig: Pick<
		ChildRelationConfig,
		| "through"
		| "targetTable"
		| "includeJunctionFields"
		| "junctionFieldsKey"
		| "fieldSelection"
		| "where"
		| "orderBy"
		| "limit"
	>;
}): Promise<{
	junctionRecords: Row[];
	targetRecords: Row[];
	targetMap: Map<IdValue, Row>;
}> {
	const { db, parentIds, relationConfig } = params;
	const { through, targetTable, where, orderBy, limit } = relationConfig;

	if (!through || !targetTable) {
		return {
			junctionRecords: [],
			targetRecords: [],
			targetMap: new Map(),
		};
	}

	// Load junction table records
	const junctionEntity = resolveEntity(through.table) as DbEntityWithId &
		Record<string, AnyColumn>;
	const jLocalCol = (junctionEntity as Record<string, AnyColumn>)[
		through.localKey
	];

	const junctionRecords =
		parentIds.length > 0 && jLocalCol
			? await db
					.select()
					.from(junctionEntity)
					.where(inArray(jLocalCol, parentIds))
			: ([] as Row[]);

	if (junctionRecords.length === 0) {
		return {
			junctionRecords: [],
			targetRecords: [],
			targetMap: new Map(),
		};
	}

	// Extract target IDs from junction
	const targetIds = extractUniqueIds(junctionRecords, through.targetKey);

	// Load target records with optional where condition
	const targetEntity = resolveEntity(targetTable) as DbEntityWithId &
		Record<string, AnyColumn>;

	const baseCondition = inArray(targetEntity.id, targetIds);
	const extraCondition = where
		? where(targetEntity as DbEntityWithId)
		: undefined;
	const finalCondition = extraCondition
		? (await import("drizzle-orm")).and(baseCondition, extraCondition)
		: baseCondition;

	let query = db.select().from(targetEntity).where(finalCondition);

	// Apply orderBy if specified
	if (orderBy && orderBy.length > 0) {
		const { asc, desc } = await import("drizzle-orm");
		const orderClauses: (ReturnType<typeof asc> | ReturnType<typeof desc>)[] =
			[];
		for (const { field, direction } of orderBy) {
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
	if (limit && limit > 0) {
		query = query.limit(limit);
	}

	const targetRecords =
		targetIds.length > 0 ? ((await query) as Row[]) : ([] as Row[]);

	// Apply field selection
	const filteredRecords = applyFieldSelection(
		targetRecords,
		relationConfig.fieldSelection,
	) as Row[];

	const targetMap = new Map<IdValue, Row>(
		filteredRecords.map((t) => [t.id as IdValue, t]),
	);

	return { junctionRecords, targetRecords: filteredRecords, targetMap };
}

/**
 * Attaches junction fields to a record
 */
export function attachJunctionFields(params: {
	record: Row;
	junctionRecord: Row;
	includeJunctionFields?: string[];
	junctionFieldsKey?: string;
}): Row {
	const {
		record,
		junctionRecord,
		includeJunctionFields,
		junctionFieldsKey = "relation",
	} = params;

	if (!includeJunctionFields || includeJunctionFields.length === 0) {
		return record;
	}

	const relFields: Record<string, Primitive> = {};
	for (const field of includeJunctionFields) {
		relFields[field] = junctionRecord[
			field as keyof typeof junctionRecord
		] as Primitive;
	}

	return {
		...record,
		[junctionFieldsKey]: relFields,
	};
}

/**
 * Maps junction records to target records with junction fields
 */
export function mapJunctionToTargets(params: {
	junctionRecords: Row[];
	targetMap: Map<IdValue, Row>;
	through: { localKey: string; targetKey: string };
	parentId: IdValue;
	includeJunctionFields?: string[];
	junctionFieldsKey?: string;
}): Row[] {
	const {
		junctionRecords,
		targetMap,
		through,
		parentId,
		includeJunctionFields,
		junctionFieldsKey,
	} = params;

	const relatedJunctions = junctionRecords.filter(
		(j) => (j[through.localKey as keyof typeof j] as IdValue) === parentId,
	);

	return relatedJunctions
		.map((j) => {
			const target = targetMap.get(
				j[through.targetKey as keyof typeof j] as IdValue,
			);
			if (!target) return null;

			return attachJunctionFields({
				record: target,
				junctionRecord: j,
				includeJunctionFields,
				junctionFieldsKey,
			});
		})
		.filter((v): v is Row => Boolean(v));
}
