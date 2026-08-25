"use client";

import { Check, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatData, formatDuration, formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { Plan } from "@/types/database";

interface PlanCardProps {
  plan: Plan;
  selected: boolean;
  /** When null the card renders a link instead of acting as a selectable tile. */
  onSelect: (() => void) | null;
}

export function PlanCard({ plan, selected, onSelect }: PlanCardProps) {
  const Wrapper = onSelect ? "button" : "div";

  return (
    <Wrapper
      {...(onSelect
        ? {
            type: "button" as const,
            onClick: onSelect,
            "aria-pressed": selected,
            className: cn(
              "group relative flex h-full w-full flex-col rounded-2xl border-2 bg-card text-left shadow-sm outline-none transition-all",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              selected
                ? "border-primary ring-2 ring-primary/20 shadow-md"
                : "border-border/70 hover:border-primary/40 hover:shadow-md"
            ),
          }
        : {
            className:
              "relative flex h-full w-full flex-col rounded-2xl border border-border/70 bg-card text-left shadow-sm transition-shadow hover:shadow-md",
          })}
    >
      {plan.is_popular && (
        <Badge className="absolute -top-2.5 left-4 gap-1 bg-primary text-primary-foreground">
          <Star className="size-3 fill-current" aria-hidden /> Popular
        </Badge>
      )}
      {selected && (
        <span className="absolute -top-2.5 right-4 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
          <Check className="size-3" aria-hidden />
          <span className="sr-only">Selected</span>
        </span>
      )}

      <CardHeader className="pb-0">
        <CardTitleRow name={plan.name} duration={plan.duration_hours} />
        <p className="mt-3 text-3xl font-semibold tracking-tight">{formatNaira(plan.price_kobo)}</p>
      </CardHeader>

      <CardContent className="flex-1 space-y-1.5 pt-3 text-sm text-muted-foreground">
        {plan.description && <p className="leading-relaxed">{plan.description}</p>}
        <ul className="space-y-1.5 pt-1">
          <PlanFeature>{formatDuration(plan.duration_hours)} access</PlanFeature>
          {plan.data_allowance_mb != null && <PlanFeature>{formatData(plan.data_allowance_mb)}</PlanFeature>}
          {plan.speed_mbps && <PlanFeature>{plan.speed_mbps}</PlanFeature>}
          <PlanFeature>
            {plan.device_limit === 1 ? "1 device" : `${plan.device_limit} devices`}
          </PlanFeature>
        </ul>
      </CardContent>

      {!onSelect && (
        <CardFooter className="pt-2">
          <Button asChild className="w-full rounded-xl">
            <a href={`/connect/checkout?plan=${plan.id}`}>Choose plan</a>
          </Button>
        </CardFooter>
      )}
    </Wrapper>
  );
}

function CardTitleRow({ name, duration }: { name: string; duration: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h3 className="text-base font-semibold">{name}</h3>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {formatDuration(duration)}
      </span>
    </div>
  );
}

function PlanFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
      <span>{children}</span>
    </li>
  );
}
