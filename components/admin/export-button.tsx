"use client";

import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

/** Triggers a CSV export download preserving current query-string filters. */
export function ExportButton({ type, label }: { type: string; label: string }) {
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const href = `/api/admin/export?type=${type}${qs ? `&${qs}` : ""}`;

  return (
    <Button variant="outline" size="sm" asChild className="rounded-lg">
      <a href={href} download>
        <Download data-icon="inline-start" aria-hidden /> {label}
      </a>
    </Button>
  );
}
