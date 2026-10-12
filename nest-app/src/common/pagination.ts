export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}

export interface PaginationOptions {
  page: number;
  perPage: number;
  total: number;
}

export interface PaginationQuery {
  page?: number;
  per_page?: number;
  pagination?: string;
}

export interface ResolvedPaginationOptions {
  page: number;
  perPage: number;
  isPagination: boolean;
}

export function resolvePaginationOptions(
  query: PaginationQuery,
  defaultPerPage: number,
): ResolvedPaginationOptions {
  return {
    page: query.page ?? 1,
    perPage: query.per_page ?? defaultPerPage,
    isPagination: !['false', '0', 'off', 'no'].includes(
      query.pagination?.toLowerCase() ?? 'true',
    ),
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  options: PaginationOptions,
): PaginatedResponse<T> {
  const { page, perPage, total } = options;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const offset = (page - 1) * perPage;

  return {
    current_page: page,
    data,
    from: data.length === 0 ? null : offset + 1,
    last_page: lastPage,
    per_page: perPage,
    to: data.length === 0 ? null : Math.min(offset + data.length, total),
    total,
  };
}
