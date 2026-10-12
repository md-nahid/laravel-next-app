"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell, BlocksIcon, MoreHorizontal, Trash } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { apiMutation, apiQuery } from "@/_api/client"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  const queryClient = useQueryClient()
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] =
    useState(false)
  const { data } = useQuery(
    apiQuery.selectedUser.query({
      param: id,
      enabled: !!id.toString(),
    })
  )

  const { mutate: blockUser, isPending: isBlocking } = useMutation(
    apiMutation.blocks.block.mutation({
      param: id,
      onSuccess: (response) => {
        toast.success(response.message)
        queryClient.invalidateQueries({
          queryKey: apiQuery.selectedUser.key(id),
        })
      },
      onError: (error) => {
        toast.error(error.response?.data?.message ?? "Unable to block user.")
      },
    })
  )

  const { mutate: unblockUser, isPending: isUnblocking } = useMutation(
    apiMutation.blocks.unblock.mutation({
      param: id,
      onSuccess: (response) => {
        toast.success(response.message)
        queryClient.invalidateQueries({
          queryKey: apiQuery.selectedUser.key(id),
        })
      },
      onError: (error) => {
        toast.error(error.response?.data?.message ?? "Unable to unblock user.")
      },
    })
  )

  const { mutate: deleteConversation, isPending: isDeleting } = useMutation(
    apiMutation.chat.delete.mutation({
      param: id,
      onSuccess: (response) => {
        toast.success(response.message)
        setIsDeleteConfirmationOpen(false)
        queryClient.invalidateQueries({
          queryKey: apiQuery.chat.getConversation.key(id),
        })
      },
      onError: (error) => {
        toast.error(
          error.response?.data?.message ?? "Unable to delete conversation."
        )
      },
    })
  )

  return (
    <>
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
            <DropdownMenuItem
              disabled={!data || isBlocking || isUnblocking}
              onClick={() => {
                if (data?.is_blocked_by_me) {
                  unblockUser()
                  return
                }

                blockUser({})
              }}
            >
              <BlocksIcon /> {data?.is_blocked_by_me ? "Unblock" : "Block"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!data || isDeleting}
              onClick={() => setIsDeleteConfirmationOpen(true)}
            >
              <Trash /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AlertDialog
        open={isDeleteConfirmationOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setIsDeleteConfirmationOpen(open)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This hides the existing messages from your view only. The other
              person will keep their history, and new messages will appear here
              without restoring the old messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => deleteConversation()}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
