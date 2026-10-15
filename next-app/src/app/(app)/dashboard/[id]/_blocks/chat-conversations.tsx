"use client"

import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { CheckCheck } from "lucide-react"
import { apiQuery } from "@/_api/client"
import type { Conversation } from "@/_api/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useChatRealtime } from "@/lib/use-chat-realtime"

export function ChatConversations({ id }: { id: string }) {
  const { data: user } = useQuery(apiQuery.me.query())
  useChatRealtime({ currentUserId: user?.id, partnerId: id })

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteQuery(
      apiQuery.chat.getConversation.query({
        param: id,
        enabled: !!id.toString(),
        staleTime: 0,
      })
    )

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
      {!isOutgoing && (
        <Avatar
          aria-label={conversation.sender.name}
          className="mb-5"
          size="sm"
        >
          <AvatarFallback>
            {conversation.sender.name.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
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
