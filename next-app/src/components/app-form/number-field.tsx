import { useStore } from "@tanstack/react-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isEmpty } from "lodash";
import { NumericFormat, type NumberFormatValues } from "react-number-format";
import { useFieldContext } from "./form-context";

interface NumberFieldProps
  extends Omit<
    React.ComponentProps<typeof NumericFormat>,
    "customInput" | "size"
  > {
  placeholder?: string;
  mode?: "no-label" | "label";
  label: string;
  description?: string;
}
export function NumberField({
  label,
  mode,
  description,
  ...props
}: Readonly<NumberFieldProps>) {
  // const id = useId()
  const field = useFieldContext<number | undefined>();
  const errors = useStore(field.store, (state) => state.meta.errors);
  return (
    <Field data-invalid={!isEmpty(errors)}>
      <FieldLabel
        className={cn({ "sr-only": mode === "no-label" })}
        htmlFor={field.name}
      >
        {label}
      </FieldLabel>
      <NumericFormat
        customInput={Input}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onValueChange={(values: NumberFormatValues) => {
          // console.log('NumericFormat', values)
          field.handleChange(values.floatValue);
        }}
        thousandSeparator={true}
        value={field.state.value}
        valueIsNumericString={true}
        {...props}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={errors} />
    </Field>
  );
}

// <Field orientation="responsive">
//               <FieldContent>
//                 <FieldLabel htmlFor="name">Name</FieldLabel>
//                 <FieldDescription>
//                   Provide your full name for identification
//                 </FieldDescription>
//               </FieldContent>
//               <Input id="name" placeholder="Evil Rabbit" required />
//             </Field>
