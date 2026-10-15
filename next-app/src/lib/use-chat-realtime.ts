"use client"

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { io } from "socket.io-client"
import { apiQuery } from "@/_api/client"
import type { MessageCreatedEvent } from "@/_api/types"

const apiUrl = process.env.NEXT_PUBLIC_REST_API_ENDPOINT

function isMessageCreatedEvent(value: unknown): value is MessageCreatedEvent {
  if (typeof value !== "object" || value === null) return false

  const event = value as Record<string, unknown>
  return (
    Number.isSafeInteger(event.id) &&
    Number.isSafeInteger(event.sender_id) &&
    Number.isSafeInteger(event.receiver_id) &&
    typeof event.created_at === "string"
  )
}

export function useChatRealtime({
  currentUserId,
  partnerId,
}: {
  currentUserId?: number
  partnerId: string
}) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const numericPartnerId = Number(partnerId)
    if (
      currentUserId === undefined ||
      !Number.isSafeInteger(numericPartnerId) ||
      numericPartnerId <= 0
    ) {
      return
    }

    const refreshConversation = () =>
      queryClient.invalidateQueries({
        queryKey: apiQuery.chat.getConversation.key(partnerId),
      })
    const socket = io(new URL(apiUrl).origin, {
      autoConnect: false,
      withCredentials: true,
    })
    const onMessageCreated = (value: unknown) => {
      if (!isMessageCreatedEvent(value)) return
      if (
        value.receiver_id === currentUserId &&
        value.sender_id === numericPartnerId
      ) {
        void refreshConversation()
      }
    }

    socket.on("connect", refreshConversation)
    socket.on("message.created", onMessageCreated)
    socket.connect()

    return () => {
      socket.off("connect", refreshConversation)
      socket.off("message.created", onMessageCreated)
      socket.disconnect()
    }
  }, [currentUserId, partnerId, queryClient])
}
