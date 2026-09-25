"use client"

import { useQuery } from "@tanstack/react-query"
import { CheckCheck } from "lucide-react"
import { apiQuery } from "@/_api/client"
import type { Conversation } from "@/_api/types"
import { cn } from "@/lib/utils"

export function ChatConversations({ id }: { id: string }) {
  const { data: paginatedData } = useQuery(
    apiQuery.chat.getConversation.query({
      param: id,
      enabled: !!id.toString(),
    })
  )

  const { data } = paginatedData ?? {}

  return (
    <div className="flex min-h-full flex-col justify-end py-6">
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
        "mb-5 flex items-end gap-2.5",
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
