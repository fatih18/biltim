import type { AnyColumn, SQL } from "drizzle-orm";
import type {
	DrizzleOrderHelpers,
	HybridSearchConfig,
	SearchParams,
} from "./types";

export function buildDrizzleOrderBy(
	config: HybridSearchConfig,
	params: SearchParams,
) {
	return (
		entity: Record<string, AnyColumn>,
		helpers: DrizzleOrderHelpers,
	): SQL[] => {
		const { asc, desc, sql } = helpers;
		const orderBy = params.orderBy || config.defaultOrderBy || "created_at";
		const orderDirection =
			params.orderDirection || config.defaultOrderDirection || "desc";

		const fieldConfig = config.fields[orderBy];
		const orders: SQL[] = [];

		if (fieldConfig?.sortable && !fieldConfig.fromRelation) {
			const column = entity[fieldConfig.column];
			if (column) {
				if (fieldConfig.type === "string") {
					const expr = sql`lower(${column})`;
					orders.push(orderDirection === "asc" ? asc(expr) : desc(expr));
				} else {
					orders.push(orderDirection === "asc" ? asc(column) : desc(column));
				}
			}
		} else if (entity.created_at) {
			orders.push(
				orderDirection === "asc"
					? asc(entity.created_at)
					: desc(entity.created_at),
			);
		}

		if (entity.id) {
			orders.push(orderDirection === "asc" ? asc(entity.id) : desc(entity.id));
		}

		return orders;
	};
}
