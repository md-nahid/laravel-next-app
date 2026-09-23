"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { useFieldContext } from "./form-context";

// const FormSchema = z.object({
//   items: z.array(z.string()).refine((value) => value.some((item) => item), {
//     message: "You have to select at least one item.",
//   }),
// })

interface CheckboxGroupFieldProps
  extends Omit<React.ComponentProps<typeof Checkbox>, "className"> {
  mode?: "no-label" | "label";
  label: string;
  className?: string;
  options?: { value: string; label: string }[];
}
export function CheckboxGroupField(props: Readonly<CheckboxGroupFieldProps>) {
  const field = useFieldContext<string[]>();
  const { label, options = [], mode = "label", className, ...rest } = props;
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const handleCheckboxChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      return field.handleChange([...field.state.value, optionValue]);
    }

    const newValue = field.state.value?.filter(
      (value: string) => value !== optionValue
    );

    // Prevent unchecking if required and it's the last selected item
    if (props.required && newValue.length === 0) {
      return;
    }

    return field.handleChange(newValue);
  };
  return (
    <FieldSet>
      <FieldLegend
        className={cn({ "sr-only": mode === "no-label" })}
        variant="label"
      >
        {label}
      </FieldLegend>
      <FieldGroup className={className} data-slot="checkbox-group">
        {options.map((option) => (
          <Field
            data-invalid={isInvalid}
            key={option.value}
            orientation="horizontal"
          >
            <Checkbox
              aria-invalid={isInvalid}
              checked={field.state.value?.includes(option.value)}
              id={option.value}
              name={field.name}
              onCheckedChange={(checked) => {
                handleCheckboxChange(option.value, Boolean(checked));
              }}
              {...rest}
            />
            <FieldLabel htmlFor={option.value}>{option.label}</FieldLabel>
          </Field>
        ))}
      </FieldGroup>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </FieldSet>
  );
}
