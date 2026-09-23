import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useFieldContext } from "./form-context";

// import { ErrorMessage } from './error-message'
interface RadioGroupFieldProps extends React.ComponentProps<typeof RadioGroup> {
  label: string;
  mode?: "no-label" | "label";
  options: { value: string; label: string; description?: string }[];
}

export function RadioGroupField(props: RadioGroupFieldProps) {
  const field = useFieldContext<string>();
  // const errors = useStore(field.store, (state) => state.meta.errors);
  const { label, options, mode = "label", className, ...rest } = props;
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  return (
    <FieldSet>
      <FieldLabel
        className={cn({
          "sr-only": mode === "no-label",
        })}
      >
        {label}
      </FieldLabel>
      <RadioGroup
        className={cn("flex-wrap gap-x-8", className)}
        defaultValue={field.state.value}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onValueChange={field.handleChange}
        {...rest}
      >
        {options.map((option) => (
          <Field
            className="w-auto"
            data-invalid={isInvalid}
            key={option.value}
            orientation="horizontal"
          >
            <RadioGroupItem
              aria-invalid={isInvalid}
              id={option.value}
              value={option.value}
            />
            <FieldLabel htmlFor={option.value}>
              <FieldTitle>{option.label}</FieldTitle>
              {option.description && (
                <FieldDescription className="w-full">
                  {option.description}
                </FieldDescription>
              )}
            </FieldLabel>
          </Field>
        ))}
      </RadioGroup>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </FieldSet>
  );
}
