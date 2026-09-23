"use client"

import Link from "next/link"
import type { ComponentProps } from "react"
import { useAppForm } from "@/components/app-form/form"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field"

export function View({ className, ...props }: ComponentProps<"div">) {
  const form = useAppForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      console.log("Login form submitted:", value)
    },
  })

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <Card className="w-full max-w-sm shrink-0">
        <CardHeader className="text-center">
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
            noValidate
          >
            <FieldGroup>
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
              <Field>
                <Button type="submit" disabled={form.state.isSubmitting}>
                  Login
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="underline underline-offset-2 hover:text-primary"
                  >
                    Sign up
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
