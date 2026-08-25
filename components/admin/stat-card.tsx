import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <Card className={cn("py-4", className)}>
      <CardContent className="px-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight" title={value}>
          {value}
        </p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
