import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { isEmpty } from "lodash";
import { useFieldContext } from "./form-context";

interface SelectFieldProps extends React.ComponentProps<typeof Select> {
  placeholder?: string;
  mode?: "no-label" | "label";
  label: string;
  options: { value: string; label: string }[] | undefined;
  isLoading?: boolean;
}

export function SelectField(props: Readonly<SelectFieldProps>) {
  const field = useFieldContext<string>();
  // const errors = useStore(field.store, (state) => state.meta.errors);
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const {
    label,
    options,
    mode = "label",
    placeholder = "Select an option",
    isLoading = false,
    ...rest
  } = props;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel
        className={cn({ "sr-only": mode === "no-label" })}
        htmlFor={field.name}
      >
        {label}
      </FieldLabel>
      <Select
        onValueChange={(value) =>
          field.handleChange(value as string)
        }
        value={field.state.value}
        {...rest}
      >
        <SelectTrigger
          aria-invalid={isInvalid}
          className="w-full"
          id={field.name}
          onBlur={field.handleBlur}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Spinner className="size-4" />{" "}
              <span className="text-muted-foreground text-sm">Loading...</span>
            </div>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {isEmpty(options) ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No options available
            </div>
          ) : null}
          {options?.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
