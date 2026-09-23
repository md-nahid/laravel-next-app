import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PatternFormat, type NumberFormatValues } from "react-number-format";
import { useFieldContext } from "./form-context";

interface PatternFieldProps
  extends Omit<
    React.ComponentProps<typeof PatternFormat>,
    "customInput" | "type" | "size"
  > {
  mode?: "no-label" | "label";
  label: string;
  description?: string;
}

export function PatternField(props: PatternFieldProps) {
  const { label, mode, description, ...rest } = props;
  const field = useFieldContext<number | string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel
        className={cn({ "sr-only": mode === "no-label" })}
        htmlFor={field.name}
      >
        {label}
        {props.required && <span className="text-red-500">*</span>}
      </FieldLabel>
      <PatternFormat
        aria-invalid={isInvalid}
        autoComplete="off"
        customInput={Input}
        id={field.name}
        mask="_"
        name={field.name}
        onBlur={field.handleBlur}
        onValueChange={(values: NumberFormatValues) => {
          field.handleChange(values.floatValue ?? "");
        }}
        value={field.state.value}
        valueIsNumericString={true}
        {...rest}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
