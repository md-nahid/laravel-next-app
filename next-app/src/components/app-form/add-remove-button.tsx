import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Trash } from "lucide-react";

type AddRemoveButtonProps = {
  onAdd: () => void;
  onRemove: () => void;
  enableRemove: boolean;
  enableAdd: boolean;
  disabled?: boolean;
  className?: string;
  variant?: "ghost" | "outline" | "default" | "destructive";
};

export function AddRemoveButton({
  onAdd,
  onRemove,
  disabled,
  enableAdd,
  enableRemove,
  className,
  variant = "ghost",
}: Readonly<AddRemoveButtonProps>) {
  return (
    <div className={cn("flex items-start gap-0", className)}>
      {enableAdd && (
        <Button
          className="text-success hover:border-success"
          disabled={disabled}
          onClick={onAdd}
          type="button"
          variant={variant}
        >
          <Plus />
        </Button>
      )}
      {enableRemove && (
        <Button
          className="text-destructive hover:border-destructive"
          disabled={disabled}
          onClick={onRemove}
          type="button"
          variant={variant}
        >
          <Trash />
        </Button>
      )}
    </div>
  );
}
