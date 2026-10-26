"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowUpIcon, Loader } from "lucide-react"
import { toast } from "sonner"
import { apiMutation, apiQuery } from "@/_api/client"
import { Form } from "@/components/app-form"
import { useAppForm } from "@/components/app-form/form"
import { Card, CardContent } from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

export function ChatForm({ id }: { id: string }) {
  const queryClient = useQueryClient()
  const { data: selectedUser } = useQuery(
    apiQuery.selectedUser.query({
      param: id,
      enabled: !!id.toString(),
    })
  )

  const isBlockedByReceiver = Boolean(selectedUser?.is_blocking_me)

  const { mutate, isPending } = useMutation(
    apiMutation.chat.send.mutation({
      param: id,
      onSuccess: () => {
        form.reset()
        queryClient.invalidateQueries({
          queryKey: apiQuery.chat.getConversation.key(id),
        })
      },
      onError: (error) => {
        toast.error(error.response?.data?.message)
      },
    })
  )

  const form = useAppForm({
    defaultValues: {
      message: "",
    },
    onSubmit: ({ value }) => {
      mutate(value)
    },
  })

  return (
    <Card className="mx-auto mt-4 w-full max-w-2xl">
      <CardContent>
        <Form handleSubmit={form.handleSubmit} className="w-full">
          {isBlockedByReceiver ? (
            <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive text-sm">
              You are blocked by this user and cannot send messages.
            </div>
          ) : null}
          <InputGroup>
            <form.AppField name="message">
              {(field) => (
                <InputGroupInput
                  placeholder={
                    isBlockedByReceiver
                      ? "You are blocked by this user"
                      : "Write your message..."
                  }
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  disabled={isBlockedByReceiver || isPending}
                />
              )}
            </form.AppField>
            <InputGroupAddon align="block-end" className="pt-1">
              <InputGroupButton
                type="submit"
                variant="default"
                size="icon-sm"
                className="ml-auto"
                disabled={isBlockedByReceiver || isPending}
              >
                {isPending ? (
                  <Loader className="animate-spin" />
                ) : (
                  <ArrowUpIcon />
                )}
                <span className="sr-only">Send</span>
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Form>
      </CardContent>
    </Card>
  )
}
