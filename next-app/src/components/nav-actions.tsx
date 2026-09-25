"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { apiMutation, apiQuery } from "@/_api/client"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

export function NavActions() {
  const router = useRouter()
  const { mutate, isPending } = useMutation(
    apiMutation.logout.mutation({
      onSuccess: () => {
        // queryClient.invalidateQueries([ApiAuthEndpoints.me]);
        router.push("/")
      },
    })
  )
  const { data } = useQuery(apiQuery.me.query())
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar>
              <AvatarFallback>{data?.name.slice(0, 1)}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />

      <DropdownMenuContent className="w-40" align="end">
        <DropdownMenuItem onClick={() => mutate()} disabled={isPending}>
          <LogOut /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
