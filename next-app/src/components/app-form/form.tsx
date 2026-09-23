"use client";
import { createFormHook } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AsyncComboboxField } from "./async-combobox-field";
import { AsyncMultiComboboxField } from "./async-multi-combobox-field";
import { AutocompleteField } from "./autocomplete-field";
import { CheckboxField } from "./checkbox-field";
import { CheckboxGroupField } from "./checkbox-group-field";
import { ComboboxField } from "./combobox-field";
import { CreatableSelectField } from "./creatable-select-field";
import { DateField } from "./date-field";
import { DatePickerField } from "./date-picker-field";
import { DateRangePickerField } from "./date-range-picker-field";
import { FileUploader } from "./file-uploader-field";
import { fieldContext, formContext, useFormContext } from "./form-context";
import { MultiSelectField } from "./multi-select-field";
import { NumberField } from "./number-field";
import { NumberStepperField } from "./number-stepper-field";
import { PasswordField } from "./password-field";
import { PatternField } from "./pattern-field";
import { PhoneNumberField } from "./phone-number-field";
import { RadioGroupField } from "./radio-group-field";
import { SelectField } from "./select-field";
import { SwitchField } from "./switch-field";
import { TextField } from "./text-field";
import { TextareaField } from "./textarea-field";

// const TextField = lazy(() => import('../components/text-fields.tsx'))
// import { lazy } from 'react'

// function SubscribeButton({ label }: { label: string }) {
//   const form = useFormContext()
//   return (
//     <form.Subscribe selector={(state) => state.isSubmitting}>
//       {(isSubmitting) => <button disabled={isSubmitting}>{label}</button>}
//     </form.Subscribe>
//   )
// }
function Submit({
  label,
  isPending,
  ...props
}: Readonly<
  React.ComponentProps<typeof Button> & {
    label: string;
    isPending?: boolean;
  }
>) {
  const form = useFormContext();
  return (
    <form.Subscribe
      selector={(formState) => [formState.canSubmit, formState.isSubmitting]}
    >
      {([canSubmit, isSubmitting]) => {
        // console.log("canSubmit:", canSubmit);
        const pending = isPending || isSubmitting;
        return (
          <Button disabled={!canSubmit || pending} type="submit" {...props}>
            {pending && <Spinner />}
            {label}
          </Button>
        );
      }}
    </form.Subscribe>
  );
}

export const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldComponents: {
    TextareaField,
    TextField,
    NumberField,
    DateField,
    DatePickerField,
    DateRangePickerField,
    PasswordField,
    CheckboxField,
    CheckboxGroupField,
    RadioGroupField,
    SelectField,
    MultiSelectField,
    SwitchField,
    NumberStepperField,
    ComboboxField,
    PatternField,
    AsyncMultiComboboxField,
    AsyncComboboxField,
    PhoneNumberField,
    AutocompleteField,
    CreatableSelectField,
    FileUploader,
  },
  formComponents: {
    // SubscribeButton,
    Submit,
  },
  fieldContext,
  formContext,
});

export function handleFormSubmit(onSubmit: () => Promise<void>) {
  return (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSubmit();
  };
}
