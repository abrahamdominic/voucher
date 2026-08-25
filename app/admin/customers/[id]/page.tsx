import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ReceiptText, Ticket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { formatDate, formatNaira } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Customer details" };

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  pending: "secondary",
  failed: "destructive",
  cancelled: "outline",
  refunded: "outline",
};

export default async function AdminCustomerDetailPage({ params }: PageProps<"/admin/customers/[id]">) {
  await requireRole("admin");
  const { id } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const admin = createAdminClient();
  const { data: customer } = await admin.from("customers").select("*").eq("id", id).maybeSingle();
  if (!customer) notFound();

  const { data: orders } = await admin
    .from("orders")
    .select("*")
    .eq("phone", customer.phone)
    .order("created_at", { ascending: false })
    .limit(25);

  const [{ data: vouchers }, { data: payments }] = await Promise.all([
    admin
      .from("vouchers")
      .select("code, status, activated_at, expires_at")
      .eq("customer_phone", customer.phone)
      .order("created_at", { ascending: false })
      .limit(15),
    admin
      .from("payments")
      .select("transaction_ref, provider_reference, amount_kobo, method, channel, status, created_at")
      .in("order_id", (orders ?? []).map((o) => o.id))
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/admin/customers">
          <ArrowLeft data-icon="inline-start" /> Customers
        </Link>
      </Button>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">{customer.name ?? customer.phone}</h1>
        <p className="text-sm text-muted-foreground">
          {[customer.email, customer.phone].filter(Boolean).join(" · ")} · first seen{" "}
          {formatDate(customer.first_seen_at)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="py-4"><CardContent className="px-4">
          <p className="text-xs text-muted-foreground">Orders</p>
          <p className="mt-1 text-xl font-semibold">{customer.total_orders}</p>
        </CardContent></Card>
        <Card className="py-4"><CardContent className="px-4">
          <p className="text-xs text-muted-foreground">Total spent</p>
          <p className="mt-1 text-xl font-semibold">{formatNaira(Number(customer.total_spent_kobo))}</p>
        </CardContent></Card>
        <Card className="py-4"><CardContent className="px-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="mt-1 text-xl font-semibold capitalize">{customer.status}</p>
        </CardContent></Card>
      </div>

      {/* Orders */}
      <Card className="py-0">
        <CardHeader className="border-b border-border/60 py-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <ReceiptText className="size-4 text-muted-foreground" aria-hidden /> Orders & payments
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(orders ?? []).map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <Link href={`/admin/orders/${o.reference}`} className="font-mono text-[13px] underline-offset-4 hover:underline">
                    {o.reference}
                  </Link>
                </TableCell>
                <TableCell>{o.plan_name}</TableCell>
                <TableCell>{formatNaira(Number(o.amount_kobo))}</TableCell>
                <TableCell><Badge variant={statusVariant[o.status] ?? "secondary"}>{o.status}</Badge></TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(o.created_at)}</TableCell>
              </TableRow>
            ))}
            {!orders?.length && (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No orders.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Vouchers */}
      <Card className="py-0">
        <CardHeader className="border-b border-border/60 py-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Ticket className="size-4 text-muted-foreground" aria-hidden /> Vouchers & usage history
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Activated</TableHead>
              <TableHead>Expires</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(vouchers ?? []).map((v) => (
              <TableRow key={v.code}>
                <TableCell className="font-mono text-[13px]">{v.code}</TableCell>
                <TableCell className="capitalize">{v.status}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{v.activated_at ? formatDate(v.activated_at) : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{v.expires_at ? formatDate(v.expires_at) : "—"}</TableCell>
              </TableRow>
            ))}
            {!vouchers?.length && (
              <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No vouchers.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {(payments ?? []).length > 0 && (
        <p className="text-xs text-muted-foreground">
          Latest transaction: {(payments ?? [])[0]?.provider_reference ?? (payments ?? [])[0]?.transaction_ref}
        </p>
      )}
    </div>
  );
}
