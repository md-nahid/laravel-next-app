export type PaginationInterface<T> = {
  current_page: number
  data: T[]
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

export type APIError = {
  response: {
    status?: number
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

export type User = {
  id: number
  name: string
  email: string
}

export type SelectedUser = User & {
  is_blocked_by_me: boolean
  is_blocking_me: boolean
}

export type Conversation = {
  id: number
  sender: User
  receiver: User
  message: string
  is_mine: boolean
  created_at: string
  updated_at: string
}

export type ConversationBroadcast = {
  id: number
  sender_id: number
  receiver_id: number
  message: string
  created_at: string
  updated_at: string
}

export type MessageCreatedEvent = {
  id: number
  sender_id: number
  receiver_id: number
  created_at: string
}
