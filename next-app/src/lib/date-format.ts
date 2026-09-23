import { format } from "date-fns"

/** Format a date for form storage / display, or `undefined` when missing. */
export function dateString(
  date: Date | undefined,
  dateFormat: string,
): string | undefined {
  if (!date) return undefined
  return format(date, dateFormat)
}
