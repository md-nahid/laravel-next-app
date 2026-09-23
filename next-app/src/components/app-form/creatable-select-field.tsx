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

type CreatableSelectFieldProps = {
  placeholder?: string
  mode?: "no-label" | "label"
  label: string
  options: { value: string; label: string }[] | undefined
}

export function CreatableSelectField(props: CreatableSelectFieldProps) {
  const field = useFieldContext<string>()
  const isInvalid =
    field.state.meta.isTouched && field.state.meta.errors.length > 0
  const {
    label,
    options,
    mode = "label",
    placeholder = "Select or create an option",
  } = props
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const selectedLabel =
    options?.find((o) => o.value === field.state.value)?.label ??
    (field.state.value ? field.state.value : null)

  const lower = search.toLowerCase()
  const filtered =
    options?.filter(
      (o) =>
        o.label.toLowerCase().includes(lower) ||
        o.value.toLowerCase().includes(lower),
    ) ?? []

  const trimmed = search.trim()
  const canCreate =
    Boolean(trimmed) &&
    !options?.some(
      (o) =>
        o.value === trimmed ||
        o.label.toLowerCase() === trimmed.toLowerCase(),
    )

  return (
    <Field data-invalid={isInvalid}>
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
              className="w-full justify-between font-normal shadow-none"
              id={field.name}
              onBlur={field.handleBlur}
              role="combobox"
              variant="outline"
            />
          }
        >
          <span
            className={cn(
              "flex-1 truncate text-left text-sm",
              !selectedLabel && "text-muted-foreground",
            )}
          >
            {selectedLabel ?? placeholder}
          </span>
          <ChevronDownIcon className="size-5 shrink-0 opacity-80" />
        </PopoverTrigger>
        <PopoverContent className="min-w-(--anchor-width) p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={placeholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {canCreate
                  ? `Press an item below to create "${trimmed}".`
                  : "No matches."}
              </CommandEmpty>
              <CommandGroup heading="Options">
                {canCreate ? (
                  <CommandItem
                    value={`__create__${trimmed}`}
                    onSelect={() => {
                      field.handleChange(trimmed)
                      setSearch("")
                      setOpen(false)
                    }}
                  >
                    Create &quot;{trimmed}&quot;
                  </CommandItem>
                ) : null}
                {filtered.map((option) => {
                  const isSelected = field.state.value === option.value
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => {
                        field.handleChange(option.value)
                        setSearch("")
                        setOpen(false)
                      }}
                    >
                      <span className="flex-1">{option.label}</span>
                      <CheckIcon
                        className={cn(
                          "ml-2 size-4",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
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
