export type PaginationInterface<T> = {
  current_page: number
  data: T[]
  first_page_url: string
  from: number
  last_page: number
  last_page_url: string
  links: unknown[]
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number
  total: number
}

export type APIError = {
  response: {
    data: {
      message: string
    }
  }
}

export type MutationResponse = {
  message: string
}

export type MutationResponseWithData<T> = {
  message: string
  data: T
  error?: boolean
}

export type SearchParams = {
  pagination?: boolean
  limit?: number
}

export type LoginResponse = { two_factor: boolean; message: string }

