export const MAX_PAGE_LIMIT = 100;

/** Clamp raw page/limit query values to positive integers (limit ≤ MAX_PAGE_LIMIT). */
export function normalizePagination(
    page: unknown,
    limit: unknown,
    defaultLimit: number,
): { page: number; limit: number } {
    const pageNum = Math.floor(Number(page));
    const limitNum = Math.floor(Number(limit));
    return {
        page: Number.isFinite(pageNum) && pageNum >= 1 ? pageNum : 1,
        limit:
            Number.isFinite(limitNum) && limitNum >= 1
                ? Math.min(limitNum, MAX_PAGE_LIMIT)
                : defaultLimit,
    };
}
