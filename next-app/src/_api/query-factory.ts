import { queryOptions, type UseQueryOptions } from "@tanstack/react-query"
import { axios } from "./api"

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
