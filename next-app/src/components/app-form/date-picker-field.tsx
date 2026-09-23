import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { dateString } from "@/lib/date-format"
import { parse } from "date-fns";
import { isEmpty } from "lodash";
import { useFieldContext } from "./form-context";

interface DatePickerFieldProps
  extends Omit<
    React.ComponentProps<typeof DatePicker>,
    "id" | "value" | "onChange"
  > {
  placeholder?: string;
  mode?: "no-label" | "label";
  label: string;
  className?: string;
}
export function DatePickerField({
  label,
  className,
  mode,
  ...props
}: Readonly<DatePickerFieldProps>) {
  const field = useFieldContext<string | undefined>();
  // const errors = useStore(field.store, (state) => state.meta.errors);
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  return (
    <Field className={className} data-invalid={isInvalid}>
      <FieldLabel
        className={cn({ "sr-only": mode === "no-label" })}
        htmlFor={field.name}
      >
        {label} {props.required && <span className="text-red-500">*</span>}
      </FieldLabel>
      <DatePicker
        {...props}
        id={field.name}
        onChange={(date) => field.handleChange(dateString(date, "yyyy-MM-dd"))}
        value={
          isEmpty(field.state.value)
            ? undefined
            : parse(field.state.value as string, "yyyy-MM-dd", new Date())
        }
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
