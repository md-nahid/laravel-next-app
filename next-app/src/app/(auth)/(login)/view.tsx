"use client"

import { useMutation } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ComponentProps } from "react"
import { toast } from "sonner"
import { apiMutation } from "@/_api/client"
import { Form } from "@/components/app-form"
import { useAppForm } from "@/components/app-form/form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FieldDescription } from "@/components/ui/field"
import { cn } from "@/lib/utils"

export function View({ className, ...props }: ComponentProps<"div">) {
  const router = useRouter()

  const { mutate, isPending } = useMutation(
    apiMutation.login.mutation({
      onSuccess: () => {
        router.push("/dashboard")
      },
      onError: (error) => {
        toast.error(error.response?.data?.message)
      },
    })
  )

  const form = useAppForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: ({ value }) => {
      mutate(value)
    },
  })

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center",
        className
      )}
      {...props}
    >
      <Card className="w-full max-w-sm shrink-0">
        <CardHeader className="text-center">
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form handleSubmit={form.handleSubmit}>
            <form.AppField name="email">
              {(field) => (
                <field.TextField
                  label="Email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              )}
            </form.AppField>
            <form.AppField name="password">
              {(field) => <field.PasswordField label="Password" required />}
            </form.AppField>
            <form.AppForm>
              <form.Submit label="Login" isPending={isPending} />
            </form.AppForm>

            <FieldDescription className="text-center">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="underline underline-offset-2 hover:text-primary"
              >
                Sign Up
              </Link>
            </FieldDescription>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
