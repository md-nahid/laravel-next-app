"use client"

import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import * as React from "react"
import type { DateRange } from "react-day-picker"
import { buttonVariants } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type DateRangePickerProps = {
  id?: string
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  onOpenChange?: (open: boolean) => void
  placeholder?: string
  disabled?: boolean
  className?: string
} & Omit<
  React.ComponentProps<typeof Calendar>,
  "mode" | "selected" | "onSelect" | "className"
>

function rangeLabel(range: DateRange | undefined): string | null {
  if (!range?.from) return null
  if (!range.to) return format(range.from, "LLL dd, y")
  return `${format(range.from, "LLL dd, y")} – ${format(range.to, "LLL dd, y")}`
}

export function DateRangePicker({
  id,
  value,
  onChange,
  onOpenChange,
  placeholder = "Pick a date range",
  disabled,
  className,
  ...calendarProps
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  const labelText = rangeLabel(value)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        onOpenChange?.(next)
      }}
    >
      <PopoverTrigger
        type="button"
        disabled={disabled}
        id={id}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-8 min-h-8 w-full justify-start px-3 font-normal",
          className,
        )}
      >
        <CalendarIcon className="mr-2 size-4 shrink-0 opacity-60" />
        {labelText ? (
          labelText
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
          defaultMonth={value?.from}
          {...calendarProps}
        />
      </PopoverContent>
    </Popover>
  )
}
