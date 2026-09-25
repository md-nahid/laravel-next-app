"use client"

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { CheckCheck } from "lucide-react"
import { useEffect } from "react"
import { apiQuery } from "@/_api/client"
import type { Conversation } from "@/_api/types"
import { Button } from "@/components/ui/button"
import { echo } from "@/lib/echo"
import { cn } from "@/lib/utils"

export function ChatConversations({ id }: { id: string }) {
  const queryClient = useQueryClient()
  const { data: currentUser } = useQuery(apiQuery.me.query())
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteQuery(
      apiQuery.chat.getConversation.query({
        param: id,
        enabled: !!id.toString(),
        refetchOnWindowFocus: true,
        staleTime: 0,
      })
    )

  useEffect(() => {
    if (!currentUser || !echo) {
      return
    }

    const activeEcho = echo
    const channelName = `users.${currentUser.id}`

    activeEcho
      .private(channelName)
      .listen(".message.sent", (conversation: Conversation) => {
        if (
          conversation.sender_id === Number(id) ||
          conversation.receiver_id === Number(id)
        ) {
          queryClient.invalidateQueries({
            queryKey: apiQuery.chat.getConversation.key(),
          })
        }
      })

    return () => {
      activeEcho.leave(channelName)
    }
  }, [currentUser, id, queryClient])

  return (
    <div className="flex min-h-full flex-col justify-end pt-6">
      {hasNextPage && (
        <Button
          className="mx-auto mb-6"
          disabled={isFetchingNextPage}
          onClick={() => fetchNextPage()}
          variant="outline"
        >
          {isFetchingNextPage ? "Loading..." : "Load older messages"}
        </Button>
      )}
      {data?.map((conversation) => (
        <ChatConversation conversation={conversation} key={conversation.id} />
      ))}
    </div>
  )
}

function ChatConversation({ conversation }: { conversation: Conversation }) {
  const isOutgoing = conversation.is_mine
  const time = new Date(conversation.created_at).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })

  return (
    <div
      className={cn(
        "mx-auto mb-5 flex w-full max-w-2xl items-end gap-2.5",
        isOutgoing ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "flex max-w-lg flex-col gap-1",
          isOutgoing ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isOutgoing
              ? "rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-bl-sm bg-muted"
          )}
        >
          {conversation.message}
        </div>
        <div className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
          <span>{time}</span>
          {isOutgoing && <CheckCheck className="size-3.5 text-primary" />}
        </div>
      </div>
    </div>
  )
}
