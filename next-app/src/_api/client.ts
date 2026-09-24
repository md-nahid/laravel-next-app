import {
  type MutateOptions,
  mutationOptions,
  queryOptions,
} from "@tanstack/react-query"
import { axios, fetcher } from "./api"
import { mutationBuilder } from "./mutation-factory"
import type { APIError, LoginResponse } from "./types"

export const _queryKeys = {
  csrf: "/sanctum/csrf-cookie",
  me: "/me",
  login: "/login",
  logout: "/logout",
  register: '/register'
}

export const apiQuery = {
  me: {
    query: () =>
      queryOptions({
        queryKey: [_queryKeys.me],
        queryFn: () =>
          axios.get<unknown>(_queryKeys.me).then((response) => response.data),
        refetchOnWindowFocus: true,
        retry: false,
        refetchInterval: 15 * 60 * 1005,
      }),
    key: () => [_queryKeys.me],
  },
}

export const apiMutation = {
  login: {
    mutation: (options: MutateOptions<LoginResponse, APIError, unknown>) =>
      mutationOptions({
        mutationFn: async (input) => {
          await fetcher.get<boolean>(_queryKeys.csrf)
          return axios.post(_queryKeys.login, input).then((res) => res.data)
        },
        ...options,
      }),
  },
  logout: mutationBuilder(_queryKeys.logout),
  register: {
    mutation: (options: MutateOptions<LoginResponse, APIError, unknown>) =>
      mutationOptions({
        mutationFn: async (input) => {
          await fetcher.get<boolean>(_queryKeys.csrf)
          return axios.post(_queryKeys.register, input).then((res) => res.data)
        },
        ...options,
      }),
  },
}
