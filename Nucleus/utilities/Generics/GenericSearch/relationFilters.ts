import { type AnyColumn, type SQL, sql } from "drizzle-orm";
import { getTableName } from "drizzle-orm/table";
import type { EntityName } from "../GenericAction/resolver";
import { resolveEntity } from "../GenericAction/resolver";
import type { DbEntityWithId } from "../GenericAction/types";
import type {
	FieldConfig,
	FilterOperator,
	FilterValueObject,
	HybridRelationConfig,
} from "./types";

export type RelationFilterHelpers = {
	eq: (column: AnyColumn, value: Primitive) => SQL;
	ne: (column: AnyColumn, value: Primitive) => SQL;
	gt: (column: AnyColumn, value: Primitive) => SQL;
	gte: (column: AnyColumn, value: Primitive) => SQL;
	lt: (column: AnyColumn, value: Primitive) => SQL;
	lte: (column: AnyColumn, value: Primitive) => SQL;
	inArray: (column: AnyColumn, values: Primitive[]) => SQL;
	ilike: (column: AnyColumn, value: string) => SQL;
};

type Primitive = string | number | boolean | Date;

type NormalizedFilter = {
	operator: FilterOperator;
	values: Primitive[];
};

export function buildRelationFilterCondition(params: {
	relation: HybridRelationConfig;
	fieldConfig: FieldConfig;
	filterValue: unknown;
	entity: DbEntityWithId & Record<string, AnyColumn>;
	helpers: RelationFilterHelpers;
}): SQL | undefined {
	const { relation, fieldConfig, filterValue, entity, helpers } = params;

	if (!relation.targetTable) return undefined;

	const normalized = normalizeFilterValue(filterValue, fieldConfig);
	if (!normalized) return undefined;

	switch (relation.type) {
		case "belongs-to":
			return buildBelongsToExists({
				relation,
				fieldConfig,
				normalized,
				entity,
				helpers,
			});
		case "one-to-one":
		case "one-to-many":
			return buildOneToManyExists({
				relation,
				fieldConfig,
				normalized,
				entity,
				helpers,
			});
		case "many-to-many":
			return buildManyToManyExists({
				relation,
				fieldConfig,
				normalized,
				entity,
				helpers,
			});
		default:
			return undefined;
	}
}

function normalizeFilterValue(
	filterValue: unknown,
	fieldConfig: FieldConfig,
): NormalizedFilter | undefined {
	if (filterValue === undefined || filterValue === null || filterValue === "") {
		return undefined;
	}

	const wrap = (
		operator: FilterOperator,
		values: unknown[],
	): NormalizedFilter | undefined => {
		const allowed =
			fieldConfig.operators === undefined ||
			fieldConfig.operators.includes(operator);
		if (!allowed) return undefined;

		const transformed = values
			.flatMap((value) => {
				const processed = applyTransform(value, fieldConfig);
				if (processed === undefined || processed === null || processed === "") {
					return [] as Primitive[];
				}
				return Array.isArray(processed)
					? processed.filter((item): item is Primitive => isPrimitive(item))
					: isPrimitive(processed)
						? [processed]
						: [];
			})
			.filter((value): value is Primitive => isPrimitive(value));

		if (transformed.length === 0) return undefined;
		return { operator, values: transformed };
	};

	if (
		typeof filterValue === "object" &&
		!Array.isArray(filterValue) &&
		!(filterValue instanceof Date)
	) {
		const { operator, value } = filterValue as FilterValueObject;
		if (!operator) return undefined;

		switch (operator) {
			case "in":
				if (Array.isArray(value)) {
					return wrap("in", value);
				}
				return undefined;
			case "ilike":
			case "like":
				return wrap(operator, [value]);
			case "eq":
			case "ne":
			case "gt":
			case "gte":
			case "lt":
			case "lte":
				return wrap(operator, [value]);
			default:
				return undefined;
		}
	}

	if (Array.isArray(filterValue)) {
		return wrap("in", filterValue);
	}

	return wrap("eq", [filterValue]);
}

function applyTransform(
	value: unknown,
	fieldConfig: FieldConfig,
): Primitive | Primitive[] | undefined {
	if (!fieldConfig.transform) {
		return value as Primitive | Primitive[] | undefined;
	}
	return fieldConfig.transform(value as never) as
		| Primitive
		| Primitive[]
		| undefined;
}

function isPrimitive(value: unknown): value is Primitive {
	return (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean" ||
		value instanceof Date
	);
}

function getLocalColumn(
	entity: DbEntityWithId & Record<string, AnyColumn>,
	columnName?: string,
): AnyColumn | undefined {
	if (!columnName) return entity.id;
	return entity[columnName as keyof typeof entity];
}

function getColumn(
	entity: DbEntityWithId & Record<string, AnyColumn>,
	columnName?: string,
): AnyColumn | undefined {
	if (!columnName) return undefined;
	return entity[columnName as keyof typeof entity];
}

