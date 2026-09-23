"use client"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { useState } from "react"
import { useFieldContext } from "./form-context"

export interface ComboboxFieldProps
  extends React.ComponentProps<typeof Command> {
  placeholder?: string
  mode?: "no-label" | "label"
  label: string
  options: { value: string | number; label: string }[] | undefined
  /** Passed through to the trigger `Button`; outline is the default look. */
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
  isMulti?: boolean
}
export function ComboboxField(props: Readonly<ComboboxFieldProps>) {
  const field = useFieldContext<string>()
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
  const {
    label,
    options,
    mode = "label",
    isMulti = false,
    variant = "outline",
    size = "default",
    className,
    ...rest
  } = props

  const [open, setOpen] = useState(false)
  const value = field.state.value
  const onChange = field.handleChange

  const selectedValues = (() => {
    if (isMulti) {
      return value ? value.split(",").filter(Boolean) : []
    }
    return value ? [value] : []
  })()

  const handleSelect = (optionValue: string) => {
    if (isMulti) {
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter((v) => v !== optionValue)
        : [...selectedValues, optionValue]
      onChange(newValues.join(","))
    } else {
      onChange(optionValue === value ? "" : optionValue)
      setOpen(false)
    }
  }

  const getDisplayText = () => {
    if (!value) {
      return props.placeholder
    }

    if (isMulti) {
      const selectedOptions =
        options?.filter((opt) =>
          selectedValues.includes(opt.value.toString()),
        ) || []

      if (selectedOptions.length === 0) {
        return props.placeholder
      }
      if (selectedOptions.length === 1) {
        return selectedOptions[0]?.label || props.placeholder
      }
      return `${selectedOptions.length} selected`
    }

    return (
      options?.find((opt) => opt.value.toString() === value)?.label ||
      props.placeholder
    )
  }

  return (
    <Field className={cn("w-full", className)} data-invalid={isInvalid}>
      <FieldLabel
        className={cn({ "sr-only": mode === "no-label" })}
        htmlFor={field.name}
      >
        {label}
      </FieldLabel>
      <Popover modal={false} onOpenChange={setOpen} open={open}>
        <PopoverTrigger
          render={
            <Button
              aria-expanded={open}
              aria-haspopup="listbox"
              className="w-full justify-between font-normal shadow-none"
              data-slot="combobox-filter-trigger"
              id={field.name}
              onBlur={field.handleBlur}
              role="combobox"
              size={size}
              variant={variant}
            />
          }
        >
          <span
            className={cn(
              "flex-1 truncate text-left text-sm",
              !value && "text-muted-foreground",
            )}
          >
            {getDisplayText()}
          </span>
          <ChevronDownIcon className="size-5 shrink-0 opacity-80" />
        </PopoverTrigger>
        <PopoverContent className="min-w-(--anchor-width) p-0" align="start">
          <Command {...rest}>
            <CommandInput
              className="h-9"
              placeholder={props.placeholder}
            />
            <CommandList>
              <CommandEmpty>No results found</CommandEmpty>
              <CommandGroup>
                {options?.map((option) => {
                  const isSelected = selectedValues.includes(
                    option.value.toString(),
                  )
                  return (
                    <CommandItem
                      className="cursor-pointer"
                      key={option.value}
                      onSelect={() => handleSelect(option.value.toString())}
                      value={option.label}
                    >
                      <span className="flex-1">{option.label}</span>
                      <CheckIcon
                        className={cn(
                          "ml-2 size-4 text-primary",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                        strokeWidth={2.4}
                      />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
