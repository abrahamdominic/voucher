import Link from "next/link";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CustomerSearch({ initialQuery }: { initialQuery: string }) {
  return (
    <form action="/admin/customers" method="get" role="search" className="flex gap-2">
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          name="q"
          defaultValue={initialQuery}
          placeholder="Search name, phone or email…"
          aria-label="Search customers"
          className="h-9 w-full rounded-lg border border-input bg-input/30 pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <Button type="submit" variant="secondary" size="sm" className="rounded-lg">
        Search
      </Button>
      {initialQuery && (
        <Button type="button" variant="ghost" size="sm" asChild className="rounded-lg">
          <Link href="/admin/customers">Clear</Link>
        </Button>
      )}
    </form>
  );
}
