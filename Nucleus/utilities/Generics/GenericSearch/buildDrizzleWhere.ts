/** biome-ignore-all lint/complexity/noUselessContinue: <> */

import type { AnyColumn, SQL } from "drizzle-orm";
import { sql as sqlBuilder } from "drizzle-orm";
import { getTableName } from "drizzle-orm/table";
import type { EntityName } from "../GenericAction/resolver";
import { resolveEntity } from "../GenericAction/resolver";
import type { DbEntityWithId } from "../GenericAction/types";
import { buildRelationFilterCondition } from "./relationFilters";
import type {
	DrizzleWhereHelpers,
	FilterOperator,
	HybridSearchConfig,
	SearchParams,
} from "./types";

export function buildDrizzleWhere(
	config: HybridSearchConfig,
	params: SearchParams,
) {
	return (
		entity: Record<string, AnyColumn>,
		{
			and,
			or,
			eq,
			gte,
			lte,
			gt,
			lt,
			ne,
			ilike,
			inArray: inArrayHelper,
			sql,
		}: DrizzleWhereHelpers,
	): SQL | undefined => {
		const conditions: SQL[] = [];

		// Search conditions
		if (params.search) {
			const searchConditions: SQL[] = [];
			const like = `%${params.search}%`;

			// Search in main entity fields
			for (const [_fieldName, fieldConfig] of Object.entries(config.fields)) {
				if (fieldConfig.searchable && !fieldConfig.fromRelation) {
					const column = entity[fieldConfig.column];
					if (!column) continue;

					if (fieldConfig.type === "string") {
						searchConditions.push(ilike(column, like));
					} else if (fieldConfig.type === "number") {
						const numValue = Number(params.search);
						if (!Number.isNaN(numValue)) {
							searchConditions.push(eq(column, numValue));
						}
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
				if (!relation || !relation.targetTable || !relation.foreignKey)
					continue;

				try {
					const relEntity = resolveEntity(
						relation.targetTable as EntityName,
					) as DbEntityWithId & Record<string, AnyColumn>;

					const relForeignKey = (relEntity as Record<string, AnyColumn>)[
						relation.foreignKey
					];
					if (!relForeignKey) continue;

					// Build OR conditions for all searchable fields in this relation
					const relConditions: SQL[] = [];
					for (const field of fields) {
						const relColumn = (relEntity as Record<string, AnyColumn>)[
							field.column
						];
						if (!relColumn) continue;

						if (field.type === "string") {
							relConditions.push(ilike(relColumn, like));
						} else if (field.type === "number") {
							const numValue = Number(params.search);
							if (!Number.isNaN(numValue)) {
								relConditions.push(eq(relColumn, numValue));
							}
						}
					}

					if (relConditions.length > 0 && entity.id) {
						// Create subquery using module-level sql builder
						const relOrConditions = or(...relConditions);
						// Get table name from the actual entity using getTableName
						const fullTableName = getTableName(relEntity);
						const tableIdentifier = sqlBuilder.identifier(fullTableName);
						const subqueryCond = sqlBuilder`${entity.id} IN (SELECT ${relForeignKey} FROM ${tableIdentifier} WHERE ${relOrConditions})`;
						searchConditions.push(subqueryCond);
					}
				} catch {
					// Skip relation if entity resolution fails
					continue;
				}
			}

			if (searchConditions.length > 0) {
				conditions.push(or(...searchConditions));
			}
		}

		// Filter conditions
		if (params.filters) {
			for (const [fieldName, filterValue] of Object.entries(params.filters)) {
				if (
					filterValue === undefined ||
					filterValue === null ||
					filterValue === ""
				)
					continue;

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
						entity: entity as unknown as DbEntityWithId &
							Record<string, AnyColumn>,
						helpers: {
							eq,
							ne,
							gt,
							gte,
							lt,
							lte,
							inArray: inArrayHelper,
							ilike,
						},
					});

					if (relationCondition) {
						conditions.push(relationCondition);
					}
					continue;
				}

				const column = entity[fieldConfig.column];
				if (!column) continue;

				if (
					typeof filterValue === "object" &&
					!Array.isArray(filterValue) &&
					!(filterValue instanceof Date)
				) {
					const { operator, value } = filterValue as {
						operator: FilterOperator;
						value:
							| string
							| number
							| boolean
							| Date
							| (string | number | boolean | Date)[];
					};
					const transformedValue = fieldConfig.transform
						? fieldConfig.transform(value)
						: value;

					switch (operator) {
						case "eq":
							conditions.push(
								eq(
									column,
									transformedValue as string | number | boolean | Date,
								),
							);
							break;
						case "ne":
							conditions.push(
								ne(
									column,
									transformedValue as string | number | boolean | Date,
								),
							);
							break;
						case "gt":
							conditions.push(
								gt(
									column,
									transformedValue as string | number | boolean | Date,
								),
							);
							break;
						case "gte":
							conditions.push(
								gte(
									column,
									transformedValue as string | number | boolean | Date,
								),
							);
							break;
						case "lt":
							conditions.push(
								lt(
									column,
									transformedValue as string | number | boolean | Date,
								),
							);
							break;
						case "lte":
							conditions.push(
								lte(
									column,
									transformedValue as string | number | boolean | Date,
								),
							);
							break;
						case "ilike":
							conditions.push(ilike(column, `%${String(transformedValue)}%`));
							break;
						case "isNull":
							conditions.push(sql`${column} IS NULL`);
							break;
						case "isNotNull":
							conditions.push(sql`${column} IS NOT NULL`);
							break;
						case "in":
							if (Array.isArray(transformedValue)) {
								conditions.push(
									inArrayHelper(
										column,
										transformedValue as Array<string | number | boolean | Date>,
									),
								);
							}
							break;
					}
				} else {
					const raw = fieldConfig.transform
						? fieldConfig.transform(
								filterValue as string | number | boolean | Date,
							)
						: (filterValue as string | number | boolean | Date);

					if (raw === null) {
						conditions.push(sql`${column} IS NULL`);
						continue;
					}

					if (fieldConfig.type === "boolean") {
						const boolValue =
							typeof raw === "boolean" ? raw : (raw as string) === "true";
						conditions.push(eq(column, boolValue));
					} else if (Array.isArray(raw)) {
						const values = (
							raw as Array<string | number | boolean | Date | null>
						).filter((v): v is string | number | boolean | Date => v !== null);
						if (values.length > 0) {
							const ors = values.map((v) => eq(column, v));
							conditions.push(or(...ors));
						}
					} else if (Array.isArray(filterValue)) {
						const values = (
							filterValue as Array<string | number | boolean | Date | null>
						).filter((v): v is string | number | boolean | Date => v !== null);
						if (values.length > 0) {
							const ors = values.map((v) => eq(column, v));
							conditions.push(or(...ors));
						}
					} else {
						// If the field declares exactly one range operator, use it instead of eq.
						// This supports keys like detected_date_gte / detected_date_lte where the
						// plain string value arrives via query params.
						const singleOp =
							fieldConfig.operators?.length === 1
								? fieldConfig.operators[0]
								: undefined;
						const typedRaw = raw as string | number | boolean | Date;
						if (singleOp === "gte") {
							conditions.push(gte(column, typedRaw));
						} else if (singleOp === "lte") {
							conditions.push(lte(column, typedRaw));
						} else if (singleOp === "gt") {
							conditions.push(gt(column, typedRaw));
						} else if (singleOp === "lt") {
							conditions.push(lt(column, typedRaw));
						} else {
							conditions.push(eq(column, typedRaw));
						}
					}
				}
			}
		}

		if (config.customWhereBuilder) {
			const extraConditions = config.customWhereBuilder(params.filters || {});
			if (Array.isArray(extraConditions) && extraConditions.length > 0) {
				conditions.push(...extraConditions);
			}
		}

		return conditions.length > 0 ? and(...conditions) : undefined;
	};
}
