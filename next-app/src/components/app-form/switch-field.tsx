import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useFieldContext } from "./form-context";

interface SwitchFieldProps extends React.ComponentProps<typeof Switch> {
  mode?: "no-label" | "label";
  description?: string;
  label: string;
}
// className="flex items-center gap-3"

export function SwitchField(props: SwitchFieldProps) {
  const field = useFieldContext<boolean>();
  // const errors = useStore(field.store, (state) => state.meta.errors);
  const { label, mode = "label", description, ...rest } = props;
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  return (
    <Field
      // className="flex flex-row items-center justify-between"
      data-invalid={isInvalid}
      orientation="horizontal"
    >
      <FieldContent>
        <FieldLabel
          className={cn({ "sr-only": mode === "no-label" })}
          htmlFor={field.name}
        >
          {label}
        </FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
        {isInvalid && <FieldError errors={field.state.meta.errors} />}
      </FieldContent>
      <Switch
        aria-invalid={isInvalid}
        checked={field.state.value}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onCheckedChange={field.handleChange}
        {...rest}
      />
    </Field>
  );
}
