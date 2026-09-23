import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string
  description: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
      <div className="flex flex-col items-start gap-4 py-4 md:col-span-2">
        <h4 className="font-medium text-base capitalize">{title}</h4>
        <div className="text-muted-foreground text-sm">{description}</div>
      </div>
      <Card className="md:col-span-3">
        <CardContent className={cn("flex flex-col gap-4", className)}>
          {children}
        </CardContent>
      </Card>
    </div>
  )
}
