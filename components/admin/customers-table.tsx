import Link from "next/link";
import { Badge } from "@/components/ui/badge";

import { formatDate, formatNaira } from "@/lib/format";

export interface CustomerRow {
  id: string;
  phone: string;
  email: string | null;
  name: string | null;
  status: string;
  total_orders: number;
  total_spent_kobo: number;
  last_order_at: string | null;
  first_seen_at: string;
  activeVoucherCode: string | null;
}

export function CustomersTable({ customers }: { customers: CustomerRow[] }) {
  if (customers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        No customers found.
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border/70 bg-card md:block">
        <table className="w-full min-w-[780px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-medium">Customer</th>
              <th scope="col" className="px-4 py-3 font-medium">Phone</th>
              <th scope="col" className="px-4 py-3 font-medium">Orders</th>
              <th scope="col" className="px-4 py-3 font-medium">Total spent</th>
              <th scope="col" className="px-4 py-3 font-medium">Last purchase</th>
              <th scope="col" className="px-4 py-3 font-medium">Active voucher</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/admin/customers/${c.id}`} className="font-medium underline-offset-4 hover:underline">
                    {c.name ?? "—"}
                  </Link>
                  <span className="block truncate text-xs text-muted-foreground">{c.email ?? ""}</span>
                </td>
                <td className="px-4 py-3">{c.phone}</td>
                <td className="px-4 py-3">{c.total_orders}</td>
                <td className="whitespace-nowrap px-4 py-3 font-medium">{formatNaira(c.total_spent_kobo)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                  {c.last_order_at ? formatDate(c.last_order_at) : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{c.activeVoucherCode ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={c.status === "active" ? "default" : "destructive"}>{c.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {customers.map((c) => (
          <li key={c.id} className="rounded-xl border border-border/70 bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/admin/customers/${c.id}`} className="font-medium underline-offset-4 hover:underline">
                {c.name ?? c.phone}
              </Link>
              <Badge variant={c.status === "active" ? "default" : "destructive"}>{c.status}</Badge>
            </div>
            <dl className="mt-2.5 space-y-1 text-sm text-muted-foreground">
              <div className="flex justify-between gap-4"><dt>Phone</dt><dd>{c.phone}</dd></div>
              <div className="flex justify-between gap-4"><dt>Orders</dt><dd>{c.total_orders} · {formatNaira(c.total_spent_kobo)}</dd></div>
              <div className="flex justify-between gap-4"><dt>Last purchase</dt><dd>{c.last_order_at ? formatDate(c.last_order_at) : "—"}</dd></div>
              {c.activeVoucherCode && (
                <div className="flex justify-between gap-4"><dt>Voucher</dt><dd className="font-mono text-xs text-primary">{c.activeVoucherCode}</dd></div>
              )}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
