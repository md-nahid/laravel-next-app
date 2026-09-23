import type { ComponentProps, FormEvent } from "react";
import { cn } from "@/lib/utils";

export function Form({
  className,
  handleSubmit,
  ...props
}: ComponentProps<"form"> & {
  handleSubmit: () => Promise<void>;
}) {
  return (
    <form
      className={cn("flex flex-col gap-4", className)}
      noValidate
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit();
      }}
      {...props}
    />
  );
}
