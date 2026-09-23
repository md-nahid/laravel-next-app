"use client";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
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
import { unionBy } from "lodash";
import { Check, ChevronDownIcon, SearchIcon, X } from "lucide-react";
import { useRef, useState } from "react";
import { useFieldContext } from "./form-context";

type Option = {
  label: string;
  value: string;
};

type PropTypes = {
  mode?: "no-label" | "label";
  label: string;
  required?: boolean;
  preSelectedOptions?: Option[];
  queryOptions: (
    searchQuery: string
  ) => UseQueryOptions<Option[], Error, Option[]>;
};

export function AsyncMultiComboboxField(props: PropTypes) {
  const { label, mode = "label", queryOptions } = props;

  const field = useFieldContext<string[]>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data = [], isFetching } = useQuery(queryOptions(query));
  // Cache all selected options to display them even when not in current search results
  const selectedOptionsMapRef = useRef<Map<string, Option>>(new Map());

  // Ensure field value is always an array
  const fieldValue = Array.isArray(field.state.value) ? field.state.value : [];

  // Update the cache when data changes - store options as they come in
  const mergedOptions = unionBy(props.preSelectedOptions, data, "value");
  for (const option of mergedOptions) {
    if (fieldValue.includes(option.value)) {
      selectedOptionsMapRef.current.set(option.value, option);
    }
  }

  // Get selected options from cache
  const selectedOptions = fieldValue
    .map((value) => selectedOptionsMapRef.current.get(value))
    .filter((option): option is Option => option !== undefined);

  const handleRemove = (valueToRemove: string) => {
    const newValues = fieldValue.filter((v) => v !== valueToRemove);
    field.handleChange(newValues);
    // Also remove from cache
    selectedOptionsMapRef.current.delete(valueToRemove);
  };

  return (
    <Field className={cn("w-full")} data-invalid={isInvalid}>
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
              className="flex h-auto min-h-11 w-full flex-wrap justify-between gap-1 text-ellipsis"
              role="combobox"
              variant="outline"
            />
          }
        >
          <div className="flex flex-1 flex-wrap items-center gap-1">
            {selectedOptions.length > 0 ? (
              selectedOptions.map((option) => (
                <Badge
                  className="gap-1"
                  key={option.value}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(option.value)
                  }}
                  variant="secondary"
                >
                  <span className="max-w-[200px] truncate">
                    {option.label}
                  </span>
                  <span className="ml-1 rounded-full hover:bg-muted-foreground/20">
                    <X className="size-3" />
                  </span>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">Select options...</span>
            )}
          </div>
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
                {mergedOptions?.map((option) => {
                  const isSelected = fieldValue.includes(option.value);
                  return (
                    <CommandItem
                      className={isSelected ? "hidden" : ""}
                      key={option.value}
                      onSelect={() => {
                        const newValues = isSelected
                          ? fieldValue.filter((v) => v !== option.value)
                          : [...fieldValue, option.value];
                        field.handleChange(newValues);
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
