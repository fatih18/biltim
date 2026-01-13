import type { Row } from "../types";

export type IdValue = string | number;

/**
 * Extracts unique IDs from an array of records
 */
export function extractUniqueIds(records: Row[], keyName = "id"): IdValue[] {
	return Array.from(
		new Set(
			records
				.map((r) => r[keyName as keyof typeof r] as IdValue)
				.filter((v): v is IdValue => v !== null && v !== undefined),
		),
	);
}

/**
 * Filters records by a foreign key value
 */
export function filterByForeignKey(
	records: Row[],
	foreignKey: string,
	targetId: IdValue,
): Row[] {
	return records.filter(
		(r) => (r[foreignKey as keyof typeof r] as IdValue) === targetId,
	);
}
