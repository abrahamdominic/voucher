import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/customer/site-chrome";
import { CheckoutForm } from "@/components/customer/checkout-form";
import { createPublicClient } from "@/lib/supabase/public";
import { formatData, formatDuration, formatNaira } from "@/lib/format";

export const metadata: Metadata = {
  title: "Confirm & pay",
  description: "Review your plan and pay securely.",
  robots: { index: false },
};

async function getPlan(planId: string) {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data } = await supabase.from("plans").select("*").eq("id", planId).maybeSingle();
  return data;
}

export default async function CheckoutPage({ searchParams }: PageProps<"/connect/checkout">) {
  const params = await searchParams;
  const planParam = typeof params.plan === "string" ? params.plan : "";

  const plan = await getPlan(planParam);

  // Unknown or missing plan, or inactive plan → 404 (never trust the client).
  if (!plan || !plan.is_active) notFound();

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
          <ol className="mb-8 flex items-center gap-2 text-xs text-muted-foreground" aria-label="Progress">
            <li>
              <Link href="/connect/plans" className="hover:text-primary">1. Choose plan</Link>
            </li>
            <li aria-hidden>→</li>
            <li aria-current="step" className="font-medium text-primary">2. Confirm &amp; pay</li>
            <li aria-hidden>→</li>
            <li>3. Get voucher</li>
          </ol>

          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Confirm &amp; pay</h1>

          {/* Order summary */}
          <section aria-labelledby="summary-heading" className="mt-6 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <h2 id="summary-heading" className="text-sm font-medium text-muted-foreground">Order summary</h2>
            <div className="mt-4 flex items-baseline justify-between gap-4">
              <p className="text-lg font-semibold">{plan.name}</p>
              <p className="text-lg font-semibold">{formatNaira(plan.price_kobo)}</p>
            </div>
            <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
              <SummaryRow label="Duration" value={formatDuration(plan.duration_hours)} />
              <SummaryRow label="Data allowance" value={formatData(plan.data_allowance_mb)} />
              {plan.speed_mbps && <SummaryRow label="Speed" value={plan.speed_mbps} />}
              <SummaryRow
                label="Devices"
                value={plan.device_limit === 1 ? "1 device" : `${plan.device_limit} devices`}
              />
            </dl>
            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
              <span className="font-medium">Total</span>
              <span className="text-xl font-semibold">{formatNaira(plan.price_kobo)}</span>
            </div>
          </section>

          <CheckoutForm planId={plan.id} />

          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden />
            Payments are processed securely. We never store your card details.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt>{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
