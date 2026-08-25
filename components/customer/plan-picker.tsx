"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { PlanCard } from "@/components/customer/plan-card";
import { Button } from "@/components/ui/button";

import type { Plan } from "@/types/database";

export function PlanPicker({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const popular = useMemo(() => plans.find((p) => p.is_popular), [plans]);
  const [selectedId, setSelectedId] = useState<string | null>(popular?.id ?? plans[0]?.id ?? null);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={selectedId === plan.id}
            onSelect={() => setSelectedId(plan.id)}
          />
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          size="lg"
          disabled={!selectedId}
          onClick={() => router.push(`/connect/checkout?plan=${selectedId}`)}
          className="h-12 min-w-48 rounded-2xl text-base"
        >
          Continue <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}
