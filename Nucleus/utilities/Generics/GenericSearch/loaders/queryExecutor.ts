import type { AnyColumn, SQL } from "drizzle-orm";
import { and, asc, desc } from "drizzle-orm";
import type { EntityName } from "../../GenericAction/resolver";
import { resolveEntity } from "../../GenericAction/resolver";
import type { DbEntityWithId } from "../../GenericAction/types";
import { buildDrizzleOrderBy } from "../buildDrizzleOrderBy";
import { buildDrizzleWhere } from "../buildDrizzleWhere";
import { buildDrizzleWith } from "../buildDrizzleWith";
import type {
	HybridSearchConfig,
	Row,
	SearchParams,
	WithSelector,
} from "../types";
import { debugError, debugLog } from "../utils/debugLogger";

/**
 * Database instance from getTenantDB
 * Type represents Drizzle's PostgresJsDatabase but simplified to avoid complex generic constraints
 * In practice this is: PostgresJsDatabase<Record<string, unknown>> & { $client: Sql<{}> }
 * We use a minimal interface to satisfy TypeScript while maintaining flexibility
 */
// biome-ignore lint/suspicious/noExplicitAny: Database type from getTenantDB is complex and varies
type DatabaseInstance = any;

type CountQuery = Promise<Array<{ count: number }>>;
type WhereConditions = SQL[];

type QueryAPI = Record<
	string,
	{
		findMany: (args: {
			with?: WithSelector;
			where?: ReturnType<typeof buildDrizzleWhere>;
			orderBy?: ReturnType<typeof buildDrizzleOrderBy>;
			limit?: number;
			offset?: number;
		}) => Promise<Row[]>;
	}
>;

/**
 * Executes query using Drizzle Query API if available
 */
export async function executeDrizzleQuery(params: {
	db: DatabaseInstance;
	config: HybridSearchConfig;
	searchParams: SearchParams;
	limit: number;
	offset: number;
	countQuery: CountQuery;
}): Promise<{ rows: Row[]; totalCount: number } | null> {
	const { db, config, searchParams, limit, offset, countQuery } = params;

	const queryAPI: QueryAPI | undefined = (db as { query?: QueryAPI }).query;
	const qb =
		config.useDrizzleQuery && queryAPI
			? queryAPI[config.table_name]
			: undefined;

	debugLog("🔍 Drizzle Query API check:", {
		useDrizzleQuery: config.useDrizzleQuery,
		hasQueryAPI: !!queryAPI,
		tableName: config.table_name,
		hasTableInAPI: queryAPI ? !!queryAPI[config.table_name] : false,
		willUseDrizzle: !!qb,
	});

	if (!qb) return null;

	try {
		const withClause = buildDrizzleWith(config, searchParams);
		const whereFunction = buildDrizzleWhere(config, searchParams);
		const orderByFunction = buildDrizzleOrderBy(config, searchParams);

		debugLog("🚀 Attempting Drizzle query with withClause:", withClause);

		const [rows, countRows] = await Promise.all([
			qb.findMany({
				with: withClause,
				where: whereFunction,
				orderBy: orderByFunction,
				limit,
				offset,
			}),
			countQuery,
		]);

		debugLog("✅ Drizzle query SUCCESS, rows:", rows.length);

		return {
			rows: rows as Row[],
			totalCount: countRows[0]?.count || 0,
		};
	} catch (error) {
		debugError("❌ Drizzle query FAILED, falling back to manual:", error);
		return null;
	}
}

/**
 * Executes manual query when Drizzle Query API is not available
 */
export async function executeManualQuery(params: {
	db: DatabaseInstance;
	config: HybridSearchConfig;
	searchParams: SearchParams;
	whereConditions: WhereConditions;
	limit: number;
	offset: number;
	countQuery: CountQuery;
}): Promise<{ rows: Row[]; totalCount: number }> {
	const {
		db,
		config,
		searchParams,
		whereConditions,
		limit,
		offset,
		countQuery,
	} = params;

	const entity = resolveEntity(
		config.table_name as EntityName,
	) as DbEntityWithId & Record<string, AnyColumn>;

	// Determine ordering
	const requestedOrderBy =
		typeof searchParams.orderBy === "string" ? searchParams.orderBy : undefined;
	const effectiveOrderBy =
		requestedOrderBy && config.fields[requestedOrderBy]?.sortable
			? requestedOrderBy
			: config.defaultOrderBy;
	const effectiveOrderDir: "asc" | "desc" =
		searchParams.orderDirection || config.defaultOrderDirection || "asc";
	const orderColumnName = effectiveOrderBy
		? config.fields[effectiveOrderBy]?.column
		: undefined;
	const orderColumn = orderColumnName
		? (entity as Record<string, AnyColumn>)[orderColumnName]
		: undefined;

	const selectBase = db.select().from(entity);
	const withWhere =
		whereConditions.length > 0
			? selectBase.where(and(...whereConditions))
			: selectBase;
	const withOrder = orderColumn
		? withWhere.orderBy(
				effectiveOrderDir === "desc" ? desc(orderColumn) : asc(orderColumn),
			)
		: withWhere;

	const [rows, countRows] = await Promise.all([
		withOrder.limit(limit).offset(offset),
		countQuery,
	]);

	return {
		rows: rows as Row[],
		totalCount: countRows[0]?.count || 0,
	};
}
