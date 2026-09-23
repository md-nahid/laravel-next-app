import { useStore } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isEmpty } from "lodash";
import { MinusIcon, PlusIcon } from "lucide-react";
import { NumericFormat, type NumberFormatValues } from "react-number-format";
import { useFieldContext } from "./form-context";

interface NumberStepperFieldProps
  extends Omit<
    React.ComponentProps<typeof NumericFormat>,
    "customInput" | "size"
  > {
  placeholder?: string;
  mode?: "no-label" | "label";
  label: string;
  max?: number;
  min?: number;
  step?: number;
  orientation?: "horizontal" | "vertical";
}
export function NumberStepperField({
  label,
  mode,
  step = 1,
  min = 0,
  max,
  orientation = "horizontal",
  ...props
}: Readonly<NumberStepperFieldProps>) {
  const field = useFieldContext<number | undefined>();
  const errors = useStore(field.store, (state) => state.meta.errors);

  const handleDecrement = () => {
    const currentValue = field.state.value ?? 0;
    const newValue = Math.max(currentValue - step, Math.max(min, 0));
    field.handleChange(newValue);
  };

  const handleIncrement = () => {
    const currentValue = field.state.value ?? 0;
    const newValue =
      max !== undefined
        ? Math.min(currentValue + step, max)
        : currentValue + step;
    field.handleChange(newValue);
  };

  return (
    <Field
      // Don't change the class format, if changed to suggested format, it will loss it's priority.
      className="flex-wrap [&>[data-slot=field-label]]:flex-1"
      data-invalid={!isEmpty(errors)}
      orientation={orientation}
    >
      <FieldLabel
        className={cn({ "sr-only": mode === "no-label" })}
        htmlFor={field.name}
      >
        {label}
      </FieldLabel>
      <div className="flex w-45 items-center justify-between overflow-hidden rounded-md shadow">
        <Button
          className="size-11 rounded-none"
          onClick={handleDecrement}
          size="icon"
          type="button"
          variant="ghost"
        >
          <MinusIcon className="size-4" />
        </Button>
        <NumericFormat
          className="border-0 text-center text-lg shadow-none focus-visible:ring-0"
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
        <Button
          className="size-11 rounded-none"
          onClick={handleIncrement}
          size="icon"
          type="button"
          variant="ghost"
        >
          <PlusIcon className="size-4" />
        </Button>
      </div>
      <FieldError className="w-full" errors={errors} />
    </Field>
  );
}
