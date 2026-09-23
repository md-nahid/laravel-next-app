import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useFieldContext } from "./form-context";

interface TextFieldProps extends React.ComponentProps<typeof Input> {
  placeholder?: string;
  mode?: "no-label" | "label";
  label: string;
  className?: string;
  description?: string;
}
export function TextField({
  label,
  className,
  mode,
  description,
  ...props
}: Readonly<TextFieldProps>) {
  // const id = useId()
  const field = useFieldContext<string>();
  // const errors = useStore(field.store, (state) => state.meta.errors);
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  return (
    <Field className={cn("w-full", className)} data-invalid={isInvalid}>
      <FieldLabel
        className={cn({ "sr-only": mode === "no-label" })}
        htmlFor={field.name}
      >
        {label} {props.required && <span className="text-red-500">*</span>}
      </FieldLabel>
      <Input
        aria-invalid={isInvalid}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        value={field.state.value}
        // aria-describedby={
        //   !error
        //     ? `${formDescriptionId}`
        //     : `${formDescriptionId} ${formMessageId}`
        // }
        {...props}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
