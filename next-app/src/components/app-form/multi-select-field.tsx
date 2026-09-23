import type { ComboboxFieldProps } from "./combobox-field"
import { ComboboxField } from "./combobox-field"

export type MultiSelectFieldProps = Omit<ComboboxFieldProps, "isMulti">

export function MultiSelectField(props: MultiSelectFieldProps) {
  return <ComboboxField {...props} isMulti />
}
