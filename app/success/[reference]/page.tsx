import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Wifi } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/customer/site-chrome";
import { StatusPoller } from "@/components/customer/status-poller";
import { VoucherCodeDisplay } from "@/components/customer/voucher-code-display";
import { Button } from "@/components/ui/button";
import { formatDuration, formatNaira } from "@/lib/format";
import { getPaymentProvider } from "@/lib/payments";
import { fulfillSuccessfulPayment } from "@/lib/payments/fulfillment";
import { getPublicOrder } from "@/lib/orders/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchPendingNotifications } from "@/lib/notifications";

export const metadata: Metadata = {
  title: "Your voucher",
  robots: { index: false },
};

export default async function SuccessPage({ params }: PageProps<"/success/[reference]">) {
  const { reference } = await params;

  let { order, voucherCode } = await getPublicOrder(reference);

  if (!order) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-4">
          <StateCard
            icon={<AlertCircle className="size-8 text-destructive" aria-hidden />}
            title="Order not found"
            body="We couldn't find this order. Please double-check your reference."
          />
        </main>
        <SiteFooter />
      </div>
    );
  }

  // Belt-and-braces: if the webhook has not landed yet, verify directly with
  // the payment gateway (server-to-server). This is a legitimate source of
  // truth — unlike trusting a frontend callback.
  if (order.status === "pending") {
    const provider = getPaymentProvider();
    if (provider.name !== "mock") {
      const admin = createAdminClient();
      const { data: pendingPayment } = await admin
        .from("payments")
        .select("*")
        .eq("order_id", order.id)
        .eq("status", "pending")
        .maybeSingle();

      if (pendingPayment) {
        const verification = await provider.verifyPayment(
          pendingPayment.provider_reference ?? pendingPayment.transaction_ref
        );
        if (verification.status === "successful") {
          await fulfillSuccessfulPayment(pendingPayment.id, {
            method: verification.method,
            channel: verification.channel,
            providerReference: verification.providerReference,
            raw: verification.raw,
          });
          void dispatchPendingNotifications().catch(() => {});
          const refreshed = await getPublicOrder(reference);
          order = refreshed.order;
          voucherCode = refreshed.voucherCode;
        } else if (verification.status === "failed") {
          order = { ...order, status: "failed" };
        }
      }
    }
  }

  // Paid but no voucher yet → allocation still in progress.
  if (order && order.status === "paid" && !voucherCode) {
    return (
      <PendingAllocation reference={reference} />
    );
  }

  // Payment failed or cancelled.
  if (order && (order.status === "failed" || order.status === "cancelled")) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <StateCard
            icon={<AlertCircle className="size-8 text-destructive" aria-hidden />}
            title="Payment could not be completed"
            body="Please try again. If you were charged but see this message, contact support with your reference."
            actions={
              <>
                <Button asChild className="rounded-xl">
                  <Link href="/connect/plans">Try again</Link>
                </Button>
                <Button variant="outline" asChild className="rounded-xl">
                  <Link href="/voucher">Check my voucher</Link>
                </Button>
              </>
            }
            footer={`Reference: ${order.reference}`}
          />
        </main>
        <SiteFooter />
      </div>
    );
  }

  // Still pending after verification attempt → show confirming state with polling.
  if (order && order.status === "pending") {
    return (
      <ConfirmingPayment
        reference={reference}
        amount={formatNaira(order.amount_kobo)}
      />
    );
  }

  if (!order || !voucherCode) {
    return null;
  }

  const expiryDate =
    order.paid_at != null
      ? new Date(new Date(order.paid_at).getTime() + order.plan_duration_hours * 3600_000)
      : null;

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
          <section aria-labelledby="success-heading" className="rounded-3xl border border-border/70 bg-card p-6 text-center shadow-lg shadow-black/5 sm:p-10">
            <span className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="size-9 text-emerald-500" aria-hidden />
            </span>
            <h1 id="success-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
              You&apos;re connected!
            </h1>
            <p className="mt-2 text-muted-foreground">
              Your access voucher has been issued successfully.
            </p>

            <VoucherCodeDisplay code={voucherCode} />

            <dl className="mt-6 space-y-2.5 rounded-2xl bg-muted/50 p-4 text-left text-sm sm:p-5">
              <Row label="Plan" value={order.plan_name} />
              <Row label="Duration" value={`${formatDuration(order.plan_duration_hours)} of access`} />
              <Row label="Amount paid" value={formatNaira(order.amount_kobo)} />
              <Row label="Expiry" value={expiryDate ? expiryDate.toLocaleString("en-NG") : "Starts on activation"} />
              <Row label="Order ref" value={order.reference} mono />
            </dl>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button size="lg" asChild className="h-12 rounded-2xl text-base">
                <Link href={`/receipt/${order.reference}`}>
                  View receipt <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 rounded-2xl text-base">
                <a href="https://www.google.com" target="_blank" rel="noreferrer noopener">
                  <Wifi data-icon="inline-start" /> Start browsing
                </a>
              </Button>
            </div>
          </section>

          {/* Activation instructions */}
          <section aria-labelledby="instructions-heading" className="mt-6 rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
            <h2 id="instructions-heading" className="text-sm font-semibold">How to activate</h2>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground marker:font-medium marker:text-foreground">
              <li>Connect to the Wi-Fi network.</li>
              <li>Open the Wi-Fi login page.</li>
              <li>Enter your voucher code.</li>
              <li>Start browsing.</li>
            </ol>
            <p className="mt-4 rounded-xl bg-primary/10 px-4 py-3 text-xs font-medium text-primary">
              Keep this voucher code for your records — you&apos;ll need it every time you connect.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-[13px]" : "font-medium text-foreground"}>{value}</dd>
    </div>
  );
}

function StateCard({
  icon,
  title,
  body,
  actions,
  footer,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  actions?: React.ReactNode;
  footer?: string;
}) {
  return (
    <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card p-8 text-center shadow-sm">
      <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted">{icon}</span>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      {actions && <div className="mt-6 flex flex-col gap-2.5">{actions}</div>}
      {footer && <p className="mt-6 font-mono text-xs text-muted-foreground">{footer}</p>}
    </div>
  );
}

async function ConfirmingPayment({ reference, amount }: { reference: string; amount: string }) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card p-8 text-center shadow-sm">
          <Loader2 className="mx-auto size-10 animate-spin text-primary" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Verifying your payment…</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We&apos;re waiting for the payment provider to confirm your payment of {amount}.
          </p>
          <StatusPoller reference={reference} />
          <p className="mt-6 font-mono text-xs text-muted-foreground">Reference: {reference}</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function PendingAllocation({ reference }: { reference: string }) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card p-8 text-center shadow-sm">
          <Loader2 className="mx-auto size-10 animate-spin text-primary" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Payment received</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your payment was successful, but we&apos;re still preparing your Wi-Fi voucher. Please
            wait while we finish setting up your access.
          </p>
          <StatusPoller reference={reference} />
          <p className="mt-6 font-mono text-xs text-muted-foreground">Reference: {reference}</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
