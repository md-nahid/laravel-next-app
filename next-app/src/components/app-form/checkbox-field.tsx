"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { useFieldContext } from "./form-context";

export function CheckboxField({
  label,
  ...props
  // description,
}: React.ComponentProps<typeof Checkbox> & {
  label: string;
  // description?: string;
}) {
  const field = useFieldContext<boolean>();
  // const errors = useStore(field.store, (state) => state.meta.errors);
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  return (
    <Field data-invalid={isInvalid} orientation="horizontal">
      <Checkbox
        checked={field.state.value}
        id={field.name}
        onCheckedChange={(checked) => field.handleChange(Boolean(checked))}
        {...props}
      />
      <FieldLabel className="font-normal" htmlFor={field.name}>
        {label}
      </FieldLabel>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
