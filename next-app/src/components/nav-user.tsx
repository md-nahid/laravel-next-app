"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { Loader, LogOut, MoreVertical } from "lucide-react"
import { useRouter } from "next/navigation"
import { apiMutation, apiQuery } from "@/_api/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "./ui/button"

export function NavUser() {
  const router = useRouter()
  const { data } = useQuery(apiQuery.me.query())

  const { mutate, isPending } = useMutation(
    apiMutation.logout.mutation({
      onSuccess: () => {
        // queryClient.invalidateQueries([ApiAuthEndpoints.me]);
        router.push("/")
      },
    })
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className="h-auto py-2">
            <Avatar className="h-8 w-8 rounded-lg grayscale">
              <AvatarFallback className="rounded-lg">
                {data?.name.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{data?.name}</span>
              <span className="truncate text-muted-foreground text-xs">
                {data?.email}
              </span>
            </div>
            <MoreVertical className="ml-auto size-4" />
          </Button>
        }
      />

      <DropdownMenuContent align="start" side="right">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg">
                  {data?.name.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{data?.name}</span>
                <span className="truncate text-muted-foreground text-xs">
                  {data?.email}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => mutate()} disabled={isPending}>
          {isPending ? <Loader className="animate-spin" /> : <LogOut />}
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
