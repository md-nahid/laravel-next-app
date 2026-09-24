"use client"

import Link from "next/link"
import type { ComponentProps } from "react"
import { z } from "zod"
import { Form } from "@/components/app-form"
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
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { apiMutation } from "@/_api/client";
import { toast } from "sonner";
import { Loader } from "lucide-react";

const registerSchema = z
  .object({
    name: z.string().trim().min(1, {error: "Name is required"}),
    email: z.email({error: "Enter a valid email address"}),
    password: z.string().min(8, {error: "Password must be at least 8 characters"}),
    password_confirmation: z.string().min(1, {error: "Please confirm your password"}),
  })
  .refine((values) => values.password === values.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  })



export function View({ className, ...props }: ComponentProps<"div">) {
  const router = useRouter()
  const { mutate, isPending } = useMutation(
    apiMutation.register.mutation({
      onSuccess: ({message}) => {
        toast.success(message ?? 'Registered Successfully')
        router.push('/dashboard')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message)
      },
    })
  )
  
  const form = useAppForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      password_confirmation: "",
    },
    validators: {
      onSubmit: registerSchema,
    },
    onSubmit: async ({ value }) => {
      mutate(value)
    },
  })

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center ${className ?? ""}`}
      {...props}
    >
      <Card className="w-full max-w-sm shrink-0">
        <CardHeader className="text-center">
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            Enter your details below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form handleSubmit={form.handleSubmit}>
            <FieldGroup>
              <form.AppField name="name">
                {(field) => (
                  <field.TextField
                    label="Name"
                    placeholder="Your name..."
                    autoComplete="name"
                    required
                  />
                )}
              </form.AppField>
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
              <form.AppField name="password_confirmation">
                {(field) => (
                  <field.PasswordField
                    label="Confirm password"
                    autoComplete="new-password"
                    required
                  />
                )}
              </form.AppField>
              <Field>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader className="animate-spin" />}
                  Sign up
                </Button>
                <FieldDescription className="text-center">
                  Already have an account?{" "}
                  <Link
                    href="/"
                    className="underline underline-offset-2 hover:text-primary"
                  >
                    Login
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
