import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { RefundDialog, RetryAllocationButton } from "@/components/admin/order-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { hasRole, requireRole } from "@/lib/auth/session";
import { formatDate, formatNaira } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Order details" };

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  pending: "secondary",
  failed: "destructive",
  cancelled: "outline",
  refunded: "outline",
};

export default async function AdminOrderDetailPage({ params }: PageProps<"/admin/orders/[reference]">) {
  const profile = await requireRole("staff");
  const { reference } = await params;

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("*, vouchers(code, status, activated_at, expires_at), plans(name)")
    .eq("reference", reference.toUpperCase())
    .maybeSingle();

  if (!order) notFound();

  const { data: payments } = await admin
    .from("payments")
    .select("*")
    .eq("order_id", order.id)
    .order("created_at");

  const voucher = order.vouchers;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1 text-muted-foreground">
            <Link href="/admin/orders">
              <ArrowLeft data-icon="inline-start" /> Orders
            </Link>
          </Button>
          <h1 className="flex flex-wrap items-center gap-3 font-mono text-xl font-semibold tracking-tight">
            {order.reference}
            <Badge variant={statusVariant[order.status] ?? "secondary"}>{order.status}</Badge>
          </h1>
        </div>

        <div className="flex gap-2">
          {hasRole(profile, "admin") && order.status === "paid" && (
            <RefundDialog reference={order.reference} amount={formatNaira(Number(order.amount_kobo))} />
          )}
          {hasRole(profile, "admin") && order.status === "paid" && !voucher && (
            <RetryAllocationButton reference={order.reference} />
          )}
        </div>
      </div>

      {/* Paid but no voucher → visible ops issue banner */}
      {order.status === "paid" && !voucher && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Payment confirmed but no voucher allocated yet — fulfillment failed. Use “Retry allocation” above.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <Row label="Plan" value={order.plans?.name ?? order.plan_name} />
            <Row label="Duration" value={`${order.plan_duration_hours}h`} />
            <Row label="Amount" value={formatNaira(Number(order.amount_kobo))} strong />
            <Row label="Created" value={formatDate(order.created_at)} />
            {order.paid_at && <Row label="Paid at" value={formatDate(order.paid_at)} />}
            {order.refunded_at && <Row label="Refunded at" value={formatDate(order.refunded_at)} />}
            <Row label="Provider" value={order.payment_provider} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <Row label="Phone" value={order.phone} mono />
            <Row label="Email" value={order.email} />
            <Row label="Customer ID (agg.)" value={order.customer_id ? `${order.customer_id.slice(0, 8)}…` : "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Voucher</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            {voucher ? (
              <>
                <Row label="Code" value={voucher.code} mono strong />
                <Row label="Status" value={voucher.status} />
                <Row label="Activated" value={voucher.activated_at ? formatDate(voucher.activated_at) : "Not yet"} />
                <Row label="Expires" value={voucher.expires_at ? formatDate(voucher.expires_at) : `${order.plan_duration_hours}h after activation`} />
                <Button variant="ghost" size="sm" asChild className="-ml-2 mt-1 text-primary">
                  <Link href={`/admin/vouchers?q=${encodeURIComponent(voucher.code)}`}>Manage voucher</Link>
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">No voucher allocated yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {(payments ?? []).map((payment, i) => (
              <div key={payment.id}>
                {i > 0 && <Separator className="my-3" />}
                <div className="space-y-2.5 text-sm">
                  <Row label="Reference" value={payment.transaction_ref} mono />
                  <Row label="Status" value={payment.status} />
                  <Row label="Amount" value={formatNaira(Number(payment.amount_kobo))} />
                  <Row label="Method" value={[payment.method, payment.channel].filter(Boolean).join(" · ") || "—"} />
                  <Row label="Verified" value={payment.verified_at ? formatDate(payment.verified_at) : "Pending"} />
                  {payment.failure_reason && <Row label="Failure" value={payment.failure_reason} />}
                </div>
              </div>
            ))}
            {!payments?.length && <p className="text-sm text-muted-foreground">No payment records.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, mono, strong }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={`break-all text-right ${mono ? "font-mono text-[13px]" : ""} ${strong ? "font-semibold" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}