function applyOperator(
	column: AnyColumn,
	normalized: NormalizedFilter,
	helpers: RelationFilterHelpers,
): SQL | undefined {
	const [first] = normalized.values;

	switch (normalized.operator) {
		case "eq":
			return first !== undefined ? helpers.eq(column, first) : undefined;
		case "ne":
			return first !== undefined ? helpers.ne(column, first) : undefined;
		case "gt":
			return first !== undefined ? helpers.gt(column, first) : undefined;
		case "gte":
			return first !== undefined ? helpers.gte(column, first) : undefined;
		case "lt":
			return first !== undefined ? helpers.lt(column, first) : undefined;
		case "lte":
			return first !== undefined ? helpers.lte(column, first) : undefined;
		case "in":
			return normalized.values.length > 0
				? helpers.inArray(column, normalized.values)
				: undefined;
		case "ilike":
			if (typeof first === "string") {
				return helpers.ilike(column, `%${first}%`);
			}
			return undefined;
		case "like":
			if (typeof first === "string") {
				return sql`${column} LIKE ${`%${first}%`}`;
			}
			return undefined;
		default:
			return undefined;
	}
}

function buildBelongsToExists(params: {
	relation: HybridRelationConfig;
	fieldConfig: FieldConfig;
	normalized: NormalizedFilter;
	entity: DbEntityWithId & Record<string, AnyColumn>;
	helpers: RelationFilterHelpers;
}): SQL | undefined {
	const { relation, fieldConfig, normalized, entity, helpers } = params;
	const localColumn = getLocalColumn(
		entity,
		relation.localKey || relation.foreignKey,
	);
	if (!localColumn || !relation.targetTable) return undefined;

	const targetEntity = resolveEntity(
		relation.targetTable as EntityName,
	) as DbEntityWithId & Record<string, AnyColumn>;
	const targetIdColumn = targetEntity.id;
	if (!targetIdColumn) return undefined;

	const filterColumn =
		getColumn(targetEntity, fieldConfig.column) || targetIdColumn;
	const filterCondition = applyOperator(filterColumn, normalized, helpers);
	if (!filterCondition) return undefined;

	const targetTableId = sql.identifier(getTableName(targetEntity));

	return sql`
		exists (
			select 1
			from ${targetTableId}
			where ${targetIdColumn} = ${localColumn}
				and ${filterCondition}
		)
	`;
}

function buildOneToManyExists(params: {
	relation: HybridRelationConfig;
	fieldConfig: FieldConfig;
	normalized: NormalizedFilter;
	entity: DbEntityWithId & Record<string, AnyColumn>;
	helpers: RelationFilterHelpers;
}): SQL | undefined {
	const { relation, fieldConfig, normalized, entity, helpers } = params;
	if (!relation.targetTable) return undefined;

	const parentColumn = getLocalColumn(entity, relation.localKey) || entity.id;
	const targetEntity = resolveEntity(
		relation.targetTable as EntityName,
	) as DbEntityWithId & Record<string, AnyColumn>;
	const foreignKeyColumn = getColumn(targetEntity, relation.foreignKey);
	if (!foreignKeyColumn) return undefined;

	const filterColumn =
		getColumn(targetEntity, fieldConfig.column) || targetEntity.id;
	const filterCondition = applyOperator(filterColumn, normalized, helpers);
	if (!filterCondition) return undefined;

	const targetTableId = sql.identifier(getTableName(targetEntity));

	return sql`
		exists (
			select 1
			from ${targetTableId}
			where ${foreignKeyColumn} = ${parentColumn}
				and ${filterCondition}
		)
	`;
}

function buildManyToManyExists(params: {
	relation: HybridRelationConfig;
	fieldConfig: FieldConfig;
	normalized: NormalizedFilter;
	entity: DbEntityWithId & Record<string, AnyColumn>;
	helpers: RelationFilterHelpers;
}): SQL | undefined {
	const { relation, fieldConfig, normalized, entity, helpers } = params;
	const through = relation.through;
	if (!through || !relation.targetTable) return undefined;

	const parentColumn = getLocalColumn(entity, relation.localKey) || entity.id;

	const targetEntity = resolveEntity(
		relation.targetTable as EntityName,
	) as DbEntityWithId & Record<string, AnyColumn>;
	const targetIdColumn = targetEntity.id;
	if (!targetIdColumn) return undefined;

	const junctionEntity = resolveEntity(
		through.table as EntityName,
	) as DbEntityWithId & Record<string, AnyColumn>;
	const junctionLocalColumn = getColumn(junctionEntity, through.localKey);
	const junctionTargetColumn = getColumn(junctionEntity, through.targetKey);
	if (!junctionLocalColumn || !junctionTargetColumn) return undefined;

	// Check if the filter field exists on the junction table
	const junctionFilterColumn = getColumn(junctionEntity, fieldConfig.column);

	if (junctionFilterColumn) {
		// Filter on junction table
		const filterCondition = applyOperator(
			junctionFilterColumn,
			normalized,
			helpers,
		);
		if (!filterCondition) return undefined;

		const junctionTableId = sql.identifier(getTableName(junctionEntity));

		return sql`
			exists (
				select 1
				from ${junctionTableId}
				where ${junctionLocalColumn} = ${parentColumn}
					and ${filterCondition}
			)
		`;
	}

	// Otherwise filter on target table
	const filterColumn =
		getColumn(targetEntity, fieldConfig.column) || targetIdColumn;
	const filterCondition = applyOperator(filterColumn, normalized, helpers);
	if (!filterCondition) return undefined;

	const targetTableId = sql.identifier(getTableName(targetEntity));
	const junctionTableId = sql.identifier(getTableName(junctionEntity));

	return sql`
		exists (
			select 1
			from ${junctionTableId}
			where ${junctionLocalColumn} = ${parentColumn}
				and exists (
					select 1
					from ${targetTableId}
					where ${targetIdColumn} = ${junctionTargetColumn}
						and ${filterCondition}
				)
		)
	`;
}
