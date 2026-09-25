import {
  infiniteQueryOptions,
  queryOptions,
  type UseInfiniteQueryOptions,
  type UseQueryOptions,
} from "@tanstack/react-query"
import { axios } from "./api"
import type { APIError, PaginationInterface } from "./types"

export function queryBuilder<T, URLParam = string, SearchParams = unknown>(
  url: string
) {
  return {
    query: ({
      param,
      params,
      ...options
    }: Omit<UseQueryOptions<T>, "queryKey" | "queryFn"> & {
      param?: URLParam
      params?: SearchParams
    }) =>
      queryOptions({
        ...options,
        queryKey: [url, param, params].filter(Boolean),
        queryFn: () =>
          axios
            .get<T>([url, param].filter(Boolean).join("/"), { params })
            .then((response) => response.data),
      }),
    key: (param?: URLParam, params?: SearchParams) =>
      [url, param, params].filter(Boolean) as string[],
  }
}

export function infiniteQueryBuilder<
  T,
  URLParam = string,
  SearchParams = unknown,
>(url: string) {
  return {
    query: ({
      param,
      params,
      ...options
    }: Omit<
      UseInfiniteQueryOptions<
        PaginationInterface<T>,
        APIError,
        PaginationInterface<T>,
        unknown[],
        { page: number }
      >,
      | "queryKey"
      | "queryFn"
      | "getNextPageParam"
      | "initialPageParam"
      | "select"
    > & {
      param?: URLParam
      params?: SearchParams
    }) =>
      infiniteQueryOptions({
        ...options,
        queryKey: [url, param, params].filter(Boolean),
        queryFn: ({ pageParam }) =>
          axios
            .get([url, param].filter(Boolean).join("/"), {
              params: {
                ...(params as object),
                ...(pageParam as object),
              },
            })
            .then((response) => response.data),
        getNextPageParam: ({ current_page, last_page }) =>
          current_page < last_page ? { page: current_page + 1 } : undefined,
        initialPageParam: { page: 1 },
        select: (res) =>
          res.pages
            .slice()
            .reverse()
            .flatMap((page) => page.data),
      }),
    key: (param?: URLParam, params?: SearchParams) =>
      [url, param, params].filter(Boolean),
  }
}
