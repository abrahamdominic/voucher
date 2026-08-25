import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/customer/site-chrome";
import { PlanPicker } from "@/components/customer/plan-picker";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "Choose your plan",
  description: "Select a Wi-Fi access plan that suits you.",
  robots: { index: false },
};

async function getActivePlans() {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  return data ?? [];
}

export default async function PlansPage() {
  const plans = await getActivePlans();

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <ol className="mb-8 flex items-center gap-2 text-xs text-muted-foreground" aria-label="Progress">
            <li aria-current="step" className="font-medium text-primary">1. Choose plan</li>
            <li aria-hidden>→</li>
            <li>2. Confirm &amp; pay</li>
            <li aria-hidden>→</li>
            <li>3. Get voucher</li>
          </ol>

          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Choose your plan</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Pick the access plan that works for you. Your voucher is issued instantly after payment.
          </p>

          <div className="mt-8">
            {plans === null ? (
              <div className="rounded-2xl border border-dashed p-8 text-center" role="status">
                <AlertCircle className="mx-auto size-6 text-muted-foreground" aria-hidden />
                <p className="mt-3 text-sm text-muted-foreground">
                  Plans are unavailable right now. Please check back shortly.
                </p>
              </div>
            ) : plans.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center" role="status">
                <p className="text-sm text-muted-foreground">No plans are available at the moment.</p>
              </div>
            ) : (
              <PlanPicker plans={plans} />
            )}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Changed your mind?{" "}
            <Link href="/" className="underline-offset-4 hover:underline">
              Back to home
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
