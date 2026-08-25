"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrderFiltersFormProps {
  basePath: string;
  filters: {
    q?: string;
    status?: string;
    planId?: string;
    from?: string;
    to?: string;
    page: number;
  };
  plans: { id: string; name: string }[];
}

export function OrderFiltersForm({ basePath, filters, plans }: OrderFiltersFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <form
      action={basePath}
      method="get"
      className="grid gap-2.5 rounded-xl border border-border/70 bg-card p-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto]"
      role="search"
      aria-label="Filter orders"
    >
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Search ref, phone, email…"
          className="pl-8"
          aria-label="Search orders"
        />
      </div>

      <Select name="status" defaultValue={filters.status ?? "all"} onValueChange={(v) => updateParam("status", v === "all" ? "" : v)}>
        <SelectTrigger className="w-full lg:w-36" aria-label="Status filter">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {["pending", "paid", "failed", "cancelled", "refunded"].map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select name="plan" defaultValue={filters.planId ?? "all"} onValueChange={(v) => updateParam("plan", v === "all" ? "" : v)}>
        <SelectTrigger className="w-full lg:w-40" aria-label="Plan filter">
          <SelectValue placeholder="All plans" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All plans</SelectItem>
          {plans.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <input
        type="date"
        name="from"
        defaultValue={filters.from ?? ""}
        aria-label="From date"
        className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30"
      />
      <div className="flex gap-2">
        <input
          type="date"
          name="to"
          defaultValue={filters.to ?? ""}
          aria-label="To date"
          className="h-9 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30"
        />
        <Button type="submit" variant="secondary" className="rounded-lg">
          Filter
        </Button>
      </div>
    </form>
  );
}
