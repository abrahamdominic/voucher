import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatNaira } from "@/lib/format";

import type { Order } from "@/types/database";

type OrderRow = Order & { voucher_code: string | null; plan_display_name: string | null };

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  pending: "secondary",
  failed: "destructive",
  cancelled: "outline",
  refunded: "outline",
};

export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        No orders match these filters.
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border/70 bg-card md:block">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-medium">Order ID</th>
              <th scope="col" className="px-4 py-3 font-medium">Customer</th>
              <th scope="col" className="px-4 py-3 font-medium">Plan</th>
              <th scope="col" className="px-4 py-3 font-medium">Amount</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Voucher</th>
              <th scope="col" className="px-4 py-3 font-medium">Created</th>
              <th scope="col" className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.reference}`} className="font-mono text-[13px] font-medium underline-offset-4 hover:underline">
                    {o.reference}
                  </Link>
                </td>
                <td className="max-w-44 truncate px-4 py-3">
                  {o.phone}
                  <span className="block truncate text-xs text-muted-foreground">{o.email}</span>
                </td>
                <td className="px-4 py-3">{o.plan_display_name ?? o.plan_name}</td>
                <td className="whitespace-nowrap px-4 py-3 font-medium">{formatNaira(Number(o.amount_kobo))}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[o.status] ?? "secondary"}>{o.status}</Badge>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{o.voucher_code ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDate(o.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/admin/orders/${o.reference}`}>View</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {orders.map((o) => (
          <li key={o.id} className="rounded-xl border border-border/70 bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <Link href={`/admin/orders/${o.reference}`} className="font-mono text-[13px] font-medium underline-offset-4 hover:underline">
                {o.reference}
              </Link>
              <Badge variant={statusVariant[o.status] ?? "secondary"}>{o.status}</Badge>
            </div>
            <dl className="mt-2.5 space-y-1 text-sm text-muted-foreground">
              <div className="flex justify-between gap-4"><dt>Plan</dt><dd className="text-right font-medium text-foreground">{o.plan_display_name ?? o.plan_name}</dd></div>
              <div className="flex justify-between gap-4"><dt>Customer</dt><dd className="text-right">{o.phone}</dd></div>
              <div className="flex justify-between gap-4"><dt>Amount</dt><dd className="font-medium text-foreground">{formatNaira(Number(o.amount_kobo))}</dd></div>
              <div className="flex justify-between gap-4"><dt>Voucher</dt><dd className="font-mono text-xs">{o.voucher_code ?? "—"}</dd></div>
              <div className="flex justify-between gap-4"><dt>Created</dt><dd>{formatDate(o.created_at)}</dd></div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

export function Pagination({
  page,
  totalPages,
  prevHref,
  nextHref,
}: {
  page: number;
  totalPages: number;
  prevHref: string;
  nextHref: string;
}) {
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-3">
      <Button variant="outline" size="sm" asChild={page > 1} disabled={page <= 1} className="rounded-lg">
        {page > 1 ? <Link href={prevHref}>Previous</Link> : <span>Previous</span>}
      </Button>
      <span className="text-xs text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button variant="outline" size="sm" asChild={page < totalPages} disabled={page >= totalPages} className="rounded-lg">
        {page < totalPages ? <Link href={nextHref}>Next</Link> : <span>Next</span>}
      </Button>
    </nav>
  );
}
