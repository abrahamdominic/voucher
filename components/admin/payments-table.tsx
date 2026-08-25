"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatNaira } from "@/lib/format";

export interface PaymentRow {
  id: string;
  transaction_ref: string;
  provider_reference: string | null;
  order_reference: string;
  customer_phone: string;
  amount_kobo: number;
  provider: string;
  method: string | null;
  status: string;
  verified_at: string | null;
  created_at: string;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  successful: "default",
  pending: "secondary",
  failed: "destructive",
  refunded: "outline",
};

export function PaymentsTable({
  payments,
  currentStatus,
}: {
  payments: PaymentRow[];
  currentStatus: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setStatus(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set("status", value);
    else params.delete("status");
    router.push(`/admin/payments?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <form action="/admin/payments" method="get" role="search" className="relative w-full sm:max-w-sm">
          {currentStatus && <input type="hidden" name="status" value={currentStatus} />}
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="q" placeholder="Search transaction or order ref…" className="pl-8" />
        </form>
        <Select defaultValue={currentStatus || "all"} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Status filter">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["pending", "successful", "failed", "refunded"].map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop */}
      <div className="hidden overflow-x-auto rounded-xl border border-border/70 bg-card md:block">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-medium">Transaction ID</th>
              <th scope="col" className="px-4 py-3 font-medium">Order</th>
              <th scope="col" className="px-4 py-3 font-medium">Customer</th>
              <th scope="col" className="px-4 py-3 font-medium">Amount</th>
              <th scope="col" className="px-4 py-3 font-medium">Provider / method</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Verified</th>
              <th scope="col" className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                <td className="max-w-40 truncate px-4 py-3 font-mono text-[13px]" title={p.provider_reference ?? p.transaction_ref}>
                  {p.provider_reference ?? p.transaction_ref}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${p.order_reference}`} className="font-mono text-[13px] underline-offset-4 hover:underline">
                    {p.order_reference}
                  </Link>
                </td>
                <td className="px-4 py-3">{p.customer_phone}</td>
                <td className="whitespace-nowrap px-4 py-3 font-medium">{formatNaira(p.amount_kobo)}</td>
                <td className="px-4 py-3 capitalize">{p.provider}{p.method ? ` · ${p.method}` : ""}</td>
                <td className="px-4 py-3"><Badge variant={statusVariant[p.status] ?? "secondary"}>{p.status}</Badge></td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                  {p.verified_at ? formatDate(p.verified_at) : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDate(p.created_at)}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">No payments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {payments.map((p) => (
          <li key={p.id} className="rounded-xl border border-border/70 bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-mono text-xs font-medium">{p.provider_reference ?? p.transaction_ref}</span>
              <Badge variant={statusVariant[p.status] ?? "secondary"}>{p.status}</Badge>
            </div>
            <dl className="mt-2 space-y-1 text-sm text-muted-foreground">
              <div className="flex justify-between gap-4"><dt>Order</dt><dd className="font-mono text-xs">{p.order_reference}</dd></div>
              <div className="flex justify-between gap-4"><dt>Customer</dt><dd>{p.customer_phone}</dd></div>
              <div className="flex justify-between gap-4"><dt>Amount</dt><dd className="font-medium text-foreground">{formatNaira(p.amount_kobo)}</dd></div>
              <div className="flex justify-between gap-4"><dt>Method</dt><dd className="capitalize">{[p.provider, p.method].filter(Boolean).join(" · ")}</dd></div>
              <div className="flex justify-between gap-4"><dt>Date</dt><dd>{formatDate(p.created_at)}</dd></div>
            </dl>
          </li>
        ))}
        {payments.length === 0 && (
          <li className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No payments found.</li>
        )}
      </ul>

      <p className="text-xs text-muted-foreground">
        Payments are verified server-side via webhook signature and gateway verification — statuses here reflect the
        source of truth.
      </p>
    </div>
  );
}
