import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import type { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { Flag } from "lucide-react";
import { useFieldContext } from "./form-context";

interface PhoneNumberFieldProps extends React.ComponentProps<typeof Input> {
  placeholder?: string;
  mode?: "no-label" | "label";
  label: string;
  className?: string;
  description?: string;
}
export function PhoneNumberField({
  label,
  className,
  mode,
  description,
  ...props
}: Readonly<PhoneNumberFieldProps>) {
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
      <div className="grow space-y-3">
        <InputGroup className="overflow-hidden bg-transparent shadow-none">
          <InputGroupInput
            aria-invalid={isInvalid}
            id={field.name}
            name={field.name}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            type="tel"
            value={field.state.value}
          />
          <InputGroupAddon className="h-full border-input border-r px-4">
            <Flag /> +1
          </InputGroupAddon>
        </InputGroup>
        {description && <FieldDescription>{description}</FieldDescription>}
        {isInvalid && <FieldError errors={field.state.meta.errors} />}
      </div>
    </Field>
  );
}
