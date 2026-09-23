import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useFieldContext } from "./form-context";

interface TextareaFieldProps extends React.ComponentProps<typeof Textarea> {
  mode?: "no-label" | "label";
  label: string;
}

export function TextareaField(props: TextareaFieldProps) {
  const field = useFieldContext<string>();
  // const errors = useStore(field.store, (state) => state.meta.errors);
  const { label, className, mode = "label", ...rest } = props;
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  return (
    <Field className={className} data-invalid={isInvalid}>
      <FieldLabel
        className={cn({ "sr-only": mode === "no-label" })}
        htmlFor={field.name}
      >
        {label} {props.required && <span className="text-red-500">*</span>}
      </FieldLabel>
      <Textarea
        aria-invalid={isInvalid}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        value={field.state.value}
        {...rest}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
