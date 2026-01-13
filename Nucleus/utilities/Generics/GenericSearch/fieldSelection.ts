import type { FieldSelection, Row } from "./types";

/**
 * Verilen field selection kurallarına göre bir objeyi filtreler
 * @param data - Filtrelenecek veri (tek obje veya array)
 * @param fieldSelection - Select/exclude kuralları
 * @returns Filtrelenmiş veri
 */
export function applyFieldSelection<T extends Row>(
	data: T | T[],
	fieldSelection?: FieldSelection,
): T | T[] {
	if (!fieldSelection || (!fieldSelection.select && !fieldSelection.exclude)) {
		return data;
	}

	const { select, exclude } = fieldSelection;

	// Tek obje için filtreleme
	const filterObject = (obj: T): T => {
		if (!obj || typeof obj !== "object") return obj;

		let filtered = { ...obj } as T;

		// Önce select kuralını uygula (eğer varsa)
		if (select && select.length > 0) {
			const selected = {} as T;
			for (const field of select) {
				if (field in filtered) {
					(selected as Record<string, unknown>)[field] = (
						filtered as Record<string, unknown>
					)[field];
				}
			}
			filtered = selected;
		}

		// Sonra exclude kuralını uygula (eğer varsa)
		if (exclude && exclude.length > 0) {
			for (const field of exclude) {
				delete (filtered as Record<string, unknown>)[field];
			}
		}

		return filtered;
	};

	// Array ise her elemanı filtrele, tek obje ise direkt filtrele
	if (Array.isArray(data)) {
		return data.map(filterObject) as T[];
	} else {
		return filterObject(data as T) as T;
	}
}

/**
 * Nested relation'lar için recursive field selection uygular
 * @param record - Ana kayıt
 * @param relationName - Relation adı
 * @param fieldSelection - Field selection kuralları
 */
export function applyRelationFieldSelection(
	record: Row,
	relationName: string,
	fieldSelection?: FieldSelection,
): void {
	if (!fieldSelection || !record || !(relationName in record)) {
		return;
	}

	const relationData = (record as Record<string, unknown>)[relationName];

	if (relationData) {
		(record as Record<string, unknown>)[relationName] = applyFieldSelection(
			relationData as Row | Row[],
			fieldSelection,
		);
	}
}

/**
 * Child relation'lar için de field selection uygular
 * @param records - Ana kayıtlar
 * @param relationName - Ana relation adı
 * @param childRelationName - Child relation adı
 * @param fieldSelection - Field selection kuralları
 */
export function applyChildRelationFieldSelection(
	records: Row[],
	relationName: string,
	childRelationName: string,
	fieldSelection?: FieldSelection,
): void {
	if (!fieldSelection || !records || records.length === 0) {
		return;
	}

	for (const record of records) {
		const relationData = (record as Record<string, unknown>)[relationName];

		if (Array.isArray(relationData)) {
			// one-to-many relation
			for (const relatedRecord of relationData) {
				if (relatedRecord && typeof relatedRecord === "object") {
					applyRelationFieldSelection(
						relatedRecord as Row,
						childRelationName,
						fieldSelection,
					);
				}
			}
		} else if (relationData && typeof relationData === "object") {
			// one-to-one relation
			applyRelationFieldSelection(
				relationData as Row,
				childRelationName,
				fieldSelection,
			);
		}
	}
}
