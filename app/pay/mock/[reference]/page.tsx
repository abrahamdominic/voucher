import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock, ShieldCheck } from "lucide-react";

import { MockGatewayClient } from "@/components/customer/mock-gateway";
import { config } from "@/lib/config";
import { formatNaira } from "@/lib/format";
import { findPaymentByTransactionRef } from "@/lib/payments/fulfillment";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Secure checkout",
  robots: { index: false },
};

export default async function MockGatewayPage({ params }: PageProps<"/pay/mock/[reference]">) {
  const { reference } = await params;

  // This simulation only exists while the mock payment provider is active.
  if (config.paymentProvider !== "mock") notFound();

  const admin = createAdminClient();
  const payment = await findPaymentByTransactionRef(reference);
  if (!payment || payment.status !== "pending") notFound();

  const { data: order } = await admin.from("orders").select("*").eq("id", payment.order_id).single();
  if (!order || order.status !== "pending") notFound();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-6 shadow-lg sm:p-8">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <p className="text-sm font-semibold">Demo Checkout</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <Lock className="size-3" aria-hidden /> Secure
          </span>
        </div>

        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Merchant</dt>
            <dd className="font-medium">{process.env.NEXT_PUBLIC_MERCHANT_NAME ?? "NK Swift DATA"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="font-medium">{order.plan_name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Customer</dt>
            <dd className="font-medium">{order.phone}</dd>
          </div>
          <div className="flex justify-between border-t border-border/60 pt-3 text-base">
            <dt className="font-medium">Amount due</dt>
            <dd className="font-bold">{formatNaira(payment.amount_kobo)}</dd>
          </div>
        </dl>

        <MockGatewayClient reference={payment.transaction_ref} />

        <p className="mt-5 flex items-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
          This is the built-in demo gateway. Configure Paystack for live payments.
        </p>
      </div>
    </div>
  );
}
