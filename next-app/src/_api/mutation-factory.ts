import {
  type DefaultError,
  type MutateOptions,
  type MutationOptions,
  mutationOptions,
} from "@tanstack/react-query"
import { axios } from "./api"

export function mutationBuilder<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
>(url: string) {
  return {
    mutation: ({
      param,
      ...options
    }: MutationOptions<TData, TError, TVariables, unknown> & {
      param?: string | number
    }) =>
      mutationOptions({
        mutationFn: (payload) =>
          axios
            .post([url, param].filter(Boolean).join("/"), payload)
            .then((res) => res.data),
        ...options,
      }),
  }
}

export function mutationBuilderGet<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
>(url: string) {
  return {
    mutation: ({
      param,
      ...options
    }: MutationOptions<TData, TError, TVariables, unknown> & {
      param?: string | number
    }) =>
      mutationOptions({
        mutationFn: (params) =>
          axios
            .get([url, param].filter(Boolean).join("/"), { params })
            .then((res) => res.data),
        ...options,
      }),
  }
}

export function mutationBuilderPut<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
>(url: string) {
  return {
    mutation: ({
      param,
      ...options
    }: MutationOptions<TData, TError, TVariables, unknown> & {
      param?: string | number
    }) =>
      mutationOptions({
        mutationFn: (payload) =>
          axios
            .put([url, param].filter(Boolean).join("/"), payload)
            .then((res) => res.data),
        ...options,
      }),
  }
}

export function mutationBuilderDelete<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
>(url: string) {
  return {
    mutation: ({
      param,
      ...options
    }: MutateOptions<TData, TError, TVariables, unknown> & {
      param?: string
    }) =>
      mutationOptions({
        mutationFn: () =>
          axios
            .delete([url, param].filter(Boolean).join("/"))
            .then((res) => res.data),
        ...options,
      }),
  }
}

export function mutationBuilderPatch<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
>(url: string) {
  return {
    mutation: ({
      param,
      ...options
    }: MutationOptions<TData, TError, TVariables, unknown> & {
      param?: string | number
    }) =>
      mutationOptions({
        mutationFn: (payload) =>
          axios
            .patch([url, param].filter(Boolean).join("/"), payload)
            .then((res) => res.data),
        ...options,
      }),
  }
}

export function mutationFactory<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
>(url: string) {
  return {
    create: mutationBuilder<TData, TError, TVariables>(url),
    update: mutationBuilderPut<TData, TError, TVariables>(url),
    delete: mutationBuilderDelete<TData, TError>(url),
    patch: mutationBuilderPatch<TData, TError, TVariables>(url),
  }
}
