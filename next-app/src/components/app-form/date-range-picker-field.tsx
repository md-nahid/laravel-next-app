"use client";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { format, isValid, parse } from "date-fns";
import { isEmpty } from "lodash";
import { useEffect, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useFieldContext } from "./form-context";

const RANGE_SEPARATOR = ";";
const STORAGE_DATE_FORMAT = "yyyy-MM-dd";

function parseRangeValue(value: string | undefined): DateRange | undefined {
  if (!value || isEmpty(value)) {
    return;
  }
  const parts = value.split(RANGE_SEPARATOR).map((s) => s.trim());
  if (parts.length !== 2) {
    return;
  }
  const fromStr = parts[0];
  const toStr = parts[1];
  if (!(fromStr && toStr)) {
    return;
  }
  const from = parse(fromStr, STORAGE_DATE_FORMAT, new Date());
  const to = parse(toStr, STORAGE_DATE_FORMAT, new Date());
  if (!(isValid(from) && isValid(to))) {
    return;
  }
  return { from, to };
}

function serializeRange(range: DateRange | undefined): string | undefined {
  if (!(range?.from && range?.to)) {
    return;
  }
  return `${format(range.from, STORAGE_DATE_FORMAT)}${RANGE_SEPARATOR}${format(
    range.to,
    STORAGE_DATE_FORMAT
  )}`;
}

type DateRangePickerFieldProps = {
  label: string;
  className?: string;
  mode?: "no-label" | "label";
} & Omit<
  React.ComponentProps<typeof DateRangePicker>,
  "id" | "value" | "onChange" | "mode"
>;

export function DateRangePickerField({
  label,
  className,
  mode,
  ...props
}: Readonly<DateRangePickerFieldProps>) {
  const field = useFieldContext<string | undefined>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const [range, setRange] = useState<DateRange | undefined>(() =>
    parseRangeValue(field.state.value)
  );
  const rangeRef = useRef<DateRange | undefined>(range);
  rangeRef.current = range;

  useEffect(() => {
    const parsed = parseRangeValue(field.state.value);
    rangeRef.current = parsed;
    setRange(parsed);
  }, [field.state.value]);

  const handleRangeChange = (next: DateRange | undefined) => {
    rangeRef.current = next;
    setRange(next);
    if (next?.from && next?.to) {
      field.handleChange(serializeRange(next));
    } else if (!next) {
      field.handleChange(undefined);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      const latest = rangeRef.current;
      if (latest?.from && latest?.to) {
        const serialized = serializeRange(latest);
        if (serialized !== undefined) {
          field.handleChange(serialized);
        }
      } else if (latest && !(latest.from && latest.to)) {
        const reverted = parseRangeValue(field.state.value);
        rangeRef.current = reverted;
        setRange(reverted);
      }
    }
  };

  return (
    <Field className={className} data-invalid={isInvalid}>
      <FieldLabel
        className={cn({ "sr-only": mode === "no-label" })}
        htmlFor={field.name}
      >
        {label}
      </FieldLabel>
      <DateRangePicker
        {...props}
        id={field.name}
        onChange={handleRangeChange}
        onOpenChange={handleOpenChange}
        value={range}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
