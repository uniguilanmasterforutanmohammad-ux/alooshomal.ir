/** Pagination envelope shared by the list endpoints and the web `Pagination`. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Builds the standard pagination envelope for a page of `total` items. */
export function paginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}

/**
 * Clamps a numeric value into `[min, max]`.
 *
 * Used for every user-supplied page size so a client can never ask for an
 * unbounded result set (memory/DB-load guard). Kept here next to the pagination
 * envelope so the two conventions evolve together.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Clamps an optional page size, falling back to `fallback` when absent. */
export function clampLimit(
  value: number | undefined | null,
  fallback: number,
  max: number,
): number {
  const numeric = Number(value);
  return clamp(Number.isFinite(numeric) ? numeric : fallback, 1, max);
}
