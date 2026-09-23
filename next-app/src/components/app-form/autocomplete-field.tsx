import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { Empty } from "@/components/ui/empty";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { isEmpty, isPlainObject } from "lodash";
import { CheckIcon, ChevronDownIcon, Loader } from "lucide-react";
import { useState } from "react";
import { useFieldContext } from "./form-context";

type Option = { value: string; label: string; id: number };
interface AutocompleteFieldProps<T extends Option>
  extends React.ComponentProps<"input"> {
  displayValue?: (selectedOption: T, options: T[]) => string;
  getValue?: (option: T) => T | string | number;
  getOptionDisplayValue?: (option: T) => string;
  queryOptions: (queryString: string) => UseQueryOptions<T[]>;
  label: string;
  mode?: "label" | "no-label";
  onChangeCallback?: (selectedOption: T) => void;
  emptyComponent?: () => React.ReactNode;
}

export function AutocompleteField<T extends Option>({
  displayValue,
  getValue = (option) => option,
  getOptionDisplayValue = (option) => option.label,
  queryOptions,
  className,
  mode,
  label,
  onChangeCallback,
  emptyComponent,
  ...props
}: AutocompleteFieldProps<T>) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const [query, setQuery] = useState("");
  const { data: options, isFetching } = useQuery(queryOptions(query));
  return (
    <Field className={cn("w-full", className)} data-invalid={isInvalid}>
      <FieldLabel
        className={cn({ "sr-only": mode === "no-label" })}
        htmlFor={field.name}
      >
        {label} {props.required && <span className="text-red-500">*</span>}
      </FieldLabel>
      <Combobox
        onChange={(value) => {
          field.handleChange(value ?? "");
          if (isPlainObject(value)) {
            onChangeCallback?.(value as unknown as T);
          }
          onChangeCallback?.(
            options?.find(
              (option) => getValue(option) === value
            ) as unknown as T
          );
        }}
        onClose={() => setQuery("")}
        value={field.state.value}
      >
        <div className="relative h-full">
          <ComboboxInput
            {...props}
            aria-invalid={isInvalid}
            className="flex h-full w-full min-w-0 rounded-md border border-input bg-transparent px-4 py-1 text-base outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[size=default]:h-11 data-[size=lg]:h-12 data-[size=sm]:h-9 data-[size=xs]:h-8 data-[variant=flat]:h-auto data-[variant=flat]:min-h-10 data-[variant=flat]:rounded-none data-[variant=flat]:border-0 data-[variant=flat]:focus-visible:ring-0 md:text-sm"
            displayValue={(option) => {
              if (isPlainObject(option)) {
                return (
                  displayValue?.(
                    option as unknown as T,
                    options as T[]
                  ) ?? ""
                );
              }
              return option == null ? "" : String(option);
            }}
            onChange={(event) => setQuery(event.target.value)}
          />
          <ComboboxButton className="group absolute inset-y-0 right-0 px-2.5">
            <ChevronDownIcon className="size-5 shrink-0 text-muted-foreground opacity-80" />
          </ComboboxButton>
        </div>

        <ComboboxOptions
          anchor={{
            to: "bottom",
            gap: 4,
          }}
          className="z-50 min-w-(--input-width) rounded-sm border bg-popover p-1 text-popover-foreground shadow-md"
          transition
        >
          {isFetching && (
            <Empty>
              <Loader className="animate-spin" />
            </Empty>
          )}
          {isEmpty(options) && !isFetching
            ? (emptyComponent?.() ?? (
                <Empty className="text-sm">No options available</Empty>
              ))
            : options?.map((option) => (
                <ComboboxOption
                  className="flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-sm outline-hidden first:rounded-t-sm last:rounded-b-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                  key={option.id}
                  value={getValue(option)}
                >
                  <CheckIcon className="invisible size-4 fill-white group-data-selected:visible" />
                  {getOptionDisplayValue(option)}
                </ComboboxOption>
              ))}
        </ComboboxOptions>
      </Combobox>
      {/*{description && <FieldDescription>{description}</FieldDescription>}*/}
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
