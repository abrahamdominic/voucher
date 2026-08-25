import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteFooter, SiteHeader } from "@/components/customer/site-chrome";
import { ReceiptActions } from "@/components/customer/receipt-actions";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNaira } from "@/lib/format";
import { getPublicOrder } from "@/lib/orders/service";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "Receipt",
  robots: { index: false },
};

const paymentBadge: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  pending: "secondary",
  failed: "destructive",
  refunded: "outline",
};

export default async function ReceiptPage({ params }: PageProps<"/receipt/[reference]">) {
  const { reference } = await params;
  const { order, voucherCode } = await getPublicOrder(reference);
  if (!order) notFound();

  const supabase = createPublicClient();
  const { data: businessSettings } = supabase
    ? await supabase.from("settings").select("value").eq("key", "business").maybeSingle()
    : { data: null };
  const business = (businessSettings?.value ?? {}) as {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };

  const expiry = order.paid_at
    ? new Date(new Date(order.paid_at).getTime() + order.plan_duration_hours * 3600_000)
    : null;

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6 sm:py-14">
          <article
            id="receipt"
            aria-label={`Receipt for order ${order.reference}`}
            className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:p-8"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-5">
              <div>
                <p className="text-lg font-semibold tracking-tight">{business.name ?? "NK Swift DATA"}</p>
                {(business.phone || business.email) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[business.phone, business.email].filter(Boolean).join(" · ")}
                  </p>
                )}
                {business.address && <p className="text-xs text-muted-foreground">{business.address}</p>}
              </div>
              <Badge variant={paymentBadge[order.status] ?? "secondary"} className="capitalize">
                {order.status === "paid" ? "Payment successful" : order.status}
              </Badge>
            </div>

            {/* Details */}
            <dl className="mt-5 space-y-3 text-sm">
              <Row label="Order number" value={order.reference} mono />
              <Row label="Date" value={formatDate(order.created_at)} />
              <Row label="Customer phone" value={order.phone} />
              <Row label="Customer email" value={order.email} />
              <Row label="Plan" value={order.plan_name} />
              <Row
                label="Amount paid"
                value={`${formatNaira(order.amount_kobo)}${order.status === "paid" ? " (paid)" : ""}`}
              />
              <Row label="Voucher" value={voucherCode ?? "Pending allocation"} mono />
              <Row
                label="Expiry"
                value={
                  voucherCode && expiry
                    ? `${formatDate(expiry)} (${order.plan_duration_hours}h after activation)`
                    : "Starts on activation"
                }
              />
            </dl>

            <p className="mt-6 border-t border-border/60 pt-4 text-xs text-muted-foreground">
              Thank you for your purchase. Keep your voucher code safe — it is required to connect to
              the Wi-Fi network.
            </p>
          </article>

          <ReceiptActions
            reference={order.reference}
            customerEmail={order.email}
            receipt={{
              businessName: business.name ?? "NK Swift DATA",
              reference: order.reference,
              plan: order.plan_name,
              amount: formatNaira(order.amount_kobo),
              status: order.status,
              voucherCode: voucherCode ?? "—",
              date: formatDate(order.created_at),
              expiry:
                voucherCode && expiry
                  ? formatDate(expiry)
                  : "Starts on activation",
            }}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={`break-all text-right font-medium ${mono ? "font-mono text-[13px]" : ""}`}>{value}</dd>
    </div>
  );
}
