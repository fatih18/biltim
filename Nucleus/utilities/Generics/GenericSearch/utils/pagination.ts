/**
 * Calculates pagination parameters
 */
export function calculatePagination(params: {
	page?: number;
	limit?: number;
	maxLimit?: number;
}) {
	const page = Math.max(1, Number(params.page || 1));
	const maxLimit = params.maxLimit || 1000; // Increased from 100 to 1000 for better pagination support
	const limit = Math.min(Math.max(1, Number(params.limit || 10)), maxLimit);
	const offset = (page - 1) * limit;

	return { page, limit, offset, maxLimit };
}

/**
 * Calculates total pages
 */
export function calculateTotalPages(totalCount: number, limit: number): number {
	return Math.ceil(totalCount / Math.max(1, limit));
}
