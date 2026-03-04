/** biome-ignore-all lint/complexity/noUselessContinue: <> */
import {
	type AnyColumn,
	eq,
	gt,
	gte,
	ilike,
	inArray,
	isNotNull,
	isNull,
	lt,
	lte,
	ne,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import { getTableName } from "drizzle-orm/table";
import type { EntityName } from "../GenericAction/resolver";
import { resolveEntity } from "../GenericAction/resolver";
import type { DbEntityWithId } from "../GenericAction/types";
import { buildRelationFilterCondition } from "./relationFilters";
import type {
	FilterOperator,
	FilterPrimitive,
	HybridSearchConfig,
	SearchParams,
} from "./types";
export function buildWhereConditions(
	config: HybridSearchConfig,
	params: SearchParams,
	entity: DbEntityWithId & Record<string, AnyColumn>,
): SQL[] {
	const whereConditions: SQL[] = [];

	if (params.search) {
		let combinedSearch: SQL | undefined;
		const like = `%${params.search}%`;

		// Search in main entity fields
		for (const [_fieldName, fieldConfig] of Object.entries(config.fields)) {
			if (fieldConfig.searchable && !fieldConfig.fromRelation) {
				const column = entity[fieldConfig.column];
				if (!column) continue;
				let cond: SQL | undefined;
				if (fieldConfig.type === "string") {
					cond = ilike(column, like);
				} else if (fieldConfig.type === "number") {
					const numValue = Number(params.search);
					if (!Number.isNaN(numValue)) {
						cond = eq(column, numValue);
					}
				}
				if (cond) {
					combinedSearch = combinedSearch ? or(combinedSearch, cond) : cond;
				}
			}
		}

		// Search in relation fields using subqueries
		const relationSearchFields = new Map<
			string,
			Array<{ column: string; type: string }>
		>();
		for (const [_fieldName, fieldConfig] of Object.entries(config.fields)) {
			if (fieldConfig.searchable && fieldConfig.fromRelation) {
				const existing = relationSearchFields.get(fieldConfig.fromRelation);
				if (!existing) {
					relationSearchFields.set(fieldConfig.fromRelation, []);
				}
				const fields = relationSearchFields.get(fieldConfig.fromRelation);
				if (fields) {
					fields.push({
						column: fieldConfig.column,
						type: fieldConfig.type,
					});
				}
			}
		}

		// Build subquery conditions for each relation
		for (const [relationName, fields] of relationSearchFields.entries()) {
			const relation = config.relations?.find((r) => r.name === relationName);
			if (!relation || !relation.targetTable || !relation.foreignKey) continue;

			try {
				const relEntity = resolveEntity(
					relation.targetTable as EntityName,
				) as DbEntityWithId & Record<string, AnyColumn>;

				const relForeignKey = (relEntity as Record<string, AnyColumn>)[
					relation.foreignKey
				];
				if (!relForeignKey) continue;

				// Build OR conditions for all searchable fields in this relation
				let relConditions: SQL | undefined;
				for (const field of fields) {
					const relColumn = (relEntity as Record<string, AnyColumn>)[
						field.column
					];
					if (!relColumn) continue;

					let cond: SQL | undefined;
					if (field.type === "string") {
						cond = ilike(relColumn, like);
					} else if (field.type === "number") {
						const numValue = Number(params.search);
						if (!Number.isNaN(numValue)) {
							cond = eq(relColumn, numValue);
						}
					}

					if (cond) {
						relConditions = relConditions ? or(relConditions, cond) : cond;
					}
				}

				if (relConditions && entity.id) {
					// Create subquery: WHERE main.id IN (SELECT rel.foreign_key FROM rel WHERE conditions)
					// Get table name from the actual entity using getTableName
					const fullTableName = getTableName(relEntity);
					const subqueryCond = sql`${entity.id} IN (SELECT ${relForeignKey} FROM ${sql.identifier(fullTableName)} WHERE ${relConditions})`;
					combinedSearch = combinedSearch
						? or(combinedSearch, subqueryCond)
						: subqueryCond;
				}
			} catch {
				// Skip relation if entity resolution fails
				continue;
			}
		}

		if (combinedSearch) {
			whereConditions.push(combinedSearch);
		}
	}

	if (params.filters) {
		for (const [fieldName, filterValue] of Object.entries(params.filters)) {
			const fieldConfig = config.fields[fieldName];
			if (!fieldConfig || !fieldConfig.filterable) continue;

			if (fieldConfig.fromRelation) {
				const relation = config.relations?.find(
					(rel) => rel.name === fieldConfig.fromRelation,
				);
				if (!relation || !relation.type) {
					continue;
				}

				const relationCondition = buildRelationFilterCondition({
					relation,
					fieldConfig,
					filterValue,
					entity,
					helpers: {
						eq,
						ne,
						gt,
						gte,
						lt,
						lte,
						inArray,
						ilike,
					},
				});

				if (relationCondition) {
					whereConditions.push(relationCondition);
				}
				continue;
			}

			const column = entity[fieldConfig.column];
			if (!column) continue;

			// Apply filter based on type and operator
			if (
				typeof filterValue === "object" &&
				!Array.isArray(filterValue) &&
				!(filterValue instanceof Date)
			) {
				const { operator, value } = filterValue as {
					operator: FilterOperator;
					value: FilterPrimitive | FilterPrimitive[];
				};

				if (
					fieldConfig.operators &&
					!fieldConfig.operators.includes(operator)
				) {
					continue;
				}

				// Handle isNull and isNotNull operators (they don't need a value)
				if (operator === "isNull") {
					whereConditions.push(isNull(column));
					continue;
				}
				if (operator === "isNotNull") {
					whereConditions.push(isNotNull(column));
					continue;
				}

				// For other operators, skip if value is null/undefined/empty
				if (value === undefined || value === null || value === "") {
					continue;
				}

				const transformedValue = fieldConfig.transform
					? fieldConfig.transform(value)
					: value;

				switch (operator) {
					case "eq":
						whereConditions.push(eq(column, transformedValue));
						break;
					case "ne":
						whereConditions.push(ne(column, transformedValue));
						break;
					case "gt":
						whereConditions.push(gt(column, transformedValue));
						break;
					case "gte":
						whereConditions.push(gte(column, transformedValue));
						break;
					case "lt":
						whereConditions.push(lt(column, transformedValue));
						break;
					case "lte":
						whereConditions.push(lte(column, transformedValue));
						break;
					case "like":
						whereConditions.push(
							sql`${column} LIKE ${transformedValue as string}`,
						);
						break;
					case "ilike":
						whereConditions.push(ilike(column, transformedValue as string));
						break;
					case "in":
						if (Array.isArray(transformedValue)) {
							whereConditions.push(
								inArray(column, transformedValue as FilterPrimitive[]),
							);
						}
						break;
				}
			} else {
				// Skip if value is null/undefined/empty for simple filters
				if (
					filterValue === undefined ||
					filterValue === null ||
					filterValue === ""
				) {
					continue;
				}

				const transformedValue = fieldConfig.transform
					? fieldConfig.transform(filterValue)
					: filterValue;

				if (fieldConfig.type === "boolean") {
					const boolValue =
						typeof transformedValue === "boolean"
							? transformedValue
							: (transformedValue as string) === "true";
					whereConditions.push(eq(column, boolValue));
				} else if (Array.isArray(transformedValue)) {
					const values = (transformedValue as FilterPrimitive[]).filter(
						(v) => v !== null && v !== undefined && v !== "",
					);
					if (values.length > 0) {
						whereConditions.push(inArray(column, values));
					}
				} else {
					// If the field declares exactly one range operator, use it instead of eq.
					// Supports keys like detected_date_gte / detected_date_lte.
					const singleOp =
						fieldConfig.operators?.length === 1
							? fieldConfig.operators[0]
							: undefined;
					const v = transformedValue as FilterPrimitive;
					if (singleOp === "gte") {
						whereConditions.push(gte(column, v));
					} else if (singleOp === "lte") {
						whereConditions.push(lte(column, v));
					} else if (singleOp === "gt") {
						whereConditions.push(gt(column, v));
					} else if (singleOp === "lt") {
						whereConditions.push(lt(column, v));
					} else {
						whereConditions.push(eq(column, v));
					}
				}
			}
		}
	}

	if (config.customWhereBuilder) {
		whereConditions.push(...config.customWhereBuilder(params.filters || {}));
	}

	return whereConditions;
}
