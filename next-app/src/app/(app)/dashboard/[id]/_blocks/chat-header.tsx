"use client"

import { useQuery } from "@tanstack/react-query"
import { Bell, BlocksIcon, MoreHorizontal, Trash } from "lucide-react"
import { apiQuery } from "@/_api/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ChatHeader({ id }: { id: string }) {
  const { data } = useQuery(
    apiQuery.selectedUser.query({
      param: id,
      enabled: !!id.toString(),
    })
  )
  return (
    <div className="flex items-center justify-between border-b px-6 py-4">
      <div className="flex items-center gap-2">
        <Avatar>
          <AvatarFallback>{data?.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <p>{data?.name}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Bell /> Mute
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <BlocksIcon /> Block
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Trash /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
