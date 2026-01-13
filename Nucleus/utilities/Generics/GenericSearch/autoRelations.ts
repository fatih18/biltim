import type { AnyPgTable } from "drizzle-orm/pg-core";
import { getTableName } from "drizzle-orm/table";
import type { EntityName } from "../GenericAction/resolver";
import type { HybridRelationConfig } from "./types";

type InferBelongsToOptions = {
	ignoreColumns?: string[];
	rename?: (info: {
		localColumn: string;
		foreignTable: string;
		defaultName: string;
	}) => string | undefined;
};

const INLINE_FK_SYMBOL = Symbol.for("drizzle:PgInlineForeignKeys");

type ForeignKeyRef = {
	columns?: { name?: string }[];
	foreignColumns?: { table: AnyPgTable }[];
};

type ForeignKeyLike = {
	reference?: () => ForeignKeyRef;
};

type TableWithInlineFks = {
	[INLINE_FK_SYMBOL]?: ForeignKeyLike[];
};

function toEntityName(tableName: string): EntityName {
	if (!tableName) {
		return "T_Users" as EntityName;
	}
	const first = tableName.charAt(0);
	const rest = tableName.slice(1);
	const pascal = `${first.toUpperCase()}${rest}`;
	return `T_${pascal}` as EntityName;
}

function defaultRelationName(
	localColumn: string,
	foreignTable: string,
): string {
	if (localColumn.endsWith("_id")) {
		return localColumn.slice(0, -3);
	}
	if (localColumn.endsWith("_by") && foreignTable === "users") {
		return `${localColumn}_user`;
	}
	return localColumn;
}

export function inferBelongsToRelationsFromTable(
	table: AnyPgTable & TableWithInlineFks,
	options: InferBelongsToOptions = {},
): HybridRelationConfig[] {
	const rawFks = (table[INLINE_FK_SYMBOL] ?? []) as ForeignKeyLike[];
	const ignore = options.ignoreColumns ?? [];

	const relations: HybridRelationConfig[] = [];

	for (const fk of rawFks) {
		const ref = fk.reference?.();
		if (!ref) continue;
		const [localCol] = ref.columns ?? [];
		const [foreignCol] = ref.foreignColumns ?? [];
		if (!localCol?.name || !foreignCol?.table) continue;
		if (ignore.includes(localCol.name)) continue;

		const foreignTable = foreignCol.table;
		const foreignTableName = getTableName(foreignTable);
		const targetTable = toEntityName(foreignTableName);

		const defName = defaultRelationName(localCol.name, foreignTableName);
		const customName =
			options.rename?.({
				localColumn: localCol.name,
				foreignTable: foreignTableName,
				defaultName: defName,
			}) ?? defName;

		relations.push({
			name: customName,
			useDrizzleRelation: true,
			type: "belongs-to",
			targetTable,
			localKey: localCol.name,
		});
	}

	return relations;
}
