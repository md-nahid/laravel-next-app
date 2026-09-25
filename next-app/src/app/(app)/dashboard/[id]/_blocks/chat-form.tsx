"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
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
  const { mutate, isPending } = useMutation(
    apiMutation.chat.send.mutation({
      param: id,
      onSuccess: () => {
        form.reset()
        queryClient.invalidateQueries({
          queryKey: apiQuery.chat.getConversation.key(),
        })
      },
      onError: (error) => {
        toast.error(error.response.data.message)
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
    <div className="sticky bottom-6 z-50 w-full">
      <Card className="mx-auto w-full">
        <CardContent>
          <Form handleSubmit={form.handleSubmit} className="w-full">
            <InputGroup>
              <form.AppField name="message">
                {(field) => (
                  <InputGroupInput
                    placeholder="Write your message..."
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              </form.AppField>
              <InputGroupAddon align="block-end" className="pt-1">
                <InputGroupButton
                  type="submit"
                  variant="default"
                  size="icon-sm"
                  className="ml-auto"
                  disabled={isPending}
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
    </div>
  )
}
