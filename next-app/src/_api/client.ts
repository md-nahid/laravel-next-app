import {
  type MutateOptions,
  mutationOptions,
  queryOptions,
} from "@tanstack/react-query"
import { axios, fetcher } from "./api"
import { mutationBuilder, mutationBuilderDelete } from "./mutation-factory"
import { infiniteQueryBuilder, queryBuilder } from "./query-factory"
import type {
  APIError,
  Conversation,
  LoginResponse,
  MutationResponse,
  SelectedUser,
  User,
} from "./types"

export const _queryKeys = {
  csrf: "/sanctum/csrf-cookie",
  me: "/user",
  login: "/login",
  logout: "/logout",
  register: "/register",
  users: "/users",
  blocks: "/blocks",
  conversations: "/conversations",
}

export const apiQuery = {
  me: {
    query: () =>
      queryOptions({
        queryKey: [_queryKeys.me],
        queryFn: () =>
          axios.get<User>(_queryKeys.me).then((response) => response.data),
        refetchOnWindowFocus: true,
        retry: false,
        refetchInterval: 15 * 60 * 1005,
      }),
    key: () => [_queryKeys.me],
  },

  users: queryBuilder<User[]>(_queryKeys.users),
  selectedUser: queryBuilder<SelectedUser>(_queryKeys.users),

  chat: {
    getConversation: infiniteQueryBuilder<Conversation>(
      _queryKeys.conversations
    ),
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
  logout: {
    mutation: (options: MutateOptions) =>
      mutationOptions({
        mutationFn: () => axios.post(_queryKeys.logout).then((res) => res.data),
        ...options,
      }),
  },
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

  chat: {
    send: mutationBuilder<MutationResponse, APIError, unknown>(
      _queryKeys.conversations
    ),
  },
  blocks: {
    block: mutationBuilder<MutationResponse, APIError, Record<string, never>>(
      _queryKeys.blocks
    ),
    unblock: mutationBuilderDelete<MutationResponse, APIError>(
      _queryKeys.blocks
    ),
  },
}
