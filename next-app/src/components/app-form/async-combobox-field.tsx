"use client";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { isEmpty } from "lodash";
import { Check, ChevronDownIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { useFieldContext } from "./form-context";

type Option<T = Record<string, unknown>> = {
  label: string;
  value: string;
} & T;

type PropTypes<T = Record<string, unknown>> = {
  mode?: "no-label" | "label";
  label: string;
  required?: boolean;
  queryOptions: (
    searchQuery: string
  ) => UseQueryOptions<Option<T>[], Error, Option<T>[]>;
  onChange?: (option: Option<T>) => void;
};

export function AsyncComboboxField<T = Record<string, unknown>>(
  props: PropTypes<T>
) {
  const { label, mode = "label", queryOptions, onChange } = props;

  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data = [], isFetching } = useQuery(queryOptions(query));

  // Find the selected option from the data
  const selectedOption = data.find(
    (option) => option.value === field.state.value
  );

  return (
    <Field className="w-full" data-invalid={isInvalid}>
      <FieldLabel
        className={cn({ "sr-only": mode === "no-label" })}
        htmlFor={field.name}
      >
        {label} {props.required && <span className="text-red-500">*</span>}
      </FieldLabel>
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger
          render={
            <Button
              aria-expanded={open}
              className="h-11 justify-between"
              role="combobox"
              variant="outline"
            />
          }
        >
          <span
            className={cn(
              "line-clamp-1 block text-ellipsis",
              !selectedOption && "text-muted-foreground",
            )}
          >
            {selectedOption ? selectedOption.label : "Select option..."}
          </span>
          <ChevronDownIcon className="size-5 shrink-0 opacity-80" />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="min-w-(--anchor-width) p-0"
        >
          <Command>
            <div className="flex items-center gap-0 border-b px-2">
              <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
              <Input
                className="h-9! rounded-b-none border-0 shadow-none focus-visible:border-border focus-visible:ring-0"
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search options..."
                value={query}
              />
            </div>
            <CommandList>
              {!isFetching && <CommandEmpty>No result found</CommandEmpty>}
              {isFetching && (
                <CommandEmpty className="flex items-center justify-center gap-4 py-6 text-sm">
                  <Spinner className="size-5" /> Searching...
                </CommandEmpty>
              )}
              <CommandGroup>
                {!(isFetching || isEmpty(data)) &&
                  data.map((option) => {
                    const isSelected =
                      field.state.value && field.state.value === option.value;
                    return (
                      <CommandItem
                        key={option.value}
                        onSelect={() => {
                          field.handleChange(option.value);
                          onChange?.(option);
                          setOpen(false);
                        }}
                        value={option.value}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {option.label}
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
