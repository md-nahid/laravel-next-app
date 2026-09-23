"use client";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import type { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { EyeIcon, EyeOff } from "lucide-react";
import { useState } from "react";
import { useFieldContext } from "./form-context";

interface PasswordFieldProps extends React.ComponentProps<typeof Input> {
  mode?: "no-label" | "label";
  label: React.ReactNode;
}

export function PasswordField({ label, mode, ...props }: PasswordFieldProps) {
  const field = useFieldContext<string>();
  // const errors = useStore(field.store, (state) => state.meta.errors);
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel
        className={cn({ "sr-only": mode === "no-label" })}
        htmlFor={field.name}
      >
        {label}
      </FieldLabel>
      <InputGroup className="bg-transparent shadow-none">
        <InputGroupInput
          autoComplete="password"
          className="peer h-10.5! rounded-r-none"
          id={field.name}
          onChange={(e) => field.handleChange(e.target.value)}
          type={showPassword ? "text" : "password"}
          value={field.state.value}
          {...props}
        />
        <InputGroupAddon align="inline-end" className="m-0! p-0">
          <InputGroupButton
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="h-11 w-10 justify-center"
            onClick={() => setShowPassword((prev) => !prev)}
            size="icon-xs"
            title={showPassword ? "Hide password" : "Show password"}
            variant="ghost"
          >
            {showPassword ? (
              <EyeOff className="size-5" strokeWidth={2.2} />
            ) : (
              <EyeIcon className="size-5" strokeWidth={2.2} />
            )}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}

// <div className="space-y-2">
//               <Label htmlFor="password">Password</Label>
//               <div className="relative">
//                 <Input
//                   id="password"
//                   type={showPassword ? "text" : "password"}
//                   placeholder="Enter your password"
//                   value={formData.password}
//                   onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
//                   required
//                 />
//                 <Button
//                   type="button"
//                   variant="ghost"
//                   size="sm"
//                   className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
//                   onClick={() => setShowPassword(!showPassword)}
//                 >
//                   {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//                 </Button>
//               </div>
//             </div>
