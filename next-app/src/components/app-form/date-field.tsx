import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { format, isValid, parse } from "date-fns"
import { useFieldContext } from "./form-context"

const STORAGE = "yyyy-MM-dd"

interface DateFieldProps extends Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange" | "id"
> {
  placeholder?: string
  mode?: "no-label" | "label"
  label: string
  className?: string
}

export function DateField({
  label,
  className,
  mode,
  ...props
}: Readonly<DateFieldProps>) {
  const field = useFieldContext<Date | undefined>()
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
  const str =
    field.state.value && isValid(field.state.value)
      ? format(field.state.value, STORAGE)
      : ""

  return (
    <Field className={className} data-invalid={isInvalid}>
      <FieldLabel
        className={cn({ "sr-only": mode === "no-label" })}
        htmlFor={field.name}
      >
        {label}
      </FieldLabel>
      <Input
        {...props}
        id={field.name}
        type="date"
        value={str}
        onBlur={field.handleBlur}
        onChange={(e) => {
          const v = e.target.value
          const d = v ? parse(v, STORAGE, new Date()) : undefined
          field.handleChange(d && isValid(d) ? d : undefined)
        }}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
